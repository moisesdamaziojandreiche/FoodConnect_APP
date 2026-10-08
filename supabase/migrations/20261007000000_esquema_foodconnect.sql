-- =========================================================
-- 02 - ESQUEMA COMPLETO DO FOODCONNECT (banco novo)
-- =========================================================
-- Rode DEPOIS do 01_limpar_banco.sql, de uma so vez no SQL Editor.
-- Tudo roda dentro de uma transacao: se algo falhar, nada fica criado pela metade.
--
-- Tabelas (9):
--   empresas, empresa_pagamento, usuarios_empresa   -> restaurantes e seus usuarios
--   clientes                                        -> clientes do app
--   categorias, produtos                            -> cardapio
--   pedidos, itens_pedido                           -> pedidos (inclui pagamento Asaas)
--   push_tokens                                     -> avisos no celular
-- =========================================================

begin;

-- =========================================================
-- 1) FUNCOES AUXILIARES
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Valida os digitos verificadores do CPF
create or replace function public.cpf_valido(p text)
returns boolean
language plpgsql
immutable
as $$
declare
  c text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  soma int;
  d int;
begin
  if length(c) <> 11 or c = repeat(substr(c, 1, 1), 11) then
    return false;
  end if;

  for n in 9..10 loop
    soma := 0;
    for i in 1..n loop
      soma := soma + substr(c, i, 1)::int * (n + 2 - i);
    end loop;
    d := ((soma * 10) % 11) % 10;
    if d <> substr(c, n + 1, 1)::int then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- =========================================================
-- 2) TABELAS
-- =========================================================

-- ---------- EMPRESAS (restaurantes) ----------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  descricao text,
  logo_url text,
  imagem_capa_url text,
  telefone text,
  endereco text,
  horario_abertura time,
  horario_fechamento time,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- USUARIOS DA EMPRESA (quem acessa o painel) ----------
create table public.usuarios_empresa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cargo text not null default 'admin' check (cargo in ('admin', 'funcionario')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index idx_usuarios_empresa_empresa on public.usuarios_empresa(empresa_id);

-- ---------- CONFIG DE PAGAMENTO DA EMPRESA (Asaas) ----------
-- Fica separada de "empresas" porque o cliente do app le "empresas",
-- e comissao/carteira/chave nao podem ficar visiveis para ele.
create table public.empresa_pagamento (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  asaas_account_id text,
  asaas_wallet_id text,
  asaas_api_key text,                       -- SECRETA: so as Edge Functions leem
  asaas_split_ativo boolean not null default false,
  comissao_percentual numeric(5, 2) not null default 0
    check (comissao_percentual >= 0 and comissao_percentual < 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CLIENTES (app) ----------
create table public.clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  cpf text check (cpf is null or (cpf ~ '^[0-9]{11}$' and public.cpf_valido(cpf))),
  foto_url text,
  endereco_padrao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CATEGORIAS (por empresa) ----------
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 1),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, nome)
);

create index idx_categorias_empresa on public.categorias(empresa_id, ordem);

-- ---------- PRODUTOS ----------
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nome text not null check (length(trim(nome)) >= 1),
  descricao text,
  preco numeric(10, 2) not null check (preco >= 0),
  imagem_url text,
  ativo boolean not null default true,        -- aparece no cardapio
  disponivel boolean not null default true,   -- tem em estoque agora
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_produtos_empresa on public.produtos(empresa_id, ativo);

-- ---------- PEDIDOS (inclui os dados do pagamento) ----------
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nome text,                          -- copia do nome na hora do pedido
  status text not null default 'aguardando_pagamento'
    check (status in (
      'aguardando_pagamento', 'pendente', 'aceito', 'preparando',
      'pronto', 'saiu_para_entrega', 'entregue', 'cancelado'
    )),
  valor_total numeric(10, 2) not null check (valor_total > 0),
  observacao text,
  endereco_entrega text,                      -- vazio = retirada no restaurante

  -- pagamento (Asaas)
  payment_status text not null default 'pendente'
    check (payment_status in ('pendente', 'aprovado', 'cancelado', 'reembolsado')),
  payment_method text,                        -- PIX, CREDIT_CARD, BOLETO...
  asaas_payment_id text unique,
  asaas_invoice_url text,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pedidos_empresa on public.pedidos(empresa_id, created_at desc);
