-- =========================================
-- N'arte — Video su Bunny Stream (convivenza con Supabase Storage)
-- =========================================
-- INTERAMENTE ADDITIVA. Nessuna colonna rimossa, nessuna riga riscritta,
-- nessun file cancellato. I video già caricati continuano a funzionare
-- esattamente come prima: il loro URL è assoluto in colonna e punta ancora a
-- Supabase Storage. La migrazione del pregresso è un'operazione separata, da
-- autorizzare a parte.
--
-- Idempotente: si può rieseguire senza danni.
--
-- ⚠️ PRIMA DI QUESTA VANNO APPLICATE 0048_rate_limits.sql e
--    0049_user_consents.sql, che risultano ancora in attesa. Finché manca la
--    0048 i freni di frequenza registrano un avviso e LASCIANO PASSARE TUTTO.

-- ---------------------------------------------------------------------------
-- 1. Colonne
-- ---------------------------------------------------------------------------

alter table public.artist_videos
  add column if not exists provider       text     not null default 'supabase',
  add column if not exists bunny_guid     text,
  add column if not exists bunny_status   smallint,
  add column if not exists playback_state text     not null default 'ready',
  add column if not exists upload_state   text     not null default 'uploaded',
  add column if not exists width          integer,
  add column if not exists height         integer,
  add column if not exists bunny_error    text,
  add column if not exists ready_at       timestamptz;

-- ⚠️ LA RIGA PIÙ PERICOLOSA DI QUESTO FILE È IL DEFAULT DI playback_state.
--
-- È 'ready' e non 'processing' di proposito. Il profilo pubblico filtra i video
-- su questa colonna: con 'processing' come default, nell'istante esatto in cui
-- questa migration viene eseguita TUTTI i video già online sparirebbero dai
-- profili degli artisti. Le righe nuove impostano 'processing' esplicitamente
-- al momento dell'insert; il default serve solo al pregresso, che è già online
-- e riproducibile.
--
-- VERIFICA SUBITO DOPO AVER ESEGUITO QUESTO FILE:
--   select provider, playback_state, count(*)
--     from public.artist_videos group by 1, 2;
-- Deve restituire UNA SOLA riga: supabase | ready | <totale>.

-- I video su Bunny non hanno né un URL Supabase né un percorso nel bucket:
-- l'indirizzo si deriva dal GUID a tempo di rendering, così un cambio di pull
-- zone non lascia in giro righe che puntano a un hostname morto.
alter table public.artist_videos alter column storage_path drop not null;
alter table public.artist_videos alter column url          drop not null;

-- ---------------------------------------------------------------------------
-- 2. Indici
-- ---------------------------------------------------------------------------

-- Il webhook cerca per GUID a ogni cambio di stato: senza indice è un seq scan.
create unique index if not exists artist_videos_bunny_guid_key
  on public.artist_videos(bunny_guid) where bunny_guid is not null;

-- La riconciliazione cerca solo le righe non ancora pronte.
create index if not exists artist_videos_processing_idx
  on public.artist_videos(created_at) where playback_state = 'processing';

-- ---------------------------------------------------------------------------
-- 3. Vincoli di forma
-- ---------------------------------------------------------------------------
-- Aggiunti NOT VALID e validati in un passo separato: se una riga inattesa
-- violasse un vincolo, un ALTER diretto farebbe fallire il file a metà,
-- lasciando lo schema in uno stato intermedio. Così invece l'aggiunta riesce
-- sempre e la validazione è una decisione che si legge e si prende dopo.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artist_videos_provider_chk') then
    alter table public.artist_videos
      add constraint artist_videos_provider_chk
      check (provider in ('supabase', 'bunny')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'artist_videos_playback_chk') then
    alter table public.artist_videos
      add constraint artist_videos_playback_chk
      check (playback_state in ('processing', 'ready', 'failed')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'artist_videos_upload_chk') then
    alter table public.artist_videos
      add constraint artist_videos_upload_chk
      check (upload_state in ('pending', 'uploaded', 'aborted')) not valid;
  end if;

  -- Nessuna riga può restare senza il proprio identificativo: o è un file
  -- Supabase con url + storage_path, o è un video Bunny con un guid.
  if not exists (select 1 from pg_constraint where conname = 'artist_videos_handle_chk') then
    alter table public.artist_videos
      add constraint artist_videos_handle_chk
      check (
            (provider = 'supabase' and url is not null and storage_path is not null)
         or (provider = 'bunny'    and bunny_guid is not null)
      ) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Registro degli oggetti su Bunny Storage
-- ---------------------------------------------------------------------------
-- Immagini e audio non richiedono modifiche di schema: `artists.gallery` e
-- `artists.audio_files` contengono URL assoluti e cambia solo il dominio.
--
-- Questa tabella serve a un'altra cosa: sapere con certezza COSA esiste su
-- Bunny. Senza, l'unico modo per rispondere sarebbe elencare la storage zone e
-- confrontarla a mano con sei colonne sparse su cinque tabelle. È ciò che rende
-- verificabile la promessa "nessun dato perso", e in futuro rende possibile una
-- pulizia degli orfani che sia controllabile prima di essere eseguita.

create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'bunny',
  storage_key   text not null,
  public_url    text not null,
  kind          text not null check (kind in ('image', 'audio')),
  owner_user_id uuid references auth.users(id) on delete set null,
  artist_id     uuid references public.artists(id) on delete set null,
  bytes         bigint,
  mime_type     text,
  created_at    timestamptz not null default now()
);

create unique index if not exists media_assets_storage_key_key
  on public.media_assets(storage_key);
create index if not exists media_assets_artist_idx
  on public.media_assets(artist_id);

alter table public.media_assets enable row level security;
-- Nessuna policy, ed è voluto: si legge e si scrive solo via service role.
-- Non serve al rendering, quindi non ha motivo di essere raggiungibile da
-- una sessione utente.

-- ---------------------------------------------------------------------------
-- 5. Commenti
-- ---------------------------------------------------------------------------

comment on column public.artist_videos.provider is
  'supabase = file nel bucket artist-videos (url + storage_path). bunny = Bunny Stream (bunny_guid). I due mondi convivono a tempo indeterminato.';
comment on column public.artist_videos.playback_state is
  'processing | ready | failed. NON è lo stato grezzo di Bunny: lo stato 4 arriva PRIMA del 3, e 9/10 (sottotitoli, titolo automatico) arrivano DOPO. Questa colonna avanza verso ready e il webhook non la fa mai regredire.';
comment on column public.artist_videos.bunny_status is
  'Ultimo stato grezzo ricevuto da Bunny. Solo diagnostico: non usarlo per decidere se un video è mostrabile.';
comment on column public.artist_videos.upload_state is
  'pending = GUID creato ma trasferimento non confermato. Le righe pending vecchie sono upload abbandonati.';
