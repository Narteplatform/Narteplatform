-- =========================================
-- N'arte — Sospensione dei profili in eccesso al downgrade
-- =========================================
-- Richiede 0038 → 0042.
--
-- La falla che chiude. Il tetto sui profili artista (Free 1, Pro 2, Max 5) è
-- applicato da `artists_enforce_profile_quota_trg`, che è un trigger
-- BEFORE INSERT: si attiva solo quando un profilo viene creato. Il downgrade
-- non lo attraversa mai.
--
-- Risultato, oggi: un account paga Max un mese (99,99 €), crea 5 profili,
-- scende a Pro (9,99 €) e se li tiene tutti e cinque a vita. È lo stesso
-- arbitraggio dello shooting fotografico, e vale molto di più.
--
-- La chiusura non è cancellare: al downgrade i profili in eccesso vengono
-- SPUBBLICATI. Restano nel database e nella dashboard dell'artista, spariscono
-- dal sito. Il riabbonamento li rimette online all'istante. È la stessa logica
-- già applicata a foto, audio, video, percorso artistico e recensioni:
-- si nasconde, non si distrugge.
--
-- Idempotente.

-- =========================================
-- Stato di sospensione
-- =========================================
-- ⚠️  `plan_suspended` è DELIBERATAMENTE separato da `artists.status`.
--
--     `status` (pending|approved|rejected) è la decisione EDITORIALE del team
--     N'arte. `plan_suspended` è una faccenda di FATTURAZIONE. Sono due assi
--     ortogonali, e sovrapporli distruggerebbe informazione: se al downgrade
--     scrivessimo status='suspended', al riabbonamento non sapremmo se
--     ripristinare 'approved' (era pubblicato) o 'pending' (era ancora in
--     revisione). Tenendoli separati, il ripristino è esatto per costruzione.
alter table public.artists
  add column if not exists plan_suspended boolean not null default false,
  add column if not exists plan_suspended_at timestamptz;

comment on column public.artists.plan_suspended is
  'true = profilo oltre il tetto del piano dell''account: nascosto dal sito ma conservato. Ortogonale a `status`, che è la decisione editoriale del team. Gestito da sync_account_profile_suspension(), mai a mano.';

-- =========================================
-- Visibilità pubblica: UNA sola condizione
-- =========================================
-- Colonna generata invece di aggiungere `and not plan_suspended` in ogni query.
-- Oggi 8 call site decidono la visibilità con `status = 'approved'` (roster,
-- profilo pubblico, ricerca, StarsSection, /api/booking, /api/booking-request,
-- artisti/[slug]/_actions): dimenticarne uno significa lasciare online un
-- profilo sospeso, e nessun test lo noterebbe. Con `is_public` la regola esiste
-- in un posto solo, e un `.eq("status","approved")` isolato salta all'occhio.
alter table public.artists
  add column if not exists is_public boolean
  generated always as (status = 'approved' and not plan_suspended) stored;

comment on column public.artists.is_public is
  'Unica condizione di visibilità pubblica: approvato dal team E non sospeso dal piano. Colonna generata — filtrare su questa, mai su `status` da solo.';

-- =========================================
-- Sincronizzazione delle sospensioni
-- =========================================
-- Si tengono i profili PIÙ VECCHI e si sospendono i più recenti: il profilo
-- principale dell'artista — quello con cui è entrato in piattaforma, che ha lo
-- storico di booking e recensioni — non deve sparire mai per un downgrade.
create or replace function public.sync_account_profile_suspension(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
begin
  if p_user_id is null then
    return;
  end if;

  v_max := public.tier_artist_profiles_max(public.account_tier(p_user_id));

  with ranked as (
    select id, row_number() over (order by created_at asc, id asc) as rn
      from public.artists
     where user_id = p_user_id
  )
  update public.artists a
     set plan_suspended = (r.rn > v_max),
         plan_suspended_at = case
           when r.rn > v_max and not a.plan_suspended then now()
           when r.rn <= v_max then null
           else a.plan_suspended_at
         end
    from ranked r
   where a.id = r.id
     and a.plan_suspended is distinct from (r.rn > v_max);
end;
$$;

revoke all on function public.sync_account_profile_suspension(uuid) from public, anon, authenticated;
grant execute on function public.sync_account_profile_suspension(uuid) to service_role;

-- =========================================
-- Aggancio agli eventi che cambiano il piano
-- =========================================
-- Un evento Stripe cambia il tier dell'account: oltre a propagare il piano a
-- tutti i profili (0042), va ricalcolato quali di essi restano pubblici.
create or replace function public.subscriptions_sync_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  perform public.sync_account_tiers(v_user);
  perform public.sync_account_profile_suspension(v_user);
  return null;
end;
$$;

-- Creazione o riassegnazione di un profilo: il nuovo arrivato potrebbe essere
-- quello di troppo.
create or replace function public.artists_inherit_account_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.sync_artist_tier(new.id);
    perform public.sync_account_profile_suspension(new.user_id);
  end if;
  return null;
end;
$$;

-- Un override manuale del superadmin non cambia gli slot dell'account
-- (account_tier ignora gli override, vedi 0042), quindi non serve agganciare
-- artists_override_sync_trg: non può alterare il numero di profili ammessi.

-- =========================================
-- Indice e RLS
-- =========================================
drop index if exists public.artists_rank_idx;
create index if not exists artists_rank_idx
  on public.artists (tier desc, stage_name asc)
  where is_public;

drop policy if exists "artists public read approved" on public.artists;
create policy "artists public read approved"
  on public.artists for select
  using (is_public or auth.uid() = user_id);

-- =========================================
-- Riallineamento
-- =========================================
do $$
declare
  r record;
begin
  for r in select distinct user_id from public.artists where user_id is not null loop
    perform public.sync_account_profile_suspension(r.user_id);
  end loop;
end $$;
