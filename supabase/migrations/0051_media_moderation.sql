-- =============================================================================
-- N'arte — Moderazione superadmin dei media caricati dagli artisti
-- =============================================================================
-- INTERAMENTE ADDITIVA. Crea una tabella nuova e aggiunge colonne con DEFAULT.
-- Non legge, non riscrive e non svuota artists.gallery, artists.audio_files né
-- artists.cover_image. Nessuna riga di artist_videos viene modificata: solo
-- quattro colonne in più, tutte valorizzate dal default. Idempotente.
--
-- ⚠️ DIPENDENZA: richiede 0050_bunny_video.sql già applicata, perché tocca
-- artist_videos, che prima della 0050 non ha provider/playback_state.
-- Controllo da eseguire PRIMA (deve restituire tutte e tre le colonne):
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='artist_videos'
--      and column_name in ('provider','playback_state','upload_state');
-- =============================================================================

-- 1. Coda di approvazione dei media proposti ---------------------------------
-- Qui il contenuto ASPETTA. Non entra nel profilo finché il superadmin non lo
-- approva, e l'approvazione lo APPENDE (vedi 0052): la colonna pubblicata non
-- viene mai riscritta per intero, quindi non può essere svuotata per sbaglio.

create table if not exists public.artist_media_submissions (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  submitted_by  uuid references auth.users(id) on delete set null,
  -- Dove andrà il contenuto una volta approvato: dice alla funzione di
  -- approvazione quale colonna di `artists` deve appendere.
  target        text not null check (target in ('gallery','audio_files','cover_image')),
  media_kind    text not null check (media_kind in ('image','audio')),
  url           text not null,
  title         text,
  storage_key   text,
  mime_type     text,
  bytes         bigint,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now()
);

-- Un doppio click su "Salva" non deve generare due richieste per la stessa foto.
create unique index if not exists artist_media_submissions_pending_key
  on public.artist_media_submissions (artist_id, target, url)
  where status = 'pending';

create index if not exists artist_media_submissions_queue_idx
  on public.artist_media_submissions (status, created_at desc);

create index if not exists artist_media_submissions_artist_idx
  on public.artist_media_submissions (artist_id, status);

alter table public.artist_media_submissions enable row level security;

-- Lettura: il proprietario del profilo (deve vedere "in attesa" nella propria
-- dashboard) e il superadmin. Nessuna policy di scrittura: si scrive solo da
-- service role, coerente con tutte le altre server action del progetto.
drop policy if exists "media_submissions read own or admin"
  on public.artist_media_submissions;
create policy "media_submissions read own or admin"
  on public.artist_media_submissions for select
  using (
    exists (
      select 1 from public.artists a
       where a.id = artist_id and a.user_id = auth.uid()
    )
    or public.is_superadmin(auth.uid())
  );

comment on table public.artist_media_submissions is
  'Coda di approvazione dei media artista. L''approvazione appende su artists.gallery / audio_files via approve_artist_media_submission (0052): la colonna pubblicata non viene mai riscritta per intero.';

-- 2. Stato di moderazione dei video ------------------------------------------
-- ⚠️ IL DEFAULT È 'approved', ED È LA RIGA PIÙ DELICATA DI QUESTO FILE.
-- Il profilo pubblico filtrerà su questa colonna. Con default 'pending' TUTTI i
-- video già online sparirebbero dai profili nell'istante dell'esecuzione: è la
-- stessa trappola già documentata per playback_state nella 0050. Le righe nuove
-- scrivono 'pending' esplicitamente nell'insert; il default serve solo al
-- pregresso, che è già pubblico e deve restare tale.

alter table public.artist_videos
  add column if not exists moderation_state text not null default 'approved',
  add column if not exists moderation_note  text,
  add column if not exists reviewed_by      uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at      timestamptz;

-- NOT VALID: il vincolo governa le scritture da ora in poi senza dover
-- ricontrollare l'intera tabella adesso. La validazione è un passo separato,
-- da eseguire dopo aver letto il conteggio qui sotto.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'artist_videos_moderation_chk'
  ) then
    alter table public.artist_videos
      add constraint artist_videos_moderation_chk
      check (moderation_state in ('pending','approved','rejected')) not valid;
  end if;
end $$;

create index if not exists artist_videos_moderation_idx
  on public.artist_videos (moderation_state, created_at desc)
  where moderation_state = 'pending';

comment on column public.artist_videos.moderation_state is
  'pending | approved | rejected. Default ''approved'' per forza: il pregresso è già pubblico e non deve sparire. Solo i nuovi caricamenti nascono pending.';

-- =============================================================================
-- VERIFICA — da eseguire SUBITO DOPO, prima di mettere online il filtro.
-- Deve restituire UNA SOLA RIGA: approved | <totale video>
--
--   select moderation_state, count(*) from public.artist_videos group by 1;
--
-- Se e solo se il conteggio è quello atteso, validare il vincolo:
--
--   alter table public.artist_videos
--     validate constraint artist_videos_moderation_chk;
-- =============================================================================
