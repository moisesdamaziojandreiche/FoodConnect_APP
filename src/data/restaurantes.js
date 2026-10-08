import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAO_CONFIGURADO = { message: "Supabase não configurado" };

// Restaurantes = tabela `empresas` (a mesma que o painel administra).
export async function listarRestaurantes() {
  if (!supabase.from) return { data: [], error: NAO_CONFIGURADO };

  return supabase
    .from("empresas")
    .select("id, nome, descricao, endereco, telefone, logo_url, imagem_capa_url, horario_abertura, horario_fechamento")
    .eq("ativo", true)
    .order("nome");
}

export function textoHorario(restaurante) {
  const { horario_abertura, horario_fechamento } = restaurante || {};
  if (!horario_abertura || !horario_fechamento) return "";

  return `${horario_abertura.slice(0, 5)} às ${horario_fechamento.slice(0, 5)}`;
}

// Produtos cadastrados pelo restaurante no painel.
export async function listarProdutos(empresaId) {
  if (!supabase.from) return { data: [], error: NAO_CONFIGURADO };

  return supabase
    .from("produtos")
    .select("id, nome, descricao, preco, imagem_url")
    .eq("empresa_id", empresaId)
    .order("nome");
}

export function useRestaurantes() {
  const [restaurantes, setRestaurantes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await listarRestaurantes();
    setErro(error ? error.message : null);
    setRestaurantes(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { restaurantes, carregando, erro, recarregar };
}