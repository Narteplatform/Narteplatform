-- 0077 — Adeguamenti al parere legale di novembre 2026
--
-- CONTESTO
-- Il parere dell'Avv. Madonna sui profili contrattuali e regolatori chiede,
-- prima dell'apertura delle registrazioni:
--   1. registro email: il testo delle email lo legge solo l'amministratore
--      principale (minimizzazione, art. 5 GDPR). Il codice legge e scrive
--      `email_log` solo con la service role: l'accesso diretto via PostgREST
--      che la policy della 0023 apriva a ogni superadmin non serve a nessuna
--      pagina e permetterebbe di leggere i testi aggirando il controllo;
--   2. preavviso di 30 giorni, con motivazione, prima di sospendere o chiudere
--      l'account di un artista che opera con partita IVA (art. 4 Reg. UE
--      2019/1150, «P2B»): le misure si PROGRAMMANO e le esegue un cron;
--   3. shooting fotografico del piano Max annuale: uno per account, nel primo
--      anno, su un solo profilo artista, prenotabile dal 15° giorno (così non
--      cade mai nel periodo di recesso e non serve detrarne il valore).
--
-- Cosa fa:
--   - email_log: toglie la policy "email_log superadmin all" e revoca ogni
--     privilegio ad anon e authenticated. La service role non è toccata.
--   - misure_programmate: sospensioni e chiusure con data di efficacia futura.
--   - photo_shoots: richieste e stato degli shooting.
--
-- Additiva e idempotente: rieseguirla non cambia nulla. Non modifica ne'
-- cancella righe esistenti. Indipendente dalle altre. Il codice e' gia'
-- online e tollera ogni parte mancante (le funzioni nuove dicono di applicare
-- la 0077 invece di fallire).

-- =========================================
-- 1. Registro email: solo service role
-- =========================================
drop policy if exists "email_log superadmin all" on public.email_log;
revoke all on table public.email_log from anon, authenticated;

-- =========================================
-- 2. Misure programmate (preavviso P2B)
-- =========================================
create table if not exists public.misure_programmate (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tipo            text not null check (tipo in ('sospensione', 'chiusura')),
  motivo          text not null check (char_length(motivo) between 10 and 2000),
  efficace_dal    timestamptz not null,
  creata_da       uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  -- Riferimento della decisione comunicata con il preavviso (D-XXXXXXXX).
  riferimento     text,
  eseguita_il     timestamptz,
  annullata_il    timestamptz,
  annullata_da    uuid references auth.users(id) on delete set null,
  esito           text
);

comment on table public.misure_programmate is
  'Sospensioni/chiusure con preavviso di 30 giorni per gli artisti professionisti (Reg. UE 2019/1150 art. 4). Eseguite da /api/cron/misure-programmate.';

-- Al massimo una misura in attesa per account.
create unique index if not exists misure_programmate_attesa_uidx
  on public.misure_programmate (user_id)
  where eseguita_il is null and annullata_il is null;

create index if not exists misure_programmate_scadenza_idx
  on public.misure_programmate (efficace_dal)
  where eseguita_il is null and annullata_il is null;

alter table public.misure_programmate enable row level security;
revoke all on table public.misure_programmate from anon, authenticated;

-- =========================================
-- 3. Shooting fotografico (Max annuale)
-- =========================================
create table if not exists public.photo_shoots (
  id              uuid primary key default gen_random_uuid(),
  -- Uno per account: il vincolo unico è la regola, non un controllo applicativo.
  user_id         uuid not null references auth.users(id) on delete cascade,
  artist_id       uuid references public.artists(id) on delete set null,
  -- Nome del profilo al momento della richiesta: resta leggibile anche se il
  -- profilo viene eliminato.
  artist_name     text not null,
  subscription_id text,
  requested_at    timestamptz not null default now(),
  scheduled_at    timestamptz,
  done_at         timestamptz,
  note            text check (note is null or char_length(note) <= 1000),
  updated_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now()
);

create unique index if not exists photo_shoots_user_uidx on public.photo_shoots (user_id);

comment on table public.photo_shoots is
  'Shooting del piano Max annuale: 1 ora, Hangarram (Napoli), 5 foto; uno per account, nel primo anno, prenotabile dal 15° giorno.';

alter table public.photo_shoots enable row level security;
revoke all on table public.photo_shoots from anon, authenticated;