create index idx_pedidos_cliente on public.pedidos(cliente_id, created_at desc);

-- ---------- ITENS DO PEDIDO ----------
-- Guarda nome e preco da hora da compra, para o historico nao mudar se o produto mudar.
create table public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_produto text not null,
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  quantidade int not null check (quantidade between 1 and 99),
  subtotal numeric(10, 2) not null
    check (subtotal = round(preco_unitario * quantidade, 2)),
  observacao text,
  created_at timestamptz not null default now()
);

create index idx_itens_pedido on public.itens_pedido(pedido_id);

-- ---------- PUSH TOKENS (aparelhos dos clientes) ----------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  plataforma text,
  updated_at timestamptz not null default now()
);

create index idx_push_tokens_user on public.push_tokens(user_id);

-- =========================================================
-- 3) FUNCOES DE APOIO ÀS REGRAS DE ACESSO
-- =========================================================

-- Empresas do usuario logado (usada nas policies)
create or replace function public.usuario_empresa_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.usuarios_empresa where user_id = auth.uid();
$$;

revoke all on function public.usuario_empresa_ids() from public, anon;
grant execute on function public.usuario_empresa_ids() to authenticated;

-- Cadastro do token de push (se o aparelho trocar de conta, o token passa ao novo usuario)
create or replace function public.registrar_push_token(
  p_token text,
  p_plataforma text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  if p_token is null or length(p_token) < 10 or length(p_token) > 300 then
    raise exception 'Token invalido';
  end if;

  insert into public.push_tokens (user_id, token, plataforma)
  values (auth.uid(), p_token, p_plataforma)
  on conflict (token) do update
    set user_id = auth.uid(),
        plataforma = excluded.plataforma,
        updated_at = now();
end;
$$;

revoke all on function public.registrar_push_token(text, text) from public, anon;
grant execute on function public.registrar_push_token(text, text) to authenticated;

-- =========================================================
-- 4) TRIGGERS
-- =========================================================

-- updated_at automatico
create trigger trg_empresas_updated_at before update on public.empresas
  for each row execute function public.set_updated_at();
create trigger trg_empresa_pagamento_updated_at before update on public.empresa_pagamento
  for each row execute function public.set_updated_at();
create trigger trg_clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();
create trigger trg_produtos_updated_at before update on public.produtos
  for each row execute function public.set_updated_at();
create trigger trg_pedidos_updated_at before update on public.pedidos
  for each row execute function public.set_updated_at();

-- Toda empresa nova ganha sua linha de configuracao de pagamento
create or replace function public.criar_empresa_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.empresa_pagamento (empresa_id) values (new.id)
  on conflict (empresa_id) do nothing;
  return new;
end;
$$;

create trigger trg_empresas_criar_pagamento after insert on public.empresas
  for each row execute function public.criar_empresa_pagamento();

-- Quem NAO e o servidor so pode seguir o fluxo normal do pedido
create or replace function public.pedidos_validar_status()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'pendente'          and new.status in ('aceito', 'cancelado')) or
      (old.status = 'aceito'            and new.status in ('preparando', 'cancelado')) or
      (old.status = 'preparando'        and new.status in ('pronto', 'cancelado')) or
      (old.status = 'pronto'            and new.status in ('saiu_para_entrega', 'entregue')) or
      (old.status = 'saiu_para_entrega' and new.status = 'entregue')
    ) then
      raise exception 'Mudanca de status nao permitida: % -> %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_pedidos_validar_status before update on public.pedidos
  for each row execute function public.pedidos_validar_status();

-- CADASTRO: cria a linha certa quando um usuario se registra.
--   Metadados enviados no signUp (options.data):
--     tipo_cadastro = 'empresa' ou 'cliente' (padrao: cliente)
--     cliente: nome, cpf, telefone
--     empresa: nome_empresa, nome, telefone, endereco
create or replace function public.criar_conta_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_tipo text := coalesce(meta->>'tipo_cadastro', 'cliente');
  v_nome text := nullif(trim(coalesce(meta->>'nome', '')), '');
  v_cpf text := regexp_replace(coalesce(meta->>'cpf', ''), '\D', '', 'g');
  v_empresa uuid;
