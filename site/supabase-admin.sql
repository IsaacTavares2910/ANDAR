-- Execute no SQL Editor do Supabase depois de criar o usuário Auth:
-- e-mail: isaac171@andar.local | senha: 594416
-- Depois substitua o UUID abaixo pelo id desse usuário.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Após criar o usuário Auth, execute a inserção abaixo com o UUID real:
-- insert into public.admin_users (user_id, role) values ('UUID_REAL', 'admin') on conflict (user_id) do update set role = 'admin';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins enxergam e alteram o catálogo; visitantes continuam apenas lendo.
alter table public.produtos enable row level security;
do $$
declare policy_record record;
begin
  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'produtos' loop
    execute format('drop policy if exists %I on public.produtos', policy_record.policyname);
  end loop;
end $$;
create policy "Everyone can read products" on public.produtos for select to anon, authenticated using (true);
create policy "Admins can insert products" on public.produtos for insert to authenticated with check (public.is_admin());
create policy "Admins can update products" on public.produtos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete products" on public.produtos for delete to authenticated using (public.is_admin());

-- Cada administrador pode confirmar sua própria autorização para o frontend.
drop policy if exists "Admins can read own authorization" on public.admin_users;
create policy "Admins can read own authorization" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- Bucket público para que a loja consiga exibir as URLs salvas em produtos.imagem_url.
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'produtos' and public.is_admin());
create policy "Admins can update product images" on storage.objects for update to authenticated using (bucket_id = 'produtos' and public.is_admin()) with check (bucket_id = 'produtos' and public.is_admin());
create policy "Admins can delete product images" on storage.objects for delete to authenticated using (bucket_id = 'produtos' and public.is_admin());

