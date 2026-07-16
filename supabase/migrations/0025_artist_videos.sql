-- =========================================
-- N'arte — Video artista (upload nativo)
-- =========================================
-- Bucket pubblico artist-videos + tabella artist_videos per metadati.
-- Idempotente.

insert into storage.buckets (id, name, public)
values ('artist-videos', 'artist-videos', true)
on conflict (id) do nothing;

create table if not exists public.artist_videos (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  url text not null,
  storage_path text not null,
  title text,
  duration_ms integer,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists artist_videos_artist_idx on public.artist_videos(artist_id);
create index if not exists artist_videos_created_idx on public.artist_videos(created_at desc);

alter table public.artist_videos enable row level security;

drop policy if exists "videos public read approved" on public.artist_videos;
create policy "videos public read approved"
  on public.artist_videos for select
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.status = 'approved')
    or exists (select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "videos artist write own" on public.artist_videos;
create policy "videos artist write own"
  on public.artist_videos for all
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  )
  with check (
    exists (select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );
