-- 0082 — Abbonamenti: scadenze, riconciliazione con Stripe, presa in carico
--         atomica degli eventi del webhook
--
-- CONTESTO
-- La revisione degli abbonamenti (novembre 2026) ha trovato quattro punti in
-- cui il ledger e la realtà possono divergere senza che nessuno se ne accorga:
--
--  1. PIANI SCADUTI CHE NON SCADONO. `artists.tier` è una cache che i trigger
--     aggiornano quando cambia un dato, non quando passa il tempo. L'unico
--     ricalcolo per scadenza era `inviti_sync_scaduti()` (0078): guarda solo le
--     ultime 48 ore, gira dentro il cron degli inviti (che esce subito quando
--     INVITI_ATTIVI è spento) e non ricalcola le sospensioni dei profili. Un
--     omaggio scaduto con il cron spento, o una notte saltata, lasciavano il
--     piano alto per sempre. `abbonamenti_ricalcola_piani()` confronta la cache
--     con `compute_artist_tier()` SENZA finestra temporale, ricalcola tier e
--     sospensioni degli account toccati e restituisce chi è stato sospeso o
--     riattivato (serve all'email `profiles_suspended`).
--
--  2. CONSEGNE SIMULTANEE DELLO STESSO EVENTO. Il webhook marcava l'evento
--     «visto» con un insert e poi lo eseguiva: due consegne ravvicinate dello
--     stesso evento (retry di Stripe mentre la prima è ancora in corso)
--     passavano entrambe e mandavano due email. `claimed_at` +
--     `stripe_evento_prendi()` rendono la presa in carico atomica: vince una
--     sola richiesta; se muore a metà, il lease scade e un retry (o il cron)
--     riprende l'evento.
--
--  3. ABBONAMENTI SPARITI DA STRIPE. Il cron di riconciliazione rilegge ogni
--     abbonamento vivo da Stripe. Se Stripe risponde «non esiste», la riga NON
--     si cancella né si declassa: si annota in `stripe_mancante_dal` e si avvisa
--     il root una volta sola. La nota sparisce da sola alla prima
--     sincronizzazione riuscita.
--
--  4. SHOOTING DEL MAX ANNUALE. Il «primo anno» si contava da
--     `subscriptions.created_at`, ma un abbonamento Pro mensile passato al Max
--     annuale dal Portal resta la STESSA riga: il primo anno partiva dalla
--     data del Pro. `piano_corrente_dal` registra quando la riga ha assunto
--     piano e periodicità attuali.
--
-- Additiva e idempotente: solo colonne nuove (nullable), funzioni e un
-- trigger BEFORE che tocca esclusivamente le colonne nuove. Non cancella né
-- modifica dati esistenti, tranne il riempimento iniziale di
-- `piano_corrente_dal` (= created_at) sulle righe che non l'hanno.
-- Indipendente dalle altre: richiede solo 0043/0044 (già applicate).
-- Tutte le funzioni sono SECURITY DEFINER ed eseguibili solo da service_role.
--
-- Il codice funziona anche PRIMA di questa migration: ogni chiamata ha un
-- ripiego (comportamento precedente) quando la funzione non esiste.

-- =========================================
-- 1. Presa in carico atomica degli eventi Stripe
-- =========================================
alter table public.stripe_webhook_events
  add column if not exists claimed_at timestamptz;

comment on column public.stripe_webhook_events.claimed_at is
  'Quando una richiesta (webhook o cron) ha preso in carico l''evento. Lease: scaduto, l''evento si può riprendere. NULL = libero.';

-- true = la richiesta corrente ha preso l'evento e deve eseguirlo.
-- false = già elaborato, inesistente, o in lavorazione da un'altra richiesta
-- con lease ancora valido. L'UPDATE con la condizione nel WHERE è atomico:
-- una seconda richiesta concorrente attende il lock della riga, rivaluta la
-- condizione sulla versione nuova e non trova nulla da prendere.
create or replace function public.stripe_evento_prendi(p_id text, p_lease_secondi integer default 180)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preso boolean;
begin
  update public.stripe_webhook_events
     set claimed_at = now()
   where id = p_id
     and processed_at is null
     and (claimed_at is null
          or claimed_at < now() - make_interval(secs => greatest(coalesce(p_lease_secondi, 180), 30)))
  returning true into v_preso;
  return coalesce(v_preso, false);
end;
$$;

revoke all on function public.stripe_evento_prendi(text, integer) from public, anon, authenticated;
grant execute on function public.stripe_evento_prendi(text, integer) to service_role;

-- Rilascio dopo un errore ritentabile: il retry successivo non deve aspettare
-- la scadenza del lease.
create or replace function public.stripe_evento_rilascia(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stripe_webhook_events
     set claimed_at = null
   where id = p_id
     and processed_at is null;
$$;

revoke all on function public.stripe_evento_rilascia(text) from public, anon, authenticated;
grant execute on function public.stripe_evento_rilascia(text) to service_role;

-- =========================================
-- 2. subscriptions: piano corrente dal / mancante su Stripe dal
-- =========================================
alter table public.subscriptions
  add column if not exists piano_corrente_dal timestamptz,
  add column if not exists stripe_mancante_dal timestamptz;

comment on column public.subscriptions.piano_corrente_dal is
  'Da quando la riga ha piano (tier) e periodicità attuali. Gestita dal trigger subscriptions_piano_dal_trg. Serve al «primo anno» dello shooting del Max annuale.';
comment on column public.subscriptions.stripe_mancante_dal is
  'Quando la riconciliazione ha trovato l''abbonamento inesistente su Stripe. La riga NON viene declassata: è un segnale per il root. Si azzera alla prima sincronizzazione riuscita.';

-- Riempimento iniziale: per le righe esistenti la data migliore disponibile è
-- la creazione. Solo dove manca, quindi rieseguire non cambia nulla.
update public.subscriptions
   set piano_corrente_dal = created_at
 where piano_corrente_dal is null;

create or replace function public.subscriptions_piano_dal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.piano_corrente_dal := coalesce(new.piano_corrente_dal, now());
    return new;
  end if;

  if new.tier is distinct from old.tier
     or new.billing_interval is distinct from old.billing_interval then
    new.piano_corrente_dal := now();
  else
    new.piano_corrente_dal := coalesce(new.piano_corrente_dal, old.piano_corrente_dal, old.created_at);
  end if;

  -- Una sincronizzazione riuscita (il webhook e la riconciliazione scrivono
  -- sempre stripe_updated_at) dimostra che l'abbonamento esiste su Stripe.
  if new.stripe_updated_at is distinct from old.stripe_updated_at then
    new.stripe_mancante_dal := null;
  end if;
  return new;
end;
$$;

revoke all on function public.subscriptions_piano_dal() from public, anon, authenticated;

drop trigger if exists subscriptions_piano_dal_trg on public.subscriptions;
create trigger subscriptions_piano_dal_trg
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_piano_dal();

-- true solo la PRIMA volta che la riga viene annotata: l'avviso al root parte
-- una volta, non ogni notte.
create or replace function public.abbonamenti_segna_mancante(p_stripe_subscription_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuova boolean;
begin
  update public.subscriptions
     set stripe_mancante_dal = now()
   where stripe_subscription_id = p_stripe_subscription_id
     and stripe_mancante_dal is null
  returning true into v_nuova;
  return coalesce(v_nuova, false);
end;
$$;

revoke all on function public.abbonamenti_segna_mancante(text) from public, anon, authenticated;
grant execute on function public.abbonamenti_segna_mancante(text) to service_role;

-- Inizio del «primo anno» dello shooting: il primo momento in cui l'account
-- ha avuto un Max annuale. NULL se non l'ha mai avuto.
create or replace function public.abbonamento_shooting_dal(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(coalesce(s.piano_corrente_dal, s.created_at))
    from public.subscriptions s
   where s.user_id = p_user_id
     and s.tier = 'max'
     and s.billing_interval = 'year';
$$;

revoke all on function public.abbonamento_shooting_dal(uuid) from public, anon, authenticated;
grant execute on function public.abbonamento_shooting_dal(uuid) to service_role;

-- =========================================
-- 3. Ricalcolo dei piani e delle sospensioni, senza finestra temporale
-- =========================================
-- Account da ricalcolare:
--   a) almeno un profilo con la cache `tier` diversa da compute_artist_tier();
--   b) almeno un profilo con `plan_suspended` diverso da quanto impone il piano
--      dell'account (stessa regola di sync_account_profile_suspension, 0043:
--      si tengono i profili più vecchi). Copre anche i premi inviti, il cui
--      trigger (0078) ricalcola il tier ma non le sospensioni.
-- Per ciascuno: sync_account_tiers + sync_account_profile_suspension, cioè le
-- stesse funzioni dei trigger. Restituisce, per account, i profili sospesi e
-- quelli riattivati da questa esecuzione (confronto prima/dopo nella stessa
-- transazione). Al massimo p_limite account (1..1000) per chiamata.
create or replace function public.abbonamenti_ricalcola_piani(p_limite integer default 200)
returns table (
  account_id  uuid,
  piano_prima public.artist_tier_enum,
  piano_dopo  public.artist_tier_enum,
  sospesi     uuid[],
  riattivati  uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limite      integer := least(greatest(coalesce(p_limite, 200), 1), 1000);
  r             record;
  v_prima       uuid[];
  v_dopo        uuid[];
  v_piano_prima public.artist_tier_enum;
begin
  -- Profili non collegati ad alcun account: hanno solo il proprio omaggio.
  perform public.sync_artist_tier(a.id)
     from public.artists a
    where a.user_id is null
      and a.tier is distinct from public.compute_artist_tier(a.id);

  for r in
    with account as (
      select distinct a.user_id as uid
        from public.artists a
       where a.user_id is not null
    ),
    tetto as (
      select ac.uid, public.tier_artist_profiles_max(public.account_tier(ac.uid)) as massimo
        from account ac
    ),
    ordinati as (
      select a.user_id as uid,
             a.plan_suspended,
             row_number() over (partition by a.user_id order by a.created_at asc, a.id asc) as rn
        from public.artists a
       where a.user_id is not null
    ),
    da_ricalcolare as (
      select a.user_id as uid
        from public.artists a
       where a.user_id is not null
         and a.tier is distinct from public.compute_artist_tier(a.id)
      union
      select o.uid
        from ordinati o
        join tetto t on t.uid = o.uid
       where o.plan_suspended is distinct from (o.rn > t.massimo)
    )
    select d.uid from da_ricalcolare d
     order by d.uid
     limit v_limite
  loop
    select coalesce(array_agg(a.id order by a.id) filter (where a.plan_suspended), '{}'::uuid[]),
           max(a.tier)
      into v_prima, v_piano_prima
      from public.artists a
     where a.user_id = r.uid;

    perform public.sync_account_tiers(r.uid);
    perform public.sync_account_profile_suspension(r.uid);

    select coalesce(array_agg(a.id order by a.id) filter (where a.plan_suspended), '{}'::uuid[])
      into v_dopo
      from public.artists a
     where a.user_id = r.uid;

    account_id  := r.uid;
    piano_prima := v_piano_prima;
    piano_dopo  := public.account_tier(r.uid);
    sospesi     := array(select unnest(v_dopo) except select unnest(v_prima));
    riattivati  := array(select unnest(v_prima) except select unnest(v_dopo));
    return next;
  end loop;
end;
$$;

revoke all on function public.abbonamenti_ricalcola_piani(integer) from public, anon, authenticated;
grant execute on function public.abbonamenti_ricalcola_piani(integer) to service_role;
