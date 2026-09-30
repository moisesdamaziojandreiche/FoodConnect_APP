import { createClient } from "npm:@supabase/supabase-js@2";

// O Mercado Pago chama esta função quando um pagamento muda de estado.
// Deploy SEM verificação de JWT (o MP não envia token do Supabase):
//   npx supabase functions deploy mp-webhook --no-verify-jwt
//
// Segurança: NÃO confiamos no corpo da notificação. Usamos só o id do
// pagamento e consultamos a API do Mercado Pago com o nosso token; quem
// decide o status do pedido é a resposta oficial, nunca o request.

const ok = (texto = "ok") => new Response(texto, { status: 200 });

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    let tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");
    let pagamentoId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

    if (request.method === "POST") {
      const corpo = await request.json().catch(() => null);
      tipo = corpo?.type ?? tipo;
      pagamentoId = corpo?.data?.id ?? pagamentoId;
    }

    if (tipo !== "payment" || !pagamentoId || !/^\d+$/.test(String(pagamentoId))) {
      return ok("ignorado");
    }

    const consulta = await fetch(`https://api.mercadopago.com/v1/payments/${pagamentoId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
    });
    // Status != 2xx faz o Mercado Pago tentar de novo mais tarde
    if (!consulta.ok) return new Response("falha ao consultar pagamento", { status: 502 });

    const pagamento = await consulta.json();
    const pedidoId = pagamento.external_reference;
    if (!pedidoId) return ok("sem referência");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pedido } = await admin
      .from("pedidos")
      .select("id, status, valor_total")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedido) return ok("pedido não encontrado");

    // Pagamento recusado NÃO cancela o pedido: o cliente pode tentar outro
    // cartão no mesmo checkout. Só a aprovação libera o pedido.
    if (pagamento.status === "approved") {
      const pago = Math.round(Number(pagamento.transaction_amount) * 100);
      const esperado = Math.round(Number(pedido.valor_total) * 100);
      if (pago !== esperado) {
        console.error(`Valor divergente no pedido ${pedido.id}: pago=${pago} esperado=${esperado}`);
        return ok("valor divergente");
      }

      // `.eq("status", "aguardando_pagamento")` torna a operação idempotente:
      // notificações repetidas não reabrem um pedido que o restaurante já moveu.
      const { error } = await admin
        .from("pedidos")
        .update({
          status: "pendente",
          pagamento_id: String(pagamentoId),
          forma_pagamento: `Mercado Pago (${pagamento.payment_type_id ?? "online"})`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pedido.id)
        .eq("status", "aguardando_pagamento");
      if (error) throw error;
    }

    return ok();
  } catch (error) {
    console.error("mp-webhook:", error);
    return new Response("erro interno", { status: 500 });
  }
});