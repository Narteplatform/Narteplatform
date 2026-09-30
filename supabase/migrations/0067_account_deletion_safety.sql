-- 0067 — Cancellazione dell'account senza danni alla controparte, e date
--        confermate senza esporre i privati
--
-- CONTESTO
-- L'analisi fatta per il fascicolo legale ha trovato tre problemi nel modo in
-- cui lo schema reagisce alla cancellazione di un utente, e uno di esposizione:
--
--   1. `organizers.user_id` è `on delete cascade`. Cancellare l'utente di un
--      organizzatore cancella il record organizzatore e, a cascata, le sue
--      conversazioni, le richieste di booking e le recensioni: sparivano anche
--      i messaggi e le date dell'ARTISTA, che ha diritto a conservarli. I
--      termini e l'informativa promettono il contrario («i messaggi restano a
--      chi li ha ricevuti»).
--   2. `booking_requests.final_price_proposed_by/confirmed_by` riferiscono
--      `profiles` senza clausola: chi aveva annotato un compenso NON poteva
--      essere cancellato affatto (la chiave esterna lo impediva).
--   3. `user_consents.user_id` è `on delete cascade`: con l'utente spariva
--      anche la prova dei consensi che aveva dato, che invece va conservata per
--      dimostrare la liceità dei trattamenti passati.
--   4. La vista `booking_requests_public` mostra, per ogni data confermata,
--      nome e immagine dell'organizzatore e nome della struttura anche quando
--      l'organizzatore è un privato o la struttura è un'abitazione, ed è
--      leggibile anche senza login.
--
-- COSA CAMBIA
--   1. `organizers.user_id` diventa facoltativa e `on delete set null`: alla
--      cancellazione il record organizzatore resta, anonimizzato dalla
--      procedura di completamento, e con lui restano le conversazioni.
--   2. Le due chiavi del compenso diventano `on delete set null`.
--   3. `user_consents.user_id` diventa facoltativa e `on delete set null`; la
--      nuova colonna `subject_hash` (impronta dell'email, scritta dalla
--      procedura di completamento prima della cancellazione) permette di
--      ricollegare la prova all'interessato se la contesta.
--   4. La vista nasconde nome e immagine degli organizzatori privati e il nome
--      delle strutture di tipo «privato» (resta la città), e non è più
--      leggibile da `anon`: il calendario completo si vede solo da registrati.
--
-- Nessun dato esistente viene modificato. I vincoli vengono sostituiti
-- cercandone il nome nel catalogo, perché i nomi generati automaticamente non
-- sono garantiti.

-- =========================================
-- Utility: sostituisce la chiave esterna di una colonna
-- =========================================
create or replace function pg_temp.ricrea_fk(
  p_tabella regclass,
  p_colonna text,
  p_riferimento text,
  p_on_delete text
) returns void
language plpgsql
as $$
declare
  _nome text;
begin
  for _nome in
    select c.conname
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = p_tabella
       and c.contype = 'f'
       and a.attname = p_colonna
  loop
    execute format('alter table %s drop constraint %I', p_tabella, _nome);
  end loop;
  execute format(
    'alter table %s add constraint %I foreign key (%I) references %s on delete %s',
    p_tabella,
    replace(p_tabella::text, 'public.', '') || '_' || p_colonna || '_fkey',
    p_colonna,
    p_riferimento,
    p_on_delete
  );
end;
$$;

-- 1. organizzatori
alter table public.organizers alter column user_id drop not null;
select pg_temp.ricrea_fk('public.organizers', 'user_id', 'auth.users(id)', 'set null');

-- 2. compenso annotato
select pg_temp.ricrea_fk('public.booking_requests', 'final_price_proposed_by', 'public.profiles(id)', 'set null');
select pg_temp.ricrea_fk('public.booking_requests', 'final_price_confirmed_by', 'public.profiles(id)', 'set null');

-- 3. prova dei consensi
alter table public.user_consents alter column user_id drop not null;
alter table public.user_consents add column if not exists subject_hash text;
select pg_temp.ricrea_fk('public.user_consents', 'user_id', 'auth.users(id)', 'set null');

comment on column public.user_consents.subject_hash is
  'Impronta sha256 dell''email dell''interessato, scritta prima della cancellazione dell''account: conserva la prova del consenso senza conservare l''identità in chiaro.';

-- 4. vista pubblica delle date confermate
create or replace view public.booking_requests_public as
  select
    br.id,
    br.artist_id,
    br.event_date,
    br.status,
    br.time_slot,
    o.id as organizer_id,
    case when coalesce(o.is_private, false) then null else o.display_name end as organizer_name,
    case when coalesce(o.is_private, false) then null else o.avatar_url end as organizer_avatar,
    v.id as venue_id,
    case when v.venue_type = 'privato' then null else v.name end as venue_name,
    v.city as venue_city,
    case when v.venue_type = 'privato' then null else v.cover_image end as venue_cover
  from public.booking_requests br
  join public.organizers o on o.id = br.organizer_id
  left join public.venues v on v.id = br.venue_id
  where br.status = 'confermata';

revoke all on public.booking_requests_public from anon;
grant select on public.booking_requests_public to authenticated;

notify pgrst, 'reload schema';
