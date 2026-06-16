-- =========================================
-- N'arte — 0031 Platform updates
-- Lead flessibili + tabella formats + bucket event-videos / format-covers
-- Idempotente.
-- =========================================

-- =========================================
-- 1. Lead flessibili
-- =========================================

-- artist_id non più obbligatorio (lead da contatti/format non hanno artista)
alter table public.leads
  alter column artist_id drop not null;

-- colonna source
alter table public.leads
  add column if not exists source text not null default 'booking';

-- constraint check su source (drop-if-exists per idempotenza)
do $$ begin
  alter table public.leads
    add constraint leads_source_check
    check (source in ('booking', 'contatti', 'format'));
exception when duplicate_object then null; end $$;

-- colonna contact_name (nome libero per lead anonimi da contatti/format)
alter table public.leads
  add column if not exists contact_name text;

-- RLS: sostituisci la policy insert per consentire anche anonimi
-- (modellata su "contact public insert" di contact_messages)
drop policy if exists "leads insert authenticated" on public.leads;
drop policy if exists "leads insert public" on public.leads;
create policy "leads insert public"
  on public.leads for insert with check (true);

-- =========================================
-- 2. Tabella formats
-- =========================================

create table if not exists public.formats (
  id            uuid         primary key default gen_random_uuid(),
  slug          text         unique not null,
  title         text         not null,
  tagline       text,
  description   text,
  cover_image   text,
  gallery       text[]       not null default '{}',
  videos        text[]       not null default '{}',
  icon          text,
  order_index   int          not null default 0,
  details       jsonb        not null default '{}',
  seo_title     text,
  seo_description text,
  published     boolean      not null default true,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

create index if not exists formats_order_idx on public.formats(order_index);
create index if not exists formats_slug_idx  on public.formats(slug);

alter table public.formats enable row level security;

drop policy if exists "formats public read published" on public.formats;
create policy "formats public read published"
  on public.formats for select
  using (published = true or public.is_superadmin(auth.uid()));

drop policy if exists "formats superadmin all" on public.formats;
create policy "formats superadmin all"
  on public.formats for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- Trigger updated_at
create or replace function public.touch_formats_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists formats_touch_updated_at on public.formats;
create trigger formats_touch_updated_at
  before update on public.formats
  for each row execute function public.touch_formats_updated_at();

-- =========================================
-- 3. Storage buckets
-- =========================================

insert into storage.buckets (id, name, public) values
  ('event-videos',   'event-videos',   true),
  ('format-covers',  'format-covers',  true)
on conflict (id) do nothing;

-- Policies bucket event-videos (modellate su artist-videos di 0025)
drop policy if exists "event-videos public select"  on storage.objects;
drop policy if exists "event-videos auth insert"    on storage.objects;
drop policy if exists "event-videos owner delete"   on storage.objects;

create policy "event-videos public select"
  on storage.objects for select
  using (bucket_id = 'event-videos');

create policy "event-videos auth insert"
  on storage.objects for insert
  with check (bucket_id = 'event-videos' and auth.uid() is not null);

create policy "event-videos owner delete"
  on storage.objects for delete
  using (bucket_id = 'event-videos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Policies bucket format-covers (modellate su event-covers di 0001)
drop policy if exists "format-covers public select" on storage.objects;
drop policy if exists "format-covers auth insert"   on storage.objects;
drop policy if exists "format-covers owner delete"  on storage.objects;

create policy "format-covers public select"
  on storage.objects for select
  using (bucket_id = 'format-covers');

create policy "format-covers auth insert"
  on storage.objects for insert
  with check (bucket_id = 'format-covers' and auth.uid() is not null);

create policy "format-covers owner delete"
  on storage.objects for delete
  using (bucket_id = 'format-covers' and auth.uid()::text = (storage.foldername(name))[1]);
