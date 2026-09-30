-- 0062 — Nuovi tipi di consenso e accettazione
--
-- CONTESTO
-- La 0049 prevedeva tre sole voci nel registro dei consensi: privacy, termini,
-- marketing. Il fascicolo legale (doc. 08) ne richiede altre, ciascuna con la
-- sua prova separata, perché si accettano in momenti diversi e da persone
-- diverse:
--
--   condizioni_organizzatori  chi diventa organizzatore (doc. 04)
--   condizioni_artisti        l'artista all'attivazione dell'account (doc. 03)
--   condizioni_abbonamento    a ogni sottoscrizione di un piano (doc. 02)
--   esecuzione_immediata      il consumatore che chiede l'avvio del servizio
--                             prima della fine del periodo di recesso
--                             (art. 51, c. 8 e art. 57, c. 3 Cod. consumo)
--   clausole_specifiche       l'approvazione specifica ex artt. 1341-1342 c.c.
--                             di chi agisce come professionista
--   maggiore_eta              la dichiarazione dei 18 anni
--   diritti_contenuti         la garanzia sui diritti dei contenuti caricati
--
-- La nuova colonna `ref` collega la prova all'oggetto a cui si riferisce: per
-- l'abbonamento, l'id della subscription Stripe. Senza, di due sottoscrizioni
-- successive non si saprebbe quale accettazione vale per quale.
--
-- Additiva: nessuna riga esistente viene toccata.

-- 1. Vincolo sui tipi, ricreato con l'elenco completo
do $$
declare
  _nome text;
begin
  for _nome in
    select conname from pg_constraint
     where conrelid = 'public.user_consents'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.user_consents drop constraint %I', _nome);
  end loop;
end;
$$;

alter table public.user_consents
  add constraint user_consents_kind_check check (kind in (
    'privacy', 'termini', 'marketing',
    'condizioni_organizzatori', 'condizioni_artisti', 'condizioni_abbonamento',
    'esecuzione_immediata', 'clausole_specifiche', 'maggiore_eta', 'diritti_contenuti'
  ));

-- 2. Riferimento all'oggetto accettato
alter table public.user_consents add column if not exists ref text;

-- 3. record_consent con il riferimento facoltativo.
-- Si elimina la versione a tre argomenti prima di crearne una a quattro con
-- valore predefinito: se convivessero, una chiamata con tre argomenti sarebbe
-- ambigua e PostgREST la rifiuterebbe.
drop function if exists public.record_consent(text, text, boolean);

create or replace function public.record_consent(
  p_kind     text,
  p_version  text,
  p_accepted boolean default true,
  p_ref      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'record_consent richiede una sessione autenticata';
  end if;

  if p_kind not in (
    'privacy', 'termini', 'marketing',
    'condizioni_organizzatori', 'condizioni_artisti', 'condizioni_abbonamento',
    'esecuzione_immediata', 'clausole_specifiche', 'maggiore_eta', 'diritti_contenuti'
  ) then
    raise exception 'consenso di tipo sconosciuto: %', p_kind;
  end if;

  if coalesce(btrim(p_version), '') = '' then
    raise exception 'record_consent richiede la versione del documento accettato';
  end if;

  insert into public.user_consents (user_id, kind, version, accepted, ref)
  values (v_user, p_kind, p_version, p_accepted, nullif(btrim(p_ref), ''));
end;
$$;

comment on function public.record_consent(text, text, boolean, text) is
  'Registra un consenso o un''accettazione per l''utente in sessione. `p_ref` collega la prova all''oggetto (es. id della subscription Stripe).';

revoke all on function public.record_consent(text, text, boolean, text) from public, anon;
grant execute on function public.record_consent(text, text, boolean, text) to authenticated;

notify pgrst, 'reload schema';
