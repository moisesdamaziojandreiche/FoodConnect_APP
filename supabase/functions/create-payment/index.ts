// Cria o pedido (aguardando pagamento) e a cobrança no Asaas.
// O app envia só IDs e quantidades; preços e total são calculados aqui.
//
// Corpo esperado:
//   { empresa_id, itens: [{ produto_id, quantidade, observacao? }],
//     nome?, cpfCnpj?, endereco_entrega?, observacao? }
// Resposta: { pedido_id, valor_total, invoice_url }
//
// Esquema usado (ver migrations/20261007000000_esquema_foodconnect.sql):
//   empresas, empresa_pagamento, produtos, clientes, pedidos, itens_pedido
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_URL =
  Deno.env.get("ASAAS_ENV") === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
// UNDEFINED = cliente escolhe Pix/boleto/cartão na página do Asaas. Use "PIX" para só Pix.
const BILLING_TYPE = Deno.env.get("ASAAS_BILLING_TYPE") ?? "UNDEFINED";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_KEY,
      "User-Agent": "FoodConnect",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Asaas ${res.status}: ${JSON.stringify(data?.errors ?? data)}`);
  }
  return data;
}

// Data de hoje no horário de Brasília (YYYY-MM-DD)
function hojeBR() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Mesma regra de public.cpf_valido() do banco: a coluna clientes.cpf tem CHECK,
// então só gravamos CPFs com dígitos verificadores corretos.
function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(cpf[n])) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  // 1) Autenticação do cliente (JWT do Supabase Auth)
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);
  const user = userData.user;

  // 2) Validação da entrada
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const empresa_id = body?.empresa_id;
  const itens = body?.itens;
  const endereco_entrega = String(body?.endereco_entrega ?? "").trim() || null;
  const observacao = String(body?.observacao ?? "").trim() || null;

  if (!empresa_id || !Array.isArray(itens) || itens.length === 0 || itens.length > 50) {
    return json({ error: "Pedido inválido" }, 400);
  }

  // Nome e CPF: usa o que veio no pedido; senão, o que está no cadastro do cliente.
  const { data: cliente } = await admin
    .from("clientes")
    .select("nome, cpf")
    .eq("id", user.id)
    .maybeSingle();

  const nome = String(body?.nome ?? cliente?.nome ?? user.user_metadata?.nome ?? "").trim();
  const cpfCnpj = String(body?.cpfCnpj ?? cliente?.cpf ?? "").replace(/\D/g, "");

  if (nome.length < 2) return json({ error: "Nome obrigatório" }, 400);
  if (![11, 14].includes(cpfCnpj.length)) return json({ error: "CPF/CNPJ inválido" }, 400);
  if (cpfCnpj.length === 11 && !cpfValido(cpfCnpj)) return json({ error: "CPF inválido" }, 400);

  // Garante a linha em "clientes" (pedidos.cliente_id referencia clientes.id)
  // e guarda o CPF para os próximos pedidos.
  if (!cliente) {
    await admin.from("clientes").upsert(
      { id: user.id, nome, cpf: cpfCnpj.length === 11 ? cpfCnpj : null },
      { onConflict: "id", ignoreDuplicates: true },
    );
  } else if (!cliente.cpf && cpfCnpj.length === 11) {
    await admin.from("clientes").update({ cpf: cpfCnpj }).eq("id", user.id);
  }

  // Junta itens repetidos e valida quantidades
  const qtdPorProduto = new Map<string, { quantidade: number; observacao?: string }>();
  for (const it of itens) {
    const produtoId = it?.produto_id ?? it?.produtoId;
    const q = Number(it?.quantidade);
    if (!produtoId || !Number.isInteger(q) || q < 1 || q > 99) {
      return json({ error: "Item inválido" }, 400);
    }
    const atual = qtdPorProduto.get(produtoId);
    const novaQtd = (atual?.quantidade ?? 0) + q;
    if (novaQtd > 99) return json({ error: "Quantidade máxima por item: 99" }, 400);
    qtdPorProduto.set(produtoId, {
      quantidade: novaQtd,
      observacao: it.observacao ?? atual?.observacao,
    });
  }

  // 3) Preços oficiais vêm do banco, nunca do app
  const { data: empresa } = await admin
    .from("empresas")
    .select("id, ativo")
    .eq("id", empresa_id)
    .maybeSingle();
  if (!empresa || !empresa.ativo) return json({ error: "Empresa indisponível" }, 400);

  // Configuração de pagamento fica em tabela separada (empresa_pagamento)
  const { data: pagamento } = await admin
    .from("empresa_pagamento")
    .select("asaas_wallet_id, asaas_split_ativo, comissao_percentual")
    .eq("empresa_id", empresa_id)
    .maybeSingle();

  const ids = [...qtdPorProduto.keys()];
  const { data: produtos, error: prodErr } = await admin
    .from("produtos")
    .select("id, nome, preco")
    .in("id", ids)
    .eq("empresa_id", empresa_id)
    .eq("ativo", true)
    .eq("disponivel", true);
  if (prodErr || !produtos || produtos.length !== ids.length) {
    return json({ error: "Algum produto está indisponível" }, 400);
  }

  let totalCentavos = 0;
  const linhas = produtos.map((p) => {
    const { quantidade, observacao } = qtdPorProduto.get(p.id)!;
    const unitCent = Math.round(Number(p.preco) * 100);
    const subCent = unitCent * quantidade;
    totalCentavos += subCent;
    return {
      produto_id: p.id,
      nome_produto: p.nome,
      preco_unitario: unitCent / 100,
      quantidade,
      subtotal: subCent / 100,
      observacao: observacao ?? null,
    };
  });
  const valorTotal = totalCentavos / 100;
  if (valorTotal <= 0) return json({ error: "Valor inválido" }, 400);

  // 4) Cria o pedido aguardando pagamento
  const { data: pedido, error: pedErr } = await admin
    .from("pedidos")
    .insert({
      empresa_id,
      cliente_id: user.id,
      cliente_nome: nome,
      status: "aguardando_pagamento",
      payment_status: "pendente",
      valor_total: valorTotal,
      observacao,
      endereco_entrega,
    })
    .select("id")
    .single();
  if (pedErr || !pedido) {
    console.error("Erro ao criar pedido:", pedErr);
    return json({ error: "Erro ao criar pedido" }, 500);
  }

  const { error: itensErr } = await admin
    .from("itens_pedido")
    .insert(linhas.map((l) => ({ ...l, pedido_id: pedido.id })));
  if (itensErr) {
    console.error("Erro ao salvar itens:", itensErr);
    await admin.from("pedidos").delete().eq("id", pedido.id);
    return json({ error: "Erro ao salvar itens" }, 500);
  }

  // 5) Cria cliente + cobrança no Asaas
  try {
    const customer = await asaas("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: nome,
        cpfCnpj,
        email: user.email,
        externalReference: user.id,
        notificationDisabled: true,
      }),
    });

    const cobranca: Record<string, unknown> = {
      customer: customer.id,
      billingType: BILLING_TYPE,
      value: valorTotal,
      dueDate: hojeBR(),
      description: `Pedido FoodConnect ${pedido.id.slice(0, 8)}`,
      externalReference: pedido.id,
    };

    // Split: restaurante recebe (100 - comissão)%, plataforma fica com o resto.
    // Só aplica se a subconta já foi aprovada pelo Asaas (asaas_split_ativo).
    // Sem isso, todo o valor cai na conta da plataforma (repasse manual).
    const comissao = Number(pagamento?.comissao_percentual ?? 0);
    if (
      pagamento?.asaas_split_ativo &&
      pagamento?.asaas_wallet_id &&
      comissao >= 0 &&
      comissao < 100
    ) {
      cobranca.split = [
        { walletId: pagamento.asaas_wallet_id, percentualValue: 100 - comissao },
      ];
    }

    const payment = await asaas("/payments", {
      method: "POST",
      body: JSON.stringify(cobranca),
    });

    const { error: updErr } = await admin
      .from("pedidos")
      .update({
        asaas_payment_id: payment.id,
        asaas_invoice_url: payment.invoiceUrl ?? null,
      })
      .eq("id", pedido.id);
    if (updErr) throw updErr;

    return json({
      pedido_id: pedido.id,
      valor_total: valorTotal,
      invoice_url: payment.invoiceUrl ?? null,
    });
  } catch (e) {
    console.error("Erro Asaas:", e instanceof Error ? e.message : e);
    await admin
      .from("pedidos")
      .update({ status: "cancelado", payment_status: "cancelado" })
      .eq("id", pedido.id);
    return json({ error: "Não foi possível iniciar o pagamento" }, 502);
  }
});