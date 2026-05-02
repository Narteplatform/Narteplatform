-- =========================================
-- N'arte — Initial schema
-- =========================================

create extension if not exists "pgcrypto";

-- Custom types
do $$ begin
  create type role_enum as enum ('superadmin', 'artist', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type artist_status_enum as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status_enum as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_category_enum as enum (
    'music','clubs','festivals','dating','culture','art','food','workshops','comedy','business'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type availability_status_enum as enum ('available', 'busy');
exception when duplicate_object then null; end $$;

-- =========================================
-- profiles
-- =========================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_enum not null default 'user',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles readable by self"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles readable by superadmin"
  on public.profiles for select using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
create policy "profiles update self"
  on public.profiles for update using (auth.uid() = id);

-- Trigger: alla creazione di un nuovo auth.user crea il profilo
-- e promuove a superadmin se l'email coincide con la GUC app.superadmin_email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _superadmin text := current_setting('app.superadmin_email', true);
  _role role_enum := 'user';
begin
  if _superadmin is not null and lower(new.email) = lower(_superadmin) then
    _role := 'superadmin';
  end if;
  insert into public.profiles (id, role, full_name)
  values (new.id, _role, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Per attivare la promozione superadmin al primo login dell'utente con
-- l'email indicata, eseguire (sostituendo il valore) sul DB:
--   alter database postgres set app.superadmin_email = 'boostcreativeai@gmail.com';

-- =========================================
-- artists
-- =========================================
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stage_name text not null,
  slug text not null unique,
  bio text,
  genre text[] not null default '{}',
  city text,
  cover_image text,
  gallery text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  base_fee numeric,
  status artist_status_enum not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.artists enable row level security;

create policy "artists public read approved"
  on public.artists for select using (status = 'approved' or auth.uid() = user_id);
create policy "artists superadmin all"
  on public.artists for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
create policy "artists update self"
  on public.artists for update using (auth.uid() = user_id);

create index if not exists artists_status_idx on public.artists(status);
create index if not exists artists_slug_idx on public.artists(slug);

-- =========================================
-- artist_availability
-- =========================================
create table if not exists public.artist_availability (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  date date not null,
  status availability_status_enum not null default 'busy',
  unique (artist_id, date)
);

alter table public.artist_availability enable row level security;

create policy "availability public read"
  on public.artist_availability for select using (true);
create policy "availability owner write"
  on public.artist_availability for all using (
    exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- =========================================
-- events
-- =========================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category event_category_enum not null,
  date timestamptz not null,
  city text not null,
  venue text,
  price numeric,
  cover_image text,
  description text,
  featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events public read"
  on public.events for select using (true);
create policy "events superadmin write"
  on public.events for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

create index if not exists events_category_idx on public.events(category);
create index if not exists events_city_idx on public.events(city);
create index if not exists events_date_idx on public.events(date);

-- =========================================
-- leads
-- =========================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  event_date date not null,
  event_location text not null,
  budget numeric,
  message text not null,
  contact_email text not null,
  contact_phone text,
  status lead_status_enum not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "leads insert authenticated"
  on public.leads for insert with check (auth.uid() is not null);
create policy "leads read self"
  on public.leads for select using (auth.uid() = requester_user_id);
create policy "leads read artist"
  on public.leads for select using (
    exists(select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
  );
create policy "leads superadmin all"
  on public.leads for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

create index if not exists leads_artist_idx on public.leads(artist_id);
create index if not exists leads_status_idx on public.leads(status);

-- =========================================
-- artist_applications
-- =========================================
create table if not exists public.artist_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  stage_name text not null,
  genre text[] not null default '{}',
  bio text,
  links jsonb not null default '{}'::jsonb,
  status artist_status_enum not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.artist_applications enable row level security;

create policy "applications public insert"
  on public.artist_applications for insert with check (true);
create policy "applications superadmin all"
  on public.artist_applications for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- =========================================
-- contact_messages
-- =========================================
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "contact public insert"
  on public.contact_messages for insert with check (true);
create policy "contact superadmin read"
  on public.contact_messages for select using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- =========================================
-- collaborations
-- =========================================
create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  link text,
  description text,
  order_index integer not null default 0
);

alter table public.collaborations enable row level security;

create policy "collaborations public read"
  on public.collaborations for select using (true);
create policy "collaborations superadmin write"
  on public.collaborations for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- =========================================
-- Storage buckets
-- =========================================
insert into storage.buckets (id, name, public) values
  ('event-covers', 'event-covers', true),
  ('artist-images', 'artist-images', true),
  ('collaboration-logos', 'collaboration-logos', true)
on conflict (id) do nothing;