begin
  if v_tipo = 'empresa' then
    insert into public.empresas (nome, telefone, endereco)
    values (
      coalesce(nullif(trim(coalesce(meta->>'nome_empresa', '')), ''), v_nome, 'Minha empresa'),
      nullif(trim(coalesce(meta->>'telefone', '')), ''),
      nullif(trim(coalesce(meta->>'endereco', '')), '')
    )
    returning id into v_empresa;

    insert into public.usuarios_empresa (user_id, empresa_id, cargo)
    values (new.id, v_empresa, 'admin');
  else
    insert into public.clientes (id, nome, telefone, cpf)
    values (
      new.id,
      v_nome,
      nullif(trim(coalesce(meta->>'telefone', '')), ''),
      case when public.cpf_valido(v_cpf) then v_cpf else null end
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger trg_criar_conta_no_cadastro after insert on auth.users
  for each row execute function public.criar_conta_no_cadastro();

-- =========================================================
-- 5) SEGURANCA (RLS + permissoes)
-- =========================================================

alter table public.empresas          enable row level security;
alter table public.usuarios_empresa  enable row level security;
alter table public.empresa_pagamento enable row level security;
alter table public.clientes          enable row level security;
alter table public.categorias        enable row level security;
alter table public.produtos          enable row level security;
alter table public.pedidos           enable row level security;
alter table public.itens_pedido      enable row level security;
alter table public.push_tokens       enable row level security;

-- Ninguem acessa nada por padrao; abaixo liberamos so o necessario.
-- (A service role, usada nas Edge Functions, nao e afetada.)
revoke all on all tables in schema public from anon, authenticated;

-- ---------- empresas ----------
grant select on public.empresas to authenticated;
grant update (nome, descricao, logo_url, imagem_capa_url, telefone, endereco,
              horario_abertura, horario_fechamento, ativo)
  on public.empresas to authenticated;

create policy empresas_select on public.empresas
  for select to authenticated
  using (ativo or id in (select public.usuario_empresa_ids()));

create policy empresas_update on public.empresas
  for update to authenticated
  using (id in (select public.usuario_empresa_ids()))
  with check (id in (select public.usuario_empresa_ids()));

-- ---------- usuarios_empresa ----------
grant select on public.usuarios_empresa to authenticated;

create policy usuarios_empresa_select on public.usuarios_empresa
  for select to authenticated
  using (empresa_id in (select public.usuario_empresa_ids()));

-- ---------- empresa_pagamento (a chave secreta NAO e legivel) ----------
grant select (empresa_id, asaas_account_id, asaas_wallet_id,
              asaas_split_ativo, comissao_percentual)
  on public.empresa_pagamento to authenticated;

create policy empresa_pagamento_select on public.empresa_pagamento
  for select to authenticated
  using (empresa_id in (select public.usuario_empresa_ids()));

-- ---------- clientes ----------
grant select on public.clientes to authenticated;
grant insert (id, nome, telefone, cpf, foto_url, endereco_padrao)
  on public.clientes to authenticated;
grant update (nome, telefone, cpf, foto_url, endereco_padrao)
  on public.clientes to authenticated;

create policy clientes_select on public.clientes
  for select to authenticated using (id = auth.uid());

create policy clientes_insert on public.clientes
  for insert to authenticated with check (id = auth.uid());

create policy clientes_update on public.clientes
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- categorias ----------
grant select, insert, update, delete on public.categorias to authenticated;

create policy categorias_select on public.categorias
  for select to authenticated
  using (ativo or empresa_id in (select public.usuario_empresa_ids()));

create policy categorias_insert on public.categorias
  for insert to authenticated
  with check (empresa_id in (select public.usuario_empresa_ids()));

create policy categorias_update on public.categorias
  for update to authenticated
  using (empresa_id in (select public.usuario_empresa_ids()))
  with check (empresa_id in (select public.usuario_empresa_ids()));

create policy categorias_delete on public.categorias
  for delete to authenticated
  using (empresa_id in (select public.usuario_empresa_ids()));

