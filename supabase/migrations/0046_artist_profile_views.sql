-- =========================================
-- N'arte — Visite al profilo pubblico
-- =========================================
-- Alimenta /dashboard/statistiche, la funzione esclusiva del piano Max.
--
-- INTERAMENTE ADDITIVA: crea un enum, una tabella nuova e due funzioni. Non
-- tocca nessuna tabella esistente, non crea indici su tabelle popolate, non
-- cancella e non riscrive nulla. Idempotente.
--
-- ⚠️  MODELLO PRIVACY — leggere prima di modificare qualunque cosa qui sotto.
--
--     Non si salvano IP, user-agent, user_id né cookie. Si salva un
--     `visitor_hash` = sha256(segreto || data Europe/Rome || IP || slug),
--     calcolato in Node (lib/analytics/visitor.ts) e mai trasmesso in chiaro.
--     Tre proprietà, tutte volute:
--
--       * non reversibile — senza il segreto l'IP non è ricostruibile;
--       * non correlabile FRA GIORNI — la data è dentro l'impasto, quindi lo
--         pseudonimo ruota ogni notte: non è un identificatore persistente e
--         per questo non richiede consenso cookie;
--       * non correlabile FRA ARTISTI — lo slug è dentro l'impasto, quindi non
--         si può ricostruire il percorso di navigazione di una persona.
--
--     Togliere la data o lo slug dall'hash farebbe crollare due di queste tre
--     proprietà in un colpo solo.
--
-- Deduplica: la PRIMARY KEY (artist_id, viewed_on, visitor_hash) rende la
-- seconda visita dello stesso visitatore nello stesso giorno un no-op. Il
-- numero mostrato è quindi "visitatori unici al giorno", non "pageview".

-- =========================================
-- 1. Chi guarda
-- =========================================
-- 'superadmin' NON è un valore ammesso: le visite del team vengono scartate in
-- scrittura, non archiviate con un'etichetta da ricordarsi di filtrare in ogni
-- query futura.
do $$ begin
  create type public.profile_view_viewer_kind as enum ('anon', 'user', 'artist', 'organizer');
exception when duplicate_object then null; end $$;

-- =========================================
-- 2. Tabella
-- =========================================
create table if not exists public.artist_profile_views (
  artist_id     uuid not null references public.artists(id) on delete cascade,
  viewed_on     date not null,
  visitor_hash  text not null,
  viewer_kind   public.profile_view_viewer_kind not null default 'anon',
  first_seen_at timestamptz not null default now(),
  constraint artist_profile_views_hash_len check (char_length(visitor_hash) = 64),
  primary key (artist_id, viewed_on, visitor_hash)
);

-- La PK è anche l'unico indice necessario: la colonna guida è artist_id e la
-- seconda è viewed_on, quindi `where artist_id = $1 and viewed_on > $2` è già
-- una range scan esatta. Un indice su (artist_id, viewed_on) sarebbe un
-- duplicato che costa a ogni scrittura e non serve a nessuna query.

comment on table public.artist_profile_views is
  'Una riga per (artista, giorno Europe/Rome, visitatore pseudonimo). Nessun IP, nessuno user_id, nessun cookie. Scritta SOLO da record_artist_profile_view().';
comment on column public.artist_profile_views.visitor_hash is
  'Pseudonimo giornaliero: sha256(segreto || data Rome || IP || slug). Ruota ogni giorno per costruzione: non è un identificatore persistente.';
comment on column public.artist_profile_views.viewer_kind is
  'Ruolo del visitatore AL MOMENTO della visita. È una fotografia storica: se un utente diventa organizzatore domani, le visite di ieri restano ''user''.';

-- =========================================
-- 3. RLS — chiusa, service_role soltanto
-- =========================================
alter table public.artist_profile_views enable row level security;

-- ⚠️  FALLISCE CHIUSO, ED È VOLUTO.
--     Doppio strato come in 0038: revoke dei privilegi + RLS senza policy.
--     Se un domani servisse una lettura client-side, NON basta aggiungere una
--     policy: serve anche un `grant select`. La tabella contiene pseudonimi di
--     visitatori e non deve uscire dal server nemmeno verso l'artista
--     proprietario — a lui servono gli AGGREGATI, che passano da
--     artist_view_stats().
revoke all on public.artist_profile_views from anon, authenticated;

