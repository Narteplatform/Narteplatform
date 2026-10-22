-- 0074 — Modifiche richieste dal cliente (22/10/2026)
--
-- CONTESTO
-- Quattro richieste del documento «Modifiche N'arte platform» che hanno bisogno
-- di spazio nel database. Ognuna è indipendente dalle altre:
--
--   1. Titolo dei video di eventi e format. I video degli artisti hanno un
--      titolo (tabella artist_videos); quelli di eventi e format sono un
--      semplice elenco di URL in `videos text[]` e il titolo non aveva dove
--      stare. Si aggiunge una mappa URL → titolo accanto all'elenco, senza
--      toccare l'elenco: nessun dato esistente da convertire.
--
--   2. Collegamento a Google Calendar. Ogni utente (artista o organizzatore)
--      riceve un link personale a un calendario iCal in sola lettura con le
--      sue date confermate. Il link contiene un token segreto: chi lo
--      conosce legge le date, quindi la tabella è chiusa a tutti tranne la
--      service role, e il token si può rigenerare.
--
--   3. Contenuti del sito modificabili dall'admin (telefono, social, testi
--      chiave). Tabella chiave → valore. Una chiave assente vale il testo
--      scritto nel codice: a tabella vuota il sito resta identico.
--
--   4. Nome dell'oggetto nel registro delle decisioni. Quando il team elimina
--      un profilo, il registro non riesce più a risalire al nome e mostra
--      «Profilo <uuid>». Il nome si salva al momento della decisione.
--
-- INDIPENDENTE dalle migration in attesa (0069/0070/0071/0073): qualunque
-- ordine. Il codice è già online e tollera ognuna di queste parti mancante.
--
-- Additiva e idempotente. Non modifica né cancella righe esistenti.

-- =========================================
-- 1. Titoli dei video di eventi e format
-- =========================================
alter table public.events
  add column if not exists video_titles jsonb not null default '{}'::jsonb;

alter table public.formats
  add column if not exists video_titles jsonb not null default '{}'::jsonb;

comment on column public.events.video_titles is
  'Titolo di ciascun video, per URL: {"<url in videos>": "titolo"}. Un URL senza voce non ha titolo.';
comment on column public.formats.video_titles is
  'Titolo di ciascun video, per URL: {"<url in videos>": "titolo"}. Un URL senza voce non ha titolo.';

-- =========================================
-- 2. Calendario iCal personale
-- =========================================
create table if not exists public.calendar_feeds (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  -- 32 byte casuali in base64url: è la «password» del link.
  token      text not null unique check (char_length(token) >= 32),
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;
-- Nessuna policy e nessun privilegio: legge e scrive solo la service role.
revoke all on table public.calendar_feeds from anon, authenticated;

-- =========================================
-- 3. Contenuti del sito
-- =========================================
create table if not exists public.site_settings (
  key        text primary key check (key ~ '^[a-z][a-z0-9_.]{1,79}$'),
  value      text not null check (char_length(value) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_settings enable row level security;
-- Il sito li legge dal server con la service role: nessun accesso dal browser.
revoke all on table public.site_settings from anon, authenticated;

-- =========================================
-- 4. Nome dell'oggetto nel registro delle decisioni
-- =========================================
-- Solo se il registro esiste (0065): questa parte non deve far fallire la
-- migration su un database che non l'ha ancora.
do $$
begin
  if to_regclass('public.moderation_actions') is not null then
    alter table public.moderation_actions
      add column if not exists target_name text check (target_name is null or char_length(target_name) <= 200);
  end if;
end $$;
