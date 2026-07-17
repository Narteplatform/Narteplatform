-- =========================================
-- N'arte — L'abbonamento è dell'ACCOUNT, non del singolo artista
-- =========================================
-- Richiede 0038 → 0041.
--
-- Cambio di modello. 0039 aveva agganciato `subscriptions` all'artista
-- (un abbonamento = un profilo). La regola commerciale definitiva è diversa:
--
--   FREE  1 profilo artista
--   PRO   2 profili artista   (9,99€/mese  · 49,99€/anno)
--   MAX   5 profili artista   (99,99€/mese · 499,99€/anno)
--
-- e TUTTI i profili di un account ereditano il piano dell'account. MAX è di
-- fatto il piano agenzia: un manager paga una volta e i suoi 5 artisti sono
-- tutti in evidenza. Con lo schema di 0039 avrebbe dovuto pagare 5 volte.
--
-- Si può ristrutturare senza migrare dati: `subscriptions` e
-- `billing_customers` sono vuote (Stripe non è ancora collegata) e
-- `artists.user_id` non ha vincolo unique, quindi i profili multipli non
-- richiedono modifiche a `artists`.
--
-- Idempotente.

-- =========================================
-- subscriptions: da artist_id a user_id
-- =========================================
-- Il trigger vecchio ragiona su new.artist_id: va rimosso prima di toccare le
-- colonne, altrimenti fallisce al primo insert.
drop trigger if exists subscriptions_sync_tier_trg on public.subscriptions;

alter table public.subscriptions
  drop column if exists artist_id;

-- `user_id` esisteva già (nullable, come riferimento). Ora è LA chiave:
-- l'abbonamento appartiene all'account.
alter table public.subscriptions
  alter column user_id set not null;

-- on delete cascade: se l'account sparisce, il suo ledger non ha più senso.
-- 0039 lo aveva a `set null`, che con user_id NOT NULL è una contraddizione —
-- la cancellazione dell'utente fallirebbe.
alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_fkey;
alter table public.subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

drop index if exists public.subscriptions_artist_idx;
drop index if exists public.subscriptions_live_idx;

create index if not exists subscriptions_user_idx
  on public.subscriptions(user_id);

create index if not exists subscriptions_live_idx
  on public.subscriptions(user_id)
  where status in ('trialing', 'active', 'past_due');

drop policy if exists "subscriptions read own artist" on public.subscriptions;
drop policy if exists "subscriptions read self" on public.subscriptions;
create policy "subscriptions read self"
  on public.subscriptions for select
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));

-- =========================================
-- Fonte di verità del tier — versione per account
-- =========================================
-- Precedenza:
--   1. override manuale non scaduto SUL SINGOLO ARTISTA (omaggio del superadmin
--      a un profilo specifico: resta per-artista di proposito);
--   2. max(tier) fra le subscription live DELL'ACCOUNT PROPRIETARIO;
--   3. free.
--
-- `past_due` resta LIVE: Stripe ritenta il pagamento per giorni, e declassare
-- al primo tentativo fallito significherebbe punire un artista per una carta
-- scaduta che si risolve da sola.
create or replace function public.compute_artist_tier(p_artist_id uuid)
returns public.artist_tier_enum
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select a.tier_override
       from public.artists a
      where a.id = p_artist_id
        and a.tier_override is not null
        and (a.tier_override_expires_at is null or a.tier_override_expires_at > now())),
    (select max(s.tier)
       from public.subscriptions s
       join public.artists a on a.user_id = s.user_id
      where a.id = p_artist_id
        and s.status in ('trialing', 'active', 'past_due')),
    'free'::public.artist_tier_enum
  );
$$;

revoke all on function public.compute_artist_tier(uuid) from public, anon, authenticated;
grant execute on function public.compute_artist_tier(uuid) to service_role;

-- =========================================
-- Sync: una subscription tocca TUTTI i profili dell'account
-- =========================================
-- Differenza sostanziale rispetto a 0039: un solo evento Stripe può cambiare il
-- tier di 5 artisti insieme.
create or replace function public.sync_account_tiers(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select id from public.artists where user_id = p_user_id loop
    perform public.sync_artist_tier(r.id);
  end loop;
end;
$$;

revoke all on function public.sync_account_tiers(uuid) from public, anon, authenticated;
grant execute on function public.sync_account_tiers(uuid) to service_role;

create or replace function public.subscriptions_sync_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_account_tiers(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

create trigger subscriptions_sync_tier_trg
  after insert or update or delete on public.subscriptions
  for each row execute function public.subscriptions_sync_tier();

-- Un profilo artista appena creato (o riassegnato a un altro account) deve
-- ereditare subito il piano del proprietario, senza aspettare un evento Stripe.
create or replace function public.artists_inherit_account_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.sync_artist_tier(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists artists_inherit_account_tier_trg on public.artists;
create trigger artists_inherit_account_tier_trg
  after insert or update of user_id on public.artists
  for each row execute function public.artists_inherit_account_tier();

-- =========================================
-- Tetto di profili artista per account
-- =========================================
-- Duplicazione consapevole di `artistProfilesMax` in lib/billing/plans.ts.
-- Sta qui perché la creazione di un profilo ha una race che il solo check nella
-- Server Action non chiude: due submit concorrenti leggerebbero entrambi
-- "1 profilo su 2" e ne creerebbero 3. Recount e insert devono stare nella
-- stessa transazione.
create or replace function public.tier_artist_profiles_max(t public.artist_tier_enum)
returns int
language sql
immutable
as $$
  select case t
    when 'max'  then 5
    when 'pro'  then 2
    else 1
  end;
$$;

create or replace function public.account_tier(p_user_id uuid)
returns public.artist_tier_enum
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max(s.tier)
       from public.subscriptions s
      where s.user_id = p_user_id
        and s.status in ('trialing', 'active', 'past_due')),
    'free'::public.artist_tier_enum
  );
$$;

revoke all on function public.account_tier(uuid) from public, anon, authenticated;
grant execute on function public.account_tier(uuid) to service_role;

create or replace function public.artists_enforce_profile_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max   int;
  v_count int;
  v_tier  public.artist_tier_enum;
begin
  if new.user_id is null then
    return new; -- profilo creato dall'admin e non ancora collegato a un account
  end if;

  -- Serializza i concorrenti sullo stesso account: senza questo, due insert
  -- simultanei conterebbero entrambi lo stato pre-insert.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  v_tier := public.account_tier(new.user_id);
  v_max  := public.tier_artist_profiles_max(v_tier);

  select count(*) into v_count
    from public.artists
   where user_id = new.user_id;

  if v_count >= v_max then
    raise exception
      'Il piano % consente % profili artista: l''account ne ha già %.',
      upper(v_tier::text), v_max, v_count
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists artists_enforce_profile_quota_trg on public.artists;
create trigger artists_enforce_profile_quota_trg
  before insert on public.artists
  for each row execute function public.artists_enforce_profile_quota();

-- =========================================
-- Riallineamento
-- =========================================
do $$
declare
  r record;
begin
  for r in select id from public.artists loop
    perform public.sync_artist_tier(r.id);
  end loop;
end $$;

comment on table public.subscriptions is
  'Ledger degli abbonamenti Stripe, per ACCOUNT (user_id). Tutti i profili artista dell''account ereditano il piano. Scritto SOLO dal webhook (service role). artists.tier è la cache derivata, mantenuta da subscriptions_sync_tier_trg.';
comment on function public.tier_artist_profiles_max(public.artist_tier_enum) is
  'Tetto di profili artista per piano. Duplicato consapevole di artistProfilesMax in lib/billing/plans.ts: tenere allineati.';
