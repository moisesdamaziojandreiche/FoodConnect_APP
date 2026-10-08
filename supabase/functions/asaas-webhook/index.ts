// O Asaas chama esta função quando uma cobrança muda de estado.
// Deploy SEM verificação de JWT (o Asaas não envia token do Supabase):
//   npx supabase functions deploy asaas-webhook --no-verify-jwt
//
// Segurança: o Asaas envia o token configurado no webhook no header
// "asaas-access-token"; ele precisa ser igual ao secret ASAAS_WEBHOOK_TOKEN.
//
// Colunas usadas em public.pedidos:
//   status, payment_status, payment_method, asaas_payment_id, paid_at
import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const ok = (texto = "ok") => new Response(texto, { status: 200 });

// Comparação sem vazar o tamanho do acerto por tempo de resposta
function tokenIgual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const EVENTOS_PAGO = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];
const EVENTOS_CANCELADO = ["PAYMENT_OVERDUE", "PAYMENT_DELETED"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método não permitido", { status: 405 });

  if (!tokenIgual(req.headers.get("asaas-access-token") ?? "", WEBHOOK_TOKEN)) {
    return new Response("não autorizado", { status: 401 });
  }

  try {
    const corpo = await req.json().catch(() => null);
    const evento: string = corpo?.event ?? "";
    const pagamento = corpo?.payment;
    if (!pagamento?.id) return ok("ignorado");

    // Acha o pedido pelo id da cobrança; se ainda não foi gravado, pela referência externa.
    let { data: pedido } = await admin
      .from("pedidos")
      .select("id, status, payment_status, valor_total")
      .eq("asaas_payment_id", pagamento.id)
      .maybeSingle();

    if (!pedido && pagamento.externalReference) {
      ({ data: pedido } = await admin
        .from("pedidos")
        .select("id, status, payment_status, valor_total")
        .eq("id", pagamento.externalReference)
        .maybeSingle());
    }
    if (!pedido) return ok("pedido não encontrado");

    // ---- Pagamento confirmado: libera o pedido para o restaurante ----
    if (EVENTOS_PAGO.includes(evento)) {
      const pago = Math.round(Number(pagamento.value) * 100);
      const esperado = Math.round(Number(pedido.valor_total) * 100);
      if (pago !== esperado) {
        console.error(`Valor divergente no pedido ${pedido.id}: pago=${pago} esperado=${esperado}`);
        return ok("valor divergente");
      }

      // Os filtros .eq() tornam a operação idempotente: o Asaas manda
      // CONFIRMED e depois RECEIVED (e pode repetir eventos); só o primeiro vale.
      const { error } = await admin
        .from("pedidos")
        .update({
          status: "pendente",
          payment_status: "aprovado",
          payment_method: pagamento.billingType ?? null,
          asaas_payment_id: pagamento.id,
          paid_at: new Date().toISOString(),
        })
        .eq("id", pedido.id)
        .eq("status", "aguardando_pagamento")
        .eq("payment_status", "pendente");
      if (error) throw error;
      return ok();
    }

    // ---- Cobrança vencida ou apagada: cancela se ainda não foi paga ----
    if (EVENTOS_CANCELADO.includes(evento)) {
      const { error } = await admin
        .from("pedidos")
        .update({ status: "cancelado", payment_status: "cancelado" })
        .eq("id", pedido.id)
        .eq("status", "aguardando_pagamento")
        .eq("payment_status", "pendente");
      if (error) throw error;
      return ok();
    }

    // ---- Reembolso: marca o pagamento e cancela o pedido (se não entregue) ----
    if (evento === "PAYMENT_REFUNDED") {
      const { error } = await admin
        .from("pedidos")
        .update({ payment_status: "reembolsado" })
        .eq("id", pedido.id)
        .eq("payment_status", "aprovado");
      if (error) throw error;

      await admin
        .from("pedidos")
        .update({ status: "cancelado" })
        .eq("id", pedido.id)
        .not("status", "in", "(entregue,cancelado)");
      return ok();
    }

    return ok("evento ignorado");
  } catch (error) {
    // Status != 2xx faz o Asaas tentar de novo mais tarde
    console.error("asaas-webhook:", error);
    return new Response("erro interno", { status: 500 });
  }
});