-- =========================================
-- 4. Scrittura
-- =========================================
-- Un solo round-trip per visita: valida il profilo, applica le esclusioni e
-- inserisce. Prende lo SLUG e non l'id perché è ciò che il browser ha già
-- nell'URL: nessun id interno viaggia verso il client.
create or replace function public.record_artist_profile_view(
  p_slug           text,
  p_visitor_hash   text,
  p_viewer_kind    public.profile_view_viewer_kind,
  p_viewer_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_owner     uuid;
  v_inserted  integer;
begin
  if p_slug is null or p_visitor_hash is null or char_length(p_visitor_hash) <> 64 then
    return false;
  end if;

  -- `is_public` (0043) è l'unica condizione di visibilità: un profilo sospeso
  -- dal piano o non ancora approvato non è visitabile, quindi non è tracciabile.
  select a.id, a.user_id
    into v_artist_id, v_owner
    from public.artists a
   where a.slug = p_slug
     and a.is_public;
  if not found then
    return false;
  end if;

  if p_viewer_user_id is not null then
    -- Auto-visita. Il confronto è sull'ACCOUNT, non sul singolo profilo: con
    -- Max un manager ha fino a 5 schede e non deve gonfiare le statistiche
    -- delle proprie sorelle aprendole dal roster.
    if v_owner = p_viewer_user_id then
      return false;
    end if;
    -- Il team N'arte che sfoglia il roster non è pubblico.
    if public.is_superadmin(p_viewer_user_id) then
      return false;
    end if;
  end if;

  insert into public.artist_profile_views (artist_id, viewed_on, visitor_hash, viewer_kind)
  values (v_artist_id, (now() at time zone 'Europe/Rome')::date, p_visitor_hash, p_viewer_kind)
  on conflict (artist_id, viewed_on, visitor_hash) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

revoke all on function public.record_artist_profile_view(text, text, public.profile_view_viewer_kind, uuid)
  from public, anon, authenticated;
grant execute on function public.record_artist_profile_view(text, text, public.profile_view_viewer_kind, uuid)
  to service_role;

-- =========================================
-- 5. Lettura aggregata
-- =========================================
-- Serie giornaliera già SENZA BUCHI: generate_series riempie i giorni a zero,
-- così il grafico non deve indovinarli e "nessuna visita" si distingue da
-- "giorno mancante".
--
-- Perché NON una vista materializzata e NON una tabella di rollup:
--   * il costo reale è una range scan su PK per UN artista, e l'aggregato è al
--     massimo 365 righe. A 50 visitatori unici al giorno sono ~18k righe l'anno
--     per artista: qualche millisecondo;
--   * una matview va rinfrescata, e su questo progetto pg_cron non è abilitato
--     (andrebbe attivato a mano sul DB di PRODUZIONE — un pezzo mobile in più
--     per un guadagno nullo);
--   * un rollup mantenuto da trigger aggiunge un trigger scrivente su un
--     percorso caldo, cioè esattamente ciò che qui si vuole evitare.
-- Se un giorno un artista superasse il mezzo milione di righe, il rollup si
-- aggiunge senza cambiare questa firma: cambia solo il corpo. È la ragione per
-- cui la pagina chiama una funzione e non una query inline.
create or replace function public.artist_view_stats(
  p_artist_id uuid,
  p_days      integer
)
returns table (
  day             date,
  organizer_views integer,
  other_views     integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      (now() at time zone 'Europe/Rome')::date        as today,
      -- Clamp: seconda difesa dopo il gate di piano applicativo. Anche se un
      -- giorno la pagina passasse p_days da querystring, il DB non
      -- restituirebbe mai più di 400 giorni.
      least(greatest(coalesce(p_days, 30), 1), 400)   as span
  ),
  agg as (
    select
      v.viewed_on,
      count(*) filter (where v.viewer_kind =  'organizer')::int as organizer_views,
      count(*) filter (where v.viewer_kind <> 'organizer')::int as other_views
    from public.artist_profile_views v, bounds b
    where v.artist_id = p_artist_id
      and v.viewed_on > b.today - b.span
    group by v.viewed_on
  )
  select
    d::date                        as day,
    coalesce(a.organizer_views, 0) as organizer_views,
    coalesce(a.other_views, 0)     as other_views
  from bounds b
  cross join lateral generate_series(b.today - (b.span - 1), b.today, interval '1 day') d
  left join agg a on a.viewed_on = d::date
  order by day;
$$;

revoke all on function public.artist_view_stats(uuid, integer) from public, anon, authenticated;
grant execute on function public.artist_view_stats(uuid, integer) to service_role;
