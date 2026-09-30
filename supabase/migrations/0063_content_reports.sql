-- 0063 — Segnalazioni di contenuti e reclami contro le decisioni
--
-- CONTESTO
-- Gli articoli 16, 17 e 20 del Regolamento (UE) 2022/2065 (DSA) chiedono tre
-- cose a una piattaforma che ospita contenuti di terzi: un meccanismo con cui
-- chiunque possa segnalare un contenuto ritenuto illecito, la comunicazione
-- dell'esito a chi ha segnalato, e un sistema interno di reclamo contro le
-- decisioni prese. Fino a oggi le segnalazioni arrivavano dal modulo contatti,
-- mescolate a tutto il resto, senza un riferimento, senza uno stato, senza
-- traccia di chi le avesse esaminate e con quale motivazione.
--
-- PERCHÉ UNA TABELLA SOLA PER SEGNALAZIONI E RECLAMI
-- Un reclamo è una segnalazione il cui oggetto è una decisione già presa
-- (`target_type = 'decisione'`, `contested_reference` = il riferimento D-… della
-- decisione, o quello S-… della segnalazione). Ha lo stesso ciclo di vita —
-- ricevuto, in esame, deciso — e va riesaminato da una persona diversa dal
-- primo decisore. Due tabelle avrebbero raddoppiato pannello, permessi e
-- controlli senza aggiungere nulla.
--
-- PERCHÉ IL RIFERIMENTO È UNA COLONNA E NON L'ID
-- `reference` (S-XXXXXXXX per le segnalazioni, R-XXXXXXXX per i reclami) è ciò
-- che il segnalante riceve per email e cita se ci riscrive. L'uuid non si può
-- dettare al telefono.
--
-- Additiva: nessuna tabella esistente viene toccata. Va applicata dopo la 0065
-- solo per comodità di lettura: non ci sono dipendenze, `moderation_actions.
-- report_id` non è una chiave esterna.

create table if not exists public.content_reports (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  reference            text not null,
  kind                 text not null default 'segnalazione',

  -- Chi segnala. `reporter_user_id` è valorizzato solo se era autenticato; il
  -- nome e l'email si conservano comunque, perché l'esito va comunicato anche a
  -- chi non ha un account (art. 16, par. 5 DSA).
  reporter_user_id     uuid references auth.users(id) on delete set null,
  reporter_name        text not null,
  reporter_email       text not null,

  -- Cosa si segnala.
  target_type          text not null,
  target_url           text,
  target_id            uuid,
  category             text not null,
  description          text not null,

  -- Per i reclami: il riferimento della decisione o della segnalazione contestata.
  contested_reference  text,

  -- Dichiarazione di buona fede (art. 16, par. 2, lett. d DSA) e versione
  -- dell'informativa vista al momento dell'invio.
  good_faith_at        timestamptz not null,
  consent_version      text,

  -- Esito.
  status               text not null default 'ricevuta',
  decision_note        text,
  decided_by           uuid references auth.users(id) on delete set null,
  decided_at           timestamptz,
  reporter_notified_at timestamptz,

  constraint content_reports_reference_key unique (reference),
  constraint content_reports_kind_check
    check (kind in ('segnalazione', 'reclamo')),
  constraint content_reports_target_type_check
    check (target_type in ('profilo', 'media', 'recensione', 'struttura', 'messaggio', 'decisione', 'altro')),
  constraint content_reports_status_check
    check (status in ('ricevuta', 'in_esame', 'accolta', 'respinta', 'archiviata')),
  constraint content_reports_description_check
    check (char_length(description) between 10 and 5000),
  constraint content_reports_reporter_email_check
    check (char_length(btrim(reporter_email)) > 0)
);

comment on table public.content_reports is
  'Segnalazioni di contenuti e reclami contro decisioni di moderazione (DSA artt. 16, 17, 20). Si scrive solo da server con il service role.';
comment on column public.content_reports.reference is
  'Riferimento leggibile comunicato al segnalante: S-XXXXXXXX per le segnalazioni, R-XXXXXXXX per i reclami.';
comment on column public.content_reports.contested_reference is
  'Solo per i reclami: riferimento della decisione (D-…) o della segnalazione (S-…) contestata.';
comment on column public.content_reports.decision_note is
  'Motivazione dell''esito, comunicata al segnalante. Obbligatoria (almeno 10 caratteri) a livello applicativo quando si decide.';

create index if not exists content_reports_status_created_idx
  on public.content_reports (status, created_at desc);
-- `reference` ha già l'indice del vincolo unique; questo serve alle ricerche
-- per riferimento contestato dei reclami.
create index if not exists content_reports_contested_idx
  on public.content_reports (contested_reference)
  where contested_reference is not null;

alter table public.content_reports enable row level security;

drop policy if exists "segnalazioni: superadmin legge tutto" on public.content_reports;
create policy "segnalazioni: superadmin legge tutto"
  on public.content_reports for select
  using (public.is_superadmin(auth.uid()));

-- Nessuna policy di scrittura: si scrive solo da server con il service role.
-- Una segnalazione o un esito che il browser potesse scrivere a piacere non
-- dimostrerebbe nulla, e il segnalante non deve poter leggere quelle altrui:
-- contengono nome ed email di chi segnala.

-- Doppio strato, come in 0046, 0049 e 0060: la RLS filtra le righe, i privilegi
-- governano l'accesso alla tabella. Senza il revoke, `anon` e `authenticated`
-- ereditano i permessi di default dello schema e la tabella resta raggiungibile
-- via PostgREST.
revoke all on public.content_reports from anon, authenticated;
grant select on public.content_reports to authenticated;

notify pgrst, 'reload schema';
