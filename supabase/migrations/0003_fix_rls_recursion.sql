-- =========================================
-- Fix critico: ricorsione infinita in RLS
-- =========================================
-- Le policy della migration 0001 valutano `is superadmin` con
--   exists(select 1 from public.profiles ...)
-- Questo, su qualunque tabella, riattiva le policy di profiles
-- → ricorsione (Postgres errore 42P17).
-- Conseguenza: qualunque SELECT pubblica fallisce e nessun client
-- autenticato può leggere il proprio profilo.
--
-- Fix: definiamo una funzione SECURITY DEFINER che bypassa RLS,
-- e riscriviamo tutte le policy "is superadmin" usandola.

create or replace function public.is_superadmin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin(uuid) from public;
grant execute on function public.is_superadmin(uuid) to anon, authenticated, service_role;

-- ---- profiles ----
drop policy if exists "profiles readable by superadmin" on public.profiles;
create policy "profiles readable by superadmin"
  on public.profiles for select
  using (public.is_superadmin(auth.uid()));

-- ---- artists ----
drop policy if exists "artists superadmin all" on public.artists;
create policy "artists superadmin all"
  on public.artists for all
  using (public.is_superadmin(auth.uid()));

-- ---- artist_availability ----
drop policy if exists "availability owner write" on public.artist_availability;
create policy "availability owner write"
  on public.artist_availability for all
  using (
    exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

-- ---- events ----
drop policy if exists "events superadmin write" on public.events;
create policy "events superadmin write"
  on public.events for all
  using (public.is_superadmin(auth.uid()));

-- ---- leads ----
drop policy if exists "leads superadmin all" on public.leads;
create policy "leads superadmin all"
  on public.leads for all
  using (public.is_superadmin(auth.uid()));

-- ---- artist_applications ----
drop policy if exists "applications superadmin all" on public.artist_applications;
create policy "applications superadmin all"
  on public.artist_applications for all
  using (public.is_superadmin(auth.uid()));

-- ---- contact_messages ----
drop policy if exists "contact superadmin read" on public.contact_messages;
create policy "contact superadmin read"
  on public.contact_messages for select
  using (public.is_superadmin(auth.uid()));

-- ---- collaborations ----
drop policy if exists "collaborations superadmin write" on public.collaborations;
create policy "collaborations superadmin write"
  on public.collaborations for all
  using (public.is_superadmin(auth.uid()));
