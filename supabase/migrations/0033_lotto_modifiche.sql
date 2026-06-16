-- =========================================
-- N'arte — 0033 Lotto modifiche
-- Colonne artist_applications + bucket application-videos / blog-covers
-- Idempotente.
-- =========================================

-- =========================================
-- 1. Nuove colonne artist_applications
-- =========================================

-- URL pubblico del video di presentazione (bucket application-videos)
alter table public.artist_applications
  add column if not exists video_url text;

-- Path oggetto storage (per gestione interna / cancellazione)
alter table public.artist_applications
  add column if not exists video_path text;

-- Strumenti suonati dal candidato
alter table public.artist_applications
  add column if not exists instruments text[] not null default '{}';

-- =========================================
-- 2. Bucket application-videos (pubblico, upload anonimo)
-- =========================================

insert into storage.buckets (id, name, public)
values ('application-videos', 'application-videos', true)
on conflict (id) do nothing;

-- Lettura pubblica
drop policy if exists "application-videos public select" on storage.objects;
create policy "application-videos public select"
  on storage.objects for select
  using (bucket_id = 'application-videos');

-- Upload consentito sia ad anonimi sia ad autenticati
-- (la candidatura artista non richiede login)
drop policy if exists "application-videos anon insert" on storage.objects;
create policy "application-videos anon insert"
  on storage.objects for insert
  with check (bucket_id = 'application-videos');

-- Nessuna policy UPDATE/DELETE pubblica: solo service-role può cancellare oggetti

-- =========================================
-- 3. Bucket blog-covers (pubblico, upload autenticati)
-- =========================================

insert into storage.buckets (id, name, public)
values ('blog-covers', 'blog-covers', true)
on conflict (id) do nothing;

-- Lettura pubblica
drop policy if exists "blog-covers public select" on storage.objects;
create policy "blog-covers public select"
  on storage.objects for select
  using (bucket_id = 'blog-covers');

-- Upload solo per utenti autenticati
drop policy if exists "blog-covers auth insert" on storage.objects;
create policy "blog-covers auth insert"
  on storage.objects for insert
  with check (bucket_id = 'blog-covers' and auth.uid() is not null);

-- Cancellazione solo dal proprietario (prima cartella = user_id)
drop policy if exists "blog-covers owner delete" on storage.objects;
create policy "blog-covers owner delete"
  on storage.objects for delete
  using (bucket_id = 'blog-covers' and auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================
-- 4. Nota su artists.personnel
-- =========================================
-- La colonna `artists.personnel` (jsonb, default '[]') contiene già un array
-- di oggetti con struttura { name: string, role: string }.
-- Nessuna modifica di schema necessaria — documentazione soltanto.

comment on column public.artists.personnel is
  'Array JSON di membri: [{name: text, role: text}]. Nessun vincolo di schema — validato a livello applicativo.';
