// Cria e consulta a subconta Asaas (conta de recebimento) do restaurante.
// Chamada pelo painel (pagamento.html) com o JWT do usuário logado.
//   { acao: "criar", name, email, cpfCnpj, mobilePhone, incomeValue, postalCode,
//     address, addressNumber, province, complement?, birthDate?, companyType? }
//   { acao: "status" }
//
// Dados ficam em public.empresa_pagamento (asaas_account_id, asaas_wallet_id,
// asaas_api_key, asaas_split_ativo, comissao_percentual). A asaas_api_key NUNCA
// é devolvida ao navegador.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_URL =
  Deno.env.get("ASAAS_ENV") === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
const COMISSAO_PADRAO = Number(Deno.env.get("COMISSAO_PADRAO") ?? 0);

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

async function asaas(path: string, init: RequestInit = {}, apiKey = ASAAS_KEY) {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "FoodConnect",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalhe = data?.errors?.[0]?.description ?? JSON.stringify(data?.errors ?? data);
    throw new Error(`Asaas ${res.status}: ${detalhe}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  // Autenticação + permissão: só admin da empresa
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);

  const { data: vinculo } = await admin
    .from("usuarios_empresa")
    .select("empresa_id, cargo")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!vinculo) return json({ error: "Usuário sem empresa" }, 403);
  if (vinculo.cargo !== "admin") {
    return json({ error: "Apenas administradores podem configurar recebimentos" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { data: pag } = await admin
    .from("empresa_pagamento")
    .select("asaas_account_id, asaas_wallet_id, asaas_api_key, asaas_split_ativo, comissao_percentual")
    .eq("empresa_id", vinculo.empresa_id)
    .maybeSingle();

  try {
    // ------------------------------------------------------------ criar
    if (body?.acao === "criar") {
      if (pag?.asaas_wallet_id) return json({ error: "A conta de recebimento já foi criada" }, 400);

      const doc = String(body.cpfCnpj ?? "").replace(/\D/g, "");
      if (![11, 14].includes(doc.length)) return json({ error: "CPF/CNPJ inválido" }, 400);
      if (!body.name || !body.email || !body.mobilePhone || !body.postalCode ||
          !body.address || !body.addressNumber || !body.province || !(Number(body.incomeValue) > 0)) {
        return json({ error: "Preencha todos os campos obrigatórios" }, 400);
      }
      if (doc.length === 11 && !body.birthDate) return json({ error: "Informe a data de nascimento" }, 400);
      if (doc.length === 14 && !body.companyType) return json({ error: "Informe o tipo de empresa" }, 400);

      const conta = await asaas("/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: String(body.name).trim(),
          email: String(body.email).trim(),
          cpfCnpj: doc,
          birthDate: doc.length === 11 ? body.birthDate : undefined,
          companyType: doc.length === 14 ? body.companyType : undefined,
          mobilePhone: String(body.mobilePhone).replace(/\D/g, ""),
          incomeValue: Number(body.incomeValue),
          address: String(body.address).trim(),
          addressNumber: String(body.addressNumber).trim(),
          complement: body.complement || undefined,
          province: String(body.province).trim(),
          postalCode: String(body.postalCode).replace(/\D/g, ""),
        }),
      });

      const comissao = COMISSAO_PADRAO >= 0 && COMISSAO_PADRAO < 100 ? COMISSAO_PADRAO : 0;
      const { error } = await admin
        .from("empresa_pagamento")
        .upsert({
          empresa_id: vinculo.empresa_id,
          asaas_account_id: conta.id ?? null,
          asaas_wallet_id: conta.walletId ?? null,
          asaas_api_key: conta.apiKey ?? null,
          asaas_split_ativo: false,
          comissao_percentual: pag ? pag.comissao_percentual : comissao,
        }, { onConflict: "empresa_id" });
      if (error) throw error;

      return json({
        mensagem: "Conta criada! Confira seu e-mail para ativar a conta no Asaas e enviar os documentos.",
      });
    }

    // ----------------------------------------------------------- status
    if (body?.acao === "status") {
      if (!pag?.asaas_api_key) return json({ error: "A conta de recebimento ainda não foi criada" }, 400);

      const st = await asaas("/myAccount/status", {}, pag.asaas_api_key);
      const aprovada = st.general === "APPROVED";

      // Split só liga depois que o Asaas aprovou a conta.
      if (aprovada !== pag.asaas_split_ativo) {
        const { error } = await admin
          .from("empresa_pagamento")
          .update({ asaas_split_ativo: aprovada })
          .eq("empresa_id", vinculo.empresa_id);
        if (error) throw error;
      }

      return json({
        general: st.general,
        commercialInfo: st.commercialInfo,
        bankAccountInfo: st.bankAccountInfo,
        documentation: st.documentation,
        split_ativo: aprovada,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("asaas-subconta:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 502);
  }
});