-- 0048 — Limitatore di frequenza applicativo
--
-- CONTESTO
-- Prima di questa migration la piattaforma non aveva alcun freno sugli invii:
-- nessun captcha, nessun honeypot, nessun conteggio. Le conseguenze concrete,
-- tutte verificate nel codice:
--
--   * `app/api/upload-application-video/route.ts` accettava video fino a 50 MB
--     da CHIUNQUE, senza login. Bastava uno script per riempire lo Storage.
--   * i form pubblici (contatti, candidatura, richiesta evento, interesse
--     format) inseriscono a database con service role, senza soglia.
--   * `app/api/booking-request/route.ts` CREA ACCOUNT con `email_confirm: true`,
--     cioè senza verifica dell'indirizzo.
--
-- L'unico freno esistente era quello sul recupero password, che leggeva una
-- colonna inesistente (`created_at` invece di `sent_at`) e quindi non è mai
-- scattato.
--
-- SCELTE
-- 1. Niente servizi esterni: nessun Redis, nessun Upstash, nessun account nuovo.
--    Il volume attuale non lo giustifica e ogni dipendenza in più è una cosa che
--    può mancare in produzione.
-- 2. La chiave NON contiene mai un indirizzo IP o un'email in chiaro: chi
--    chiama passa già un hash. Un limitatore di frequenza non deve diventare un
--    registro di chi ha visitato il sito.
-- 3. Il conteggio avviene dentro una funzione, non con letture e scritture
--    separate dall'applicazione: due richieste simultanee leggerebbero lo stesso
--    valore e passerebbero entrambe.
--
-- Additiva e ripetibile: non tocca né legge alcuna tabella esistente.

create table if not exists public.rate_limits (
  key           text        not null,
  window_start  timestamptz not null,
  count         integer     not null default 0,
  primary key (key, window_start)
);

comment on table public.rate_limits is
  'Contatori per il limitatore di frequenza. `key` è già in forma di hash: non contiene IP né email in chiaro.';

create index if not exists rate_limits_window_idx
  on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- Nessuna policy, di proposito: con RLS attiva e zero policy la tabella è
-- irraggiungibile da anon e authenticated. Solo il service role, che salta RLS,
-- può leggerla e scriverla — ed è esattamente da lì che passa il codice.

-- ---------------------------------------------------------------------------
-- Registra un colpo e dice se è consentito.
--
-- Atomica: `insert ... on conflict do update` incrementa e restituisce il nuovo
-- valore in una sola istruzione, quindi due richieste in parallelo non possono
-- leggere lo stesso conteggio e passare entrambe.
--
-- La finestra è "fissa" (floor del timestamp sulla durata) e non scorrevole:
-- meno preciso ai bordi, ma costa una riga per finestra invece di una riga per
-- richiesta. Per fermare i bot è più che sufficiente.
--
-- Ritorna TRUE se la richiesta può proseguire, FALSE se ha superato il tetto.
-- ---------------------------------------------------------------------------
create or replace function public.rate_limit_hit(
  p_key            text,
  p_window_seconds integer,
  p_max            integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count  integer;
begin
  if p_key is null or length(p_key) = 0 then
    -- Senza chiave non si può contare nulla: si lascia passare invece di
    -- bloccare, perché un limitatore rotto non deve chiudere il sito.
    return true;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / greatest(p_window_seconds, 1)) * greatest(p_window_seconds, 1)
  );

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public;
revoke all on function public.rate_limit_hit(text, integer, integer) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pulizia delle finestre vecchie.
--
-- Senza, la tabella cresce all'infinito. Si può chiamare da un cron o a mano;
-- non è automatica di proposito, per non introdurre un trigger che gira a ogni
-- scrittura.
-- ---------------------------------------------------------------------------
create or replace function public.rate_limits_prune(p_older_than interval default '7 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
   where window_start < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.rate_limits_prune(interval) from public;
revoke all on function public.rate_limits_prune(interval) from anon, authenticated;
