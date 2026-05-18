-- =========================================
-- N'arte — File audio profilo artista
-- =========================================
-- Aggiunge:
--   * artists.audio_files jsonb[] (array di {url, title})
--   * bucket storage artist-audio
-- Idempotente.

alter table public.artists
  add column if not exists audio_files jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public) values
  ('artist-audio', 'artist-audio', true)
on conflict (id) do nothing;

drop policy if exists "artist-audio insert authenticated" on storage.objects;
create policy "artist-audio insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'artist-audio');

drop policy if exists "artist-audio read public" on storage.objects;
create policy "artist-audio read public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'artist-audio');

drop policy if exists "artist-audio delete own" on storage.objects;
create policy "artist-audio delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'artist-audio' and owner = auth.uid());
