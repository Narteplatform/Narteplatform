-- =========================================
-- N'arte — generi, strumenti live, social estesi
-- =========================================
-- - Tabella public.genres gestita dal superadmin (CRUD da /admin/generi)
-- - artists.instruments : strumenti suonati live (lista predefinita lato app)
-- Idempotente.

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.genres enable row level security;

drop policy if exists "genres public read" on public.genres;
create policy "genres public read"
  on public.genres for select using (true);

drop policy if exists "genres superadmin write" on public.genres;
create policy "genres superadmin write"
  on public.genres for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- Seed di base (idempotente: on conflict do nothing)
insert into public.genres (name, order_index) values
  ('Pop', 10),
  ('Rock', 20),
  ('Indie', 30),
  ('Indie Rock', 40),
  ('Cantautorato', 50),
  ('Folk', 60),
  ('Acoustic', 70),
  ('Hip Hop', 80),
  ('Trap', 90),
  ('R&B', 100),
  ('Soul', 110),
  ('Funk', 120),
  ('Jazz', 130),
  ('Blues', 140),
  ('Swing', 150),
  ('Disco', 160),
  ('Reggae', 170),
  ('Reggaeton', 180),
  ('Latin', 190),
  ('Salsa', 200),
  ('Bachata', 210),
  ('Elettronica', 220),
  ('House', 230),
  ('Techno', 240),
  ('Drum & Bass', 250),
  ('Dubstep', 260),
  ('DJ Set', 270),
  ('Classica', 280),
  ('Lirica', 290),
  ('Gospel', 300),
  ('Country', 310),
  ('Metal', 320),
  ('Punk', 330),
  ('Hardcore', 340),
  ('World Music', 350),
  ('Cover Band', 360),
  ('Tributo', 370)
on conflict (name) do nothing;

-- Strumenti suonati live (array semplice di stringhe; la lista la gestisce l'app)
alter table public.artists
  add column if not exists instruments text[] not null default '{}';
