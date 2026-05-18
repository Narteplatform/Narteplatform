-- =========================================
-- N'arte — Consulenza (chiamate gratuite con consulente)
-- =========================================
-- Aggiunge:
--   * consultant_slots: slot disponibili gestiti dal superadmin
--   * consultations: richieste/appuntamenti dagli utenti (anche guest)
-- Idempotente.

-- =========================================
-- 1. consultant_slots
-- =========================================
create table if not exists public.consultant_slots (
  id uuid primary key default gen_random_uuid(),
  slot_at timestamptz not null unique,
  duration_min int not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists consultant_slots_slot_at_idx on public.consultant_slots(slot_at);
create index if not exists consultant_slots_active_idx on public.consultant_slots(is_active, slot_at);

alter table public.consultant_slots enable row level security;

drop policy if exists "consultant_slots public read active" on public.consultant_slots;
create policy "consultant_slots public read active"
  on public.consultant_slots for select
  using (is_active = true or public.is_superadmin(auth.uid()));

drop policy if exists "consultant_slots superadmin all" on public.consultant_slots;
create policy "consultant_slots superadmin all"
  on public.consultant_slots for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- =========================================
-- 2. consultations
-- =========================================
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.consultant_slots(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  needs text,
  status text not null default 'requested'
    check (status in ('requested','confirmed','completed','cancelled')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create index if not exists consultations_status_idx on public.consultations(status);
create index if not exists consultations_slot_idx on public.consultations(slot_id);
create unique index if not exists consultations_active_slot_uq
  on public.consultations(slot_id)
  where status in ('requested','confirmed');

alter table public.consultations enable row level security;

drop policy if exists "consultations public insert" on public.consultations;
create policy "consultations public insert"
  on public.consultations for insert
  with check (true);

drop policy if exists "consultations self read" on public.consultations;
create policy "consultations self read"
  on public.consultations for select
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));

drop policy if exists "consultations superadmin all" on public.consultations;
create policy "consultations superadmin all"
  on public.consultations for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));