-- ---------- produtos ----------
grant select, insert, update, delete on public.produtos to authenticated;

create policy produtos_select on public.produtos
  for select to authenticated
  using (ativo or empresa_id in (select public.usuario_empresa_ids()));

-- a categoria escolhida tem que ser da mesma empresa do produto
create policy produtos_insert on public.produtos
  for insert to authenticated
  with check (
    empresa_id in (select public.usuario_empresa_ids())
    and (
      produtos.categoria_id is null
      or exists (
        select 1 from public.categorias c
        where c.id = produtos.categoria_id and c.empresa_id = produtos.empresa_id
      )
    )
  );

create policy produtos_update on public.produtos
  for update to authenticated
  using (empresa_id in (select public.usuario_empresa_ids()))
  with check (
    empresa_id in (select public.usuario_empresa_ids())
    and (
      produtos.categoria_id is null
      or exists (
        select 1 from public.categorias c
        where c.id = produtos.categoria_id and c.empresa_id = produtos.empresa_id
      )
    )
  );

create policy produtos_delete on public.produtos
  for delete to authenticated
  using (empresa_id in (select public.usuario_empresa_ids()));

-- ---------- pedidos ----------
-- Pedidos so sao CRIADOS pela Edge Function create-payment (service role).
-- Cliente: ve os proprios. Restaurante: ve so pedidos JA PAGOS e muda apenas o status.
grant select on public.pedidos to authenticated;
grant update (status) on public.pedidos to authenticated;

create policy pedidos_select_cliente on public.pedidos
  for select to authenticated
  using (cliente_id = auth.uid());

create policy pedidos_select_empresa on public.pedidos
  for select to authenticated
  using (
    empresa_id in (select public.usuario_empresa_ids())
    and payment_status in ('aprovado', 'reembolsado')
  );

create policy pedidos_update_empresa on public.pedidos
  for update to authenticated
  using (
    empresa_id in (select public.usuario_empresa_ids())
    and payment_status = 'aprovado'
  )
  with check (
    empresa_id in (select public.usuario_empresa_ids())
    and payment_status = 'aprovado'
  );

-- ---------- itens_pedido ----------
-- Herdam a visibilidade do pedido (as regras de "pedidos" valem aqui tambem).
grant select on public.itens_pedido to authenticated;

create policy itens_pedido_select on public.itens_pedido
  for select to authenticated
  using (pedido_id in (select id from public.pedidos));

-- ---------- push_tokens ----------
grant select, delete on public.push_tokens to authenticated;

create policy push_tokens_select on public.push_tokens
  for select to authenticated using (user_id = auth.uid());

create policy push_tokens_delete on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- 6) TEMPO REAL (o app e o painel acompanham os pedidos ao vivo)
-- =========================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table public.pedidos;
  end if;
end $$;

-- =========================================================
-- 7) STORAGE (imagens de logo, produtos e fotos de perfil)
-- =========================================================
-- Caminhos esperados:
--   empresas/<empresa_id>/...   (logo, capa, produtos)  -> usuarios da empresa
--   clientes/<user_id>/...      (foto de perfil)        -> o proprio cliente
-- O bucket e publico para leitura (as imagens abrem por URL).
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists imagens_empresa_insert on storage.objects;
drop policy if exists imagens_empresa_update on storage.objects;
drop policy if exists imagens_empresa_delete on storage.objects;
drop policy if exists imagens_cliente_insert on storage.objects;
drop policy if exists imagens_cliente_update on storage.objects;
drop policy if exists imagens_cliente_delete on storage.objects;

create policy imagens_empresa_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'empresas'
    and (storage.foldername(name))[2] in (
      select e::text from public.usuario_empresa_ids() as e
    )
  );

create policy imagens_empresa_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'empresas'
    and (storage.foldername(name))[2] in (
      select e::text from public.usuario_empresa_ids() as e
    )
  );

create policy imagens_empresa_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'empresas'
    and (storage.foldername(name))[2] in (
      select e::text from public.usuario_empresa_ids() as e
    )
  );

create policy imagens_cliente_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'clientes'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy imagens_cliente_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'clientes'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy imagens_cliente_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'clientes'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;