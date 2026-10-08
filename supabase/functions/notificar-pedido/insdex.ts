// Avisa o cliente por push (Expo) quando o status do pedido muda.
// Chamada por um Database Webhook em public.pedidos (evento UPDATE), com o header
// x-webhook-secret = secret NOTIFICAR_WEBHOOK_SECRET. Deploy:
//   npx supabase functions deploy notificar-pedido --no-verify-jwt
//
// Tokens vêm de public.push_tokens (preenchida pelo app via registrar_push_token()).
import { createClient } from "npm:@supabase/supabase-js@2";

const SECRET = Deno.env.get("NOTIFICAR_WEBHOOK_SECRET") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function tokenIgual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const MENSAGENS: Record<string, string> = {
  pendente: "Pagamento confirmado! Aguardando o restaurante aceitar.",
  aceito: "O restaurante aceitou seu pedido.",
  preparando: "Seu pedido está sendo preparado.",
  pronto: "Seu pedido está pronto!",
  saiu_para_entrega: "Seu pedido saiu para entrega.",
  entregue: "Pedido concluído. Bom apetite!",
  cancelado: "Seu pedido foi cancelado.",
};

Deno.serve(async (req) => {
  if (!tokenIgual(req.headers.get("x-webhook-secret") ?? "", SECRET)) {
    return new Response("não autorizado", { status: 401 });
  }

  try {
    const corpo = await req.json().catch(() => null);
    const novo = corpo?.record;
    const antigo = corpo?.old_record;

    if (corpo?.type !== "UPDATE" || !novo?.cliente_id) return new Response("ignorado");
    if (antigo?.status === novo.status) return new Response("status igual");

    const texto = MENSAGENS[novo.status];
    if (!texto) return new Response("sem mensagem");

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token")
      .eq("user_id", novo.cliente_id);

    const destinos = (tokens ?? [])
      .map((t) => t.token)
      .filter((t) => /^(Exponent|Expo)PushToken\[.+\]$/.test(t));
    if (!destinos.length) return new Response("sem tokens");

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        destinos.map((to) => ({
          to,
          title: "FoodConnect",
          body: texto,
          sound: "default",
          data: { pedido_id: novo.id, status: novo.status },
        })),
      ),
    });
    const resultado = await res.json().catch(() => ({}));

    // Remove aparelhos que desinstalaram o app
    const mortos: string[] = [];
    (resultado?.data ?? []).forEach((r: any, i: number) => {
      if (r?.status === "error" && r?.details?.error === "DeviceNotRegistered") mortos.push(destinos[i]);
    });
    if (mortos.length) await admin.from("push_tokens").delete().in("token", mortos);

    return new Response("ok");
  } catch (e) {
    console.error("notificar-pedido:", e);
    return new Response("erro interno", { status: 500 });
  }
});