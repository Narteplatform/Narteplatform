-- =========================================
-- N'arte — Ruolo "consultant" con login dedicato
-- =========================================
-- - Aggiunge il valore 'consultant' all'enum role_enum
-- - Collega public.consultants ad auth.users via user_id
-- - Funzione is_consultant + helper get_consultant_id_for_user
-- - RLS: consultant vede solo i suoi slot e le consultations sui suoi slot
-- - Layout admin: consultant entra in /admin ma vede solo /admin/consulenza
-- Idempotente.

-- 1. Aggiunge il valore all'enum
alter type public.role_enum add value if not exists 'consultant';

-- 2. consultants.user_id (FK opzionale verso auth.users)
alter table public.consultants
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists consultants_user_id_uq
  on public.consultants(user_id)
  where user_id is not null;

-- 3. Funzioni helper
create or replace function public.is_consultant(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role::text = 'consultant'
  );
$$;

create or replace function public.get_consultant_id_for_user(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.consultants where user_id = uid limit 1;
$$;

-- 4. Profili: consulente può leggere/aggiornare il proprio profilo
drop policy if exists "profiles consultant self update" on public.profiles;
create policy "profiles consultant self update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 5. consultants — il consulente legge la propria riga
drop policy if exists "consultants self read" on public.consultants;
create policy "consultants self read"
  on public.consultants for select
  using (user_id = auth.uid() or is_active = true or public.is_superadmin(auth.uid()));

-- 6. consultant_slots — il consulente vede tutti i suoi slot (anche disattivi)
drop policy if exists "consultant_slots self read" on public.consultant_slots;
create policy "consultant_slots self read"
  on public.consultant_slots for select
  using (
    consultant_id = public.get_consultant_id_for_user(auth.uid())
    or is_active = true
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "consultant_slots self write" on public.consultant_slots;
create policy "consultant_slots self write"
  on public.consultant_slots for update
  using (consultant_id = public.get_consultant_id_for_user(auth.uid()))
  with check (consultant_id = public.get_consultant_id_for_user(auth.uid()));

-- 7. consultations — il consulente vede solo le richieste sui suoi slot
drop policy if exists "consultations consultant read" on public.consultations;
create policy "consultations consultant read"
  on public.consultations for select
  using (
    public.is_superadmin(auth.uid())
    or user_id = auth.uid()
    or slot_id in (
      select id from public.consultant_slots
      where consultant_id = public.get_consultant_id_for_user(auth.uid())
    )
  );

drop policy if exists "consultations consultant update" on public.consultations;
create policy "consultations consultant update"
  on public.consultations for update
  using (
    public.is_superadmin(auth.uid())
    or slot_id in (
      select id from public.consultant_slots
      where consultant_id = public.get_consultant_id_for_user(auth.uid())
    )
  )
  with check (
    public.is_superadmin(auth.uid())
    or slot_id in (
      select id from public.consultant_slots
      where consultant_id = public.get_consultant_id_for_user(auth.uid())
    )
  );

-- 8. handle_new_user — supporta role='consultant' dal metadata signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _superadmin text := current_setting('app.superadmin_email', true);
  _meta_role text := coalesce(new.raw_user_meta_data->>'role', '');
  _role_text text := 'user';
begin
  if _superadmin is not null and lower(new.email) = lower(_superadmin) then
    _role_text := 'superadmin';
  elsif _meta_role = 'organizer' then
    _role_text := 'organizer';
  elsif _meta_role = 'consultant' then
    _role_text := 'consultant';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, _role_text::role_enum, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do update set role = excluded.role;
  return new;
end;
$$;
