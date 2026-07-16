-- =========================================
-- N'arte — Ledger abbonamenti Stripe (artisti)
-- =========================================
-- Richiede 0038_artists_column_hardening.sql (colonne tier_override,
-- compute_artist_tier, sync_artist_tier, trigger di guardia). Applicare in ordine.
--
-- Modello: `subscriptions` è il LEDGER (fatti provenienti da Stripe).
-- `artists.tier` è una CACHE DERIVATA, mantenuta dal trigger qui sotto.
-- Il webhook non scrive mai su `artists`: scrive il fatto, e il tier si allinea.
--
-- Perché una cache e non un JOIN: artists.tier è già letto da 6 call site e
-- deve restare filtrabile e ORDINABILE in SQL — il ranking per piano è
-- `order by tier desc` sul roster pubblico. Un JOIN su subscriptions a ogni
-- lettura del roster sarebbe una regressione gratuita.
--
-- Idempotente.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status_enum') then
    -- Ricalca 1:1 gli stati di Stripe: nessuna traduzione, nessuna perdita.
    create type public.subscription_status_enum as enum (
      'trialing', 'active', 'past_due', 'canceled',
      'incomplete', 'incomplete_expired', 'unpaid', 'paused'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'billing_interval_enum') then
    create type public.billing_interval_enum as enum ('month', 'year');
  end if;
end $$;

-- =========================================
-- Customer Stripe
-- =========================================
-- Tabella separata da `subscriptions` di proposito: il Customer sopravvive alla
-- cancellazione dell'abbonamento. Se lo si ricavasse dalla subscription, un
-- artista che disdice e si riabbona genererebbe un secondo Customer — e le sue
-- fatture finirebbero divise su due anagrafiche nel portale Stripe.
create table if not exists public.billing_customers (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);

alter table public.billing_customers enable row level security;

drop policy if exists "billing customers read self" on public.billing_customers;
create policy "billing customers read self"
  on public.billing_customers for select
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));
-- Nessuna policy di scrittura: solo service role (webhook + checkout action).

-- =========================================
-- Ledger abbonamenti
-- =========================================
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  artist_id              uuid not null references public.artists(id) on delete cascade,
  user_id                uuid references auth.users(id) on delete set null,
  stripe_customer_id     text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id        text not null,
  tier                   public.artist_tier_enum not null,
  billing_interval       public.billing_interval_enum not null,
  status                 public.subscription_status_enum not null,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  canceled_at            timestamptz,
  trial_end              timestamptz,
  -- Guardia secondaria contro gli eventi fuori ordine. La difesa primaria è
  -- che il webhook rilegge sempre lo stato da Stripe (subscriptions.retrieve)
  -- invece di fidarsi del payload.
  stripe_updated_at      timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint subscriptions_tier_not_free check (tier <> 'free')
);

-- NIENTE `unique (artist_id)`, deliberatamente.
-- Un unique farebbe fallire l'upsert del webhook nel caso di doppio checkout o
-- di re-subscribe dopo cancellazione — e un webhook che risponde 500 in loop è
-- molto peggio di due righe da riconciliare a mano. Questa è un ledger: due
-- fatti possono coesistere. compute_artist_tier() prende il max fra le live, e
-- il doppio checkout si previene a monte in createCheckoutSession().
create index if not exists subscriptions_artist_idx
  on public.subscriptions(artist_id);

create index if not exists subscriptions_live_idx
  on public.subscriptions(artist_id)
  where status in ('trialing', 'active', 'past_due');

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions read own artist" on public.subscriptions;
create policy "subscriptions read own artist"
  on public.subscriptions for select
  using (
    exists (select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );
-- Nessuna policy di scrittura: il ledger lo scrive solo il webhook (service role).

-- =========================================
-- Idempotenza webhook
-- =========================================
create table if not exists public.stripe_webhook_events (
  id           text primary key,          -- evt_... di Stripe
  type         text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,               -- NULL = ricevuto ma non completato
  error        text
);

-- Coda dei falliti, ripresa dal cron di riconciliazione.
create index if not exists stripe_webhook_events_unprocessed_idx
  on public.stripe_webhook_events(received_at)
  where processed_at is null;

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "webhook events superadmin read" on public.stripe_webhook_events;
create policy "webhook events superadmin read"
  on public.stripe_webhook_events for select
  using (public.is_superadmin(auth.uid()));

-- =========================================
-- Fonte di verità del tier — versione completa
-- =========================================
-- Ridefinisce la funzione di 0038 aggiungendo le subscription. È l'UNICO posto
-- dove si decide il piano di un artista.
--
-- Precedenza:
--   1. override manuale non scaduto  (omaggio/partnership del superadmin)
--   2. max(tier) fra le subscription LIVE
--   3. free
--
-- `past_due` è deliberatamente LIVE: Stripe ritenta il pagamento per giorni, e
-- spegnere il piano al primo tentativo fallito significherebbe declassare un
-- artista per una carta scaduta che si risolve da sola. La cancellazione vera
-- arriva come `customer.subscription.deleted`.
--
-- `max()` sull'enum sfrutta l'ordine di dichiarazione ('free','pro','max') e
-- risolve il caso patologico delle due subscription live: vince la più alta,
-- l'artista non viene danneggiato, e il drift lo segnala il cron.
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
      where s.artist_id = p_artist_id
        and s.status in ('trialing', 'active', 'past_due')),
    'free'::public.artist_tier_enum
  );
$$;

revoke all on function public.compute_artist_tier(uuid) from public, anon, authenticated;
grant execute on function public.compute_artist_tier(uuid) to service_role;

-- =========================================
-- Sync automatico della cache
-- =========================================
create or replace function public.subscriptions_sync_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_artist_tier(coalesce(new.artist_id, old.artist_id));
  return null;
end;
$$;

drop trigger if exists subscriptions_sync_tier_trg on public.subscriptions;
create trigger subscriptions_sync_tier_trg
  after insert or update or delete on public.subscriptions
  for each row execute function public.subscriptions_sync_tier();

-- updated_at
create or replace function public.subscriptions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at_trg on public.subscriptions;
create trigger subscriptions_touch_updated_at_trg
  before update on public.subscriptions
  for each row execute function public.subscriptions_touch_updated_at();

-- =========================================
-- Riallineamento una tantum
-- =========================================
-- Non ci sono ancora subscription, ma questo rende la cache coerente con la
-- nuova compute_artist_tier() e serve da rete se 0038 fosse stata applicata
-- parzialmente.
do $$
declare
  r record;
begin
  for r in select id from public.artists loop
    perform public.sync_artist_tier(r.id);
  end loop;
end $$;

comment on table public.subscriptions is
  'Ledger degli abbonamenti Stripe. Fonte di verità del piano insieme a artists.tier_override. Scritto SOLO dal webhook (service role). artists.tier è la cache derivata, mantenuta dal trigger subscriptions_sync_tier_trg.';
comment on table public.stripe_webhook_events is
  'Log di idempotenza dei webhook Stripe. processed_at NULL = ricevuto ma non completato (crash a metà): il cron di riconciliazione lo riprende.';
