-- =========================================
-- N'arte — Profili Consulenti
-- =========================================
-- Aggiunge:
--   * consultants: anagrafica consulenti gestita dal superadmin
--   * consultant_slots.consultant_id: ogni slot appartiene (opzionalmente) a un consulente
-- Idempotente.

-- =========================================
-- 1. consultants
-- =========================================
create table if not exists public.consultants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  email text,
  phone text,
  bio text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultants_active_idx on public.consultants(is_active);

alter table public.consultants enable row level security;

drop policy if exists "consultants public read active" on public.consultants;
create policy "consultants public read active"
  on public.consultants for select
  using (is_active = true or public.is_superadmin(auth.uid()));

drop policy if exists "consultants superadmin all" on public.consultants;
create policy "consultants superadmin all"
  on public.consultants for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- =========================================
-- 2. consultant_slots.consultant_id
-- =========================================
alter table public.consultant_slots
  add column if not exists consultant_id uuid references public.consultants(id) on delete cascade;

create index if not exists consultant_slots_consultant_idx
  on public.consultant_slots(consultant_id);

-- slot_at non più globally unique: stesso orario può essere offerto da consulenti diversi
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'consultant_slots_slot_at_key'
      and conrelid = 'public.consultant_slots'::regclass
  ) then
    alter table public.consultant_slots drop constraint consultant_slots_slot_at_key;
  end if;
end $$;

create unique index if not exists consultant_slots_consultant_slot_uq
  on public.consultant_slots(consultant_id, slot_at)
  where consultant_id is not null;
