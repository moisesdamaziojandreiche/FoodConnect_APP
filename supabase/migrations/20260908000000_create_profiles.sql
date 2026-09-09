create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email
  )
  on conflict (id) do update
    set nome = excluded.nome,
        email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, nome, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'nome', ''),
  email
from auth.users
on conflict (id) do nothing;

grant select, update on table public.profiles to authenticated;