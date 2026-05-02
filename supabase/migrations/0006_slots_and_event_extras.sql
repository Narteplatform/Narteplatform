-- =========================================
-- N'arte — slot orari artista + extras eventi
-- =========================================
-- - artist_default_slots : slot generali validi ogni giorno
-- - artist_date_slots    : slot specifici per una data (override dei default)
-- - events.gallery / videos / end_at
-- - leads.event_time     : slot orario richiesto dal cliente
-- Idempotente.

-- Slot generali (validi ogni giorno per default)
create table if not exists public.artist_default_slots (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  label text,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists artist_default_slots_artist_idx
  on public.artist_default_slots(artist_id);

alter table public.artist_default_slots enable row level security;

drop policy if exists "default_slots public read" on public.artist_default_slots;
create policy "default_slots public read"
  on public.artist_default_slots for select using (true);

drop policy if exists "default_slots owner write" on public.artist_default_slots;
create policy "default_slots owner write"
  on public.artist_default_slots for all using (
    exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- Slot specifici per data (se presenti, sovrascrivono i default per quel giorno)
create table if not exists public.artist_date_slots (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  date date not null,
  label text,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists artist_date_slots_artist_date_idx
  on public.artist_date_slots(artist_id, date);

alter table public.artist_date_slots enable row level security;

drop policy if exists "date_slots public read" on public.artist_date_slots;
create policy "date_slots public read"
  on public.artist_date_slots for select using (true);

drop policy if exists "date_slots owner write" on public.artist_date_slots;
create policy "date_slots owner write"
  on public.artist_date_slots for all using (
    exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- Eventi: galleria, video e orario di fine
alter table public.events
  add column if not exists gallery text[] not null default '{}';

alter table public.events
  add column if not exists videos text[] not null default '{}';

alter table public.events
  add column if not exists end_at timestamptz;

-- Leads: orario richiesto (slot scelto dal cliente)
alter table public.leads
  add column if not exists event_time text;
