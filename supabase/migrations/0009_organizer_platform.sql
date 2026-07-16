-- =========================================
-- N'arte — Piattaforma organizzatore
-- =========================================
-- Aggiunge:
--   * enum price_band_enum + colonna artists.price_band
--   * tabella organizers (profilo esteso ruolo organizer)
--   * tabella venues (strutture)
--   * tabella booking_requests (workflow handshake)
--   * trigger sync booking_requests.confermata → artist_availability.busy
--   * trigger handle_new_user esteso (crea riga organizer)
--   * funzione promote_user_to_organizer
--   * RLS + bucket storage venues
-- Idempotente.

-- =========================================
-- 1. price_band
-- =========================================
do $$ begin
  create type price_band_enum as enum ('budget','standard','premium','luxury');
exception when duplicate_object then null; end $$;

alter table public.artists
  add column if not exists price_band price_band_enum not null default 'standard';

-- =========================================
-- 2. organizers
-- =========================================
create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  is_brand boolean not null default false,
  phone text,
  website text,
  instagram text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizers enable row level security;

drop policy if exists "organizers public read" on public.organizers;
create policy "organizers public read"
  on public.organizers for select using (true);

drop policy if exists "organizers self update" on public.organizers;
create policy "organizers self update"
  on public.organizers for update using (auth.uid() = user_id);

drop policy if exists "organizers self insert" on public.organizers;
create policy "organizers self insert"
  on public.organizers for insert with check (auth.uid() = user_id);

drop policy if exists "organizers superadmin all" on public.organizers;
create policy "organizers superadmin all"
  on public.organizers for all
  using (public.is_superadmin(auth.uid()));

-- =========================================
-- 3. venues
-- =========================================
do $$ begin
  create type venue_type_enum as enum ('club','pub','festival','teatro','locale','altro');
exception when duplicate_object then null; end $$;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  name text not null,
  slug text unique,
  address text,
  city text,
  region text,
  postal_code text,
  capacity integer,
  venue_type venue_type_enum not null default 'altro',
  description text,
  cover_image text,
  gallery text[] not null default '{}',
  website text,
  instagram text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venues enable row level security;

drop policy if exists "venues public read" on public.venues;
create policy "venues public read"
  on public.venues for select using (true);

drop policy if exists "venues owner write" on public.venues;
create policy "venues owner write"
  on public.venues for all
  using (
    exists(select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

create index if not exists venues_organizer_idx on public.venues(organizer_id);

-- =========================================
-- 4. booking_requests
-- =========================================
do $$ begin
  create type booking_status_enum as enum ('pending','in_trattativa','confermata','rifiutata','annullata');
exception when duplicate_object then null; end $$;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  artist_id uuid not null references public.artists(id) on delete cascade,
  event_date date not null,
  time_slot text,
  budget_offer numeric,
  message text not null,
  status booking_status_enum not null default 'pending',
  artist_accepted_at timestamptz,
  organizer_confirmed_at timestamptz,
  notes_artist text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_requests_unique_confermata
  on public.booking_requests (artist_id, event_date)
  where status = 'confermata';

create index if not exists booking_requests_organizer_idx on public.booking_requests(organizer_id);
create index if not exists booking_requests_artist_idx on public.booking_requests(artist_id);
create index if not exists booking_requests_status_idx on public.booking_requests(status);

alter table public.booking_requests enable row level security;

drop policy if exists "booking_requests read involved" on public.booking_requests;
create policy "booking_requests read involved"
  on public.booking_requests for select using (
    exists(select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid())
    or exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "booking_requests insert organizer" on public.booking_requests;
create policy "booking_requests insert organizer"
  on public.booking_requests for insert with check (
    exists(select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "booking_requests update involved" on public.booking_requests;
create policy "booking_requests update involved"
  on public.booking_requests for update using (
    exists(select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid())
    or exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

-- Public read di info minime per banner data rossa: gestito via view (vedi sotto)

-- =========================================
-- 5. Trigger sync booking_requests → artist_availability
-- =========================================
create or replace function public.sync_booking_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.status = 'confermata' then
    insert into public.artist_availability (artist_id, date, status)
    values (new.artist_id, new.event_date, 'busy')
    on conflict (artist_id, date) do update set status = 'busy';
  elsif tg_op = 'UPDATE'
        and old.status = 'confermata'
        and new.status <> 'confermata' then
    -- Libera la data se non ci sono altre conferme
    if not exists (
      select 1 from public.booking_requests
      where artist_id = new.artist_id
        and event_date = new.event_date
        and status = 'confermata'
        and id <> new.id
    ) then
      delete from public.artist_availability
        where artist_id = new.artist_id and date = new.event_date;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_booking_availability on public.booking_requests;
create trigger trg_sync_booking_availability
  before insert or update on public.booking_requests
  for each row execute function public.sync_booking_availability();

-- =========================================
-- 6. View pubblica per banner data rossa
-- =========================================
create or replace view public.booking_requests_public as
  select
    br.id,
    br.artist_id,
    br.event_date,
    br.status,
    br.time_slot,
    o.id as organizer_id,
    o.display_name as organizer_name,
    o.avatar_url as organizer_avatar,
    v.id as venue_id,
    v.name as venue_name,
    v.city as venue_city,
    v.cover_image as venue_cover
  from public.booking_requests br
  join public.organizers o on o.id = br.organizer_id
  left join public.venues v on v.id = br.venue_id
  where br.status = 'confermata';

grant select on public.booking_requests_public to anon, authenticated;

-- =========================================
-- 7. handle_new_user esteso: crea riga organizers
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _superadmin text := current_setting('app.superadmin_email', true);
  _meta_role text := coalesce(new.raw_user_meta_data->>'role', '');
  _role role_enum := 'user';
  _display text := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
begin
  if _superadmin is not null and lower(new.email) = lower(_superadmin) then
    _role := 'superadmin';
  elsif _meta_role = 'organizer' then
    _role := 'organizer';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, _role, _display)
  on conflict (id) do update set role = excluded.role;

  if _role = 'organizer' then
    insert into public.organizers (user_id, display_name)
    values (new.id, _display)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- =========================================
-- 8. promote_user_to_organizer
-- =========================================
create or replace function public.promote_user_to_organizer(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _email text;
  _display text;
begin
  update public.profiles
    set role = 'organizer'
    where id = uid and role = 'user';

  select au.email, coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1))
    into _email, _display
    from auth.users au where au.id = uid;

  insert into public.organizers (user_id, display_name)
  values (uid, coalesce(_display, _email))
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.promote_user_to_organizer(uuid) from public;
grant execute on function public.promote_user_to_organizer(uuid) to authenticated, service_role;

-- =========================================
-- 9. Storage bucket per immagini venues
-- =========================================
insert into storage.buckets (id, name, public) values
  ('venue-images', 'venue-images', true)
on conflict (id) do nothing;

-- =========================================
-- 10. Backfill organizers per utenti già con role='organizer'
-- =========================================
insert into public.organizers (user_id, display_name)
  select p.id, coalesce(p.full_name, split_part(au.email,'@',1))
    from public.profiles p
    join auth.users au on au.id = p.id
    where p.role = 'organizer'
  on conflict (user_id) do nothing;
