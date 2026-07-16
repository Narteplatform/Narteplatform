-- =========================================
-- N'arte — Permessi pagine admin (per-utente)
-- =========================================
-- Tabella admin_page_permissions per granular control sulle pagine
-- admin visibili a ciascun superadmin diverso dal root.
-- Il root superadmin è identificato via GUC app.superadmin_email
-- e ha sempre accesso a tutto.

create table if not exists public.admin_page_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_key text not null,
  can_view boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, page_key)
);

create index if not exists admin_page_permissions_user_idx
  on public.admin_page_permissions(user_id);

alter table public.admin_page_permissions enable row level security;

-- Helper: identifica se uid corrisponde al superadmin "root" (email = GUC).
create or replace function public.is_root_superadmin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users au
    join public.profiles p on p.id = au.id
    where au.id = uid
      and p.role = 'superadmin'
      and au.email = nullif(current_setting('app.superadmin_email', true), '')
  );
$$;

drop policy if exists "perms read self or root" on public.admin_page_permissions;
create policy "perms read self or root"
  on public.admin_page_permissions for select
  using (user_id = auth.uid() or public.is_root_superadmin(auth.uid()));

drop policy if exists "perms write root only" on public.admin_page_permissions;
create policy "perms write root only"
  on public.admin_page_permissions for all
  using (public.is_root_superadmin(auth.uid()))
  with check (public.is_root_superadmin(auth.uid()));
