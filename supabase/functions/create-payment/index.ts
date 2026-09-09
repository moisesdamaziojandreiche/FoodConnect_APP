import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: request.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error("Carrinho vazio");

    const total = items.reduce((sum: number, item: { preco: number; quantidade: number }) => sum + item.preco * item.quantidade, 0);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error: orderError } = await admin.from("orders").insert({ user_id: user.id, total, payment_provider: "mercado_pago" }).select().single();
    if (orderError) throw orderError;

    const { error: itemsError } = await admin.from("order_items").insert(items.map((item: { id: number; nome: string; preco: number; quantidade: number; restauranteId?: number }) => ({ order_id: order.id, product_id: item.id, restaurant_id: item.restauranteId, name: item.nome, unit_price: item.preco, quantity: item.quantidade })));
    if (itemsError) throw itemsError;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ external_reference: order.id, items: items.map((item: { nome: string; preco: number; quantidade: number }) => ({ title: item.nome, quantity: item.quantidade, unit_price: item.preco, currency_id: "BRL" })) }),
    });
    const preference = await response.json();
    if (!response.ok) throw new Error(preference.message || "Mercado Pago recusou o checkout");

    await admin.from("orders").update({ payment_id: preference.id }).eq("id", order.id);
    return new Response(JSON.stringify({ initPoint: preference.init_point, orderId: order.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});