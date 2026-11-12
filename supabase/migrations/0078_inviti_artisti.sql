-- 0078 — Programma «Invita un artista»
--
-- CONTESTO
-- Ogni account artista ha un link personale da condividere. Se un artista
-- arrivato da quel link viene approvato e PAGA un abbonamento, chi l'ha
-- invitato riceve 1 mese di Pro, cumulabile fino a 12 premi per anno solare:
--   - chi è Free riceve 30 giorni di Pro, che si accodano ai precedenti;
--   - chi ha già un abbonamento vivo riceve un credito Stripe di 9,99 €
--     (un mese di Pro), scalato dalle fatture successive.
-- Il premio si conferma 14 giorni dopo il primo pagamento reale (oltre la
-- finestra di recesso), se nel frattempo non c'è stato recesso o rimborso.
--
-- Il percorso, perché l'artista non si registra da solo:
--   /invito/{codice} → candidatura (artist_applications.invite_code)
--   → approvazione dell'admin (artist_invites.invitee_user_id)
--   → primo invoice.paid con importo > 0 (in_attesa)
--   → cron /api/cron/inviti (confermato | annullato | oltre_limite)
--
-- Perché un registro nuovo e non `artists.tier_override`: l'omaggio è un
-- singolo valore per profilo, non si accumula e non si somma a un abbonamento
-- pagato. Il premio inviti è un'altra cosa e all'artista si mostra come tale.
--
-- Cosa fa:
--   - invite_codes: un codice per account.
--   - artist_applications.invite_code: il codice usato in candidatura.
--   - artist_invites: un invito per candidatura / per account invitato.
--   - invite_rewards: registro dei premi (giorni di Pro o credito Stripe).
--   - account_tier(): considera anche i giorni di Pro dei premi attivi.
--   - trigger su invite_rewards → ricalcolo del piano dell'account.
--   - inviti_assegna_giorni_pro(): accoda 30 giorni in modo atomico.
--   - inviti_sync_scaduti(): ricalcola gli account con un premio (o un
--     omaggio) scaduto da poco, perché la cache artists.tier non scade da sola.
--
-- Additiva e idempotente: rieseguirla non cambia nulla. Non modifica né
-- cancella righe esistenti. Indipendente dalle altre (richiede solo 0044).
-- Tutte le tabelle nuove sono lette e scritte SOLO dal server con la service
-- role: RLS attiva e nessun privilegio ad anon/authenticated.

-- =========================================
-- 1. Codici d'invito (uno per account)
-- =========================================
create table if not exists public.invite_codes (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  code         text not null unique
                 check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(code) between 4 and 48),
  created_at   timestamptz not null default now(),
  disabled_at  timestamptz
);

comment on table public.invite_codes is
  'Codice del link «Invita un artista» (/invito/{code}), uno per account.';

alter table public.invite_codes enable row level security;
revoke all on table public.invite_codes from anon, authenticated;

-- =========================================
-- 2. Codice sulla candidatura
-- =========================================
alter table public.artist_applications
  add column if not exists invite_code text;

-- =========================================
-- 3. Inviti
-- =========================================
create table if not exists public.artist_invites (
  id                  uuid primary key default gen_random_uuid(),
  inviter_user_id     uuid not null references auth.users(id) on delete cascade,
  -- La candidatura non approvata viene cancellata dalla retention: l'invito
  -- in stato `candidatura` se ne va con lei (vedi on delete cascade).
  application_id      uuid unique references public.artist_applications(id) on delete cascade,
  -- Un account può essere invitato una sola volta.
  invitee_user_id     uuid unique references auth.users(id) on delete set null,
  -- Nome d'arte al momento della candidatura: l'unico dato dell'invitato che
  -- chi invita vede, insieme allo stato.
  invitee_stage_name  text not null check (char_length(invitee_stage_name) between 1 and 200),
  status              text not null default 'candidatura'
                        check (status in ('candidatura', 'approvato', 'in_attesa',
                                          'confermato', 'annullato', 'oltre_limite')),
  stripe_invoice_id   text,
  paid_at             timestamptz,
  confirm_after       timestamptz,
  confirmed_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists artist_invites_inviter_idx
  on public.artist_invites (inviter_user_id, created_at desc);

create index if not exists artist_invites_attesa_idx
  on public.artist_invites (confirm_after)
  where status = 'in_attesa';

comment on table public.artist_invites is
  'Inviti «Invita un artista»: candidatura → approvato → in_attesa (primo pagamento) → confermato/annullato/oltre_limite.';

alter table public.artist_invites enable row level security;
revoke all on table public.artist_invites from anon, authenticated;

-- =========================================
-- 4. Premi
-- =========================================
create table if not exists public.invite_rewards (
  id                        uuid primary key default gen_random_uuid(),
  -- Un premio per invito: il vincolo unico è la garanzia contro i doppioni.
  invite_id                 uuid not null unique references public.artist_invites(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  kind                      text not null check (kind in ('giorni_pro', 'credito_stripe')),
  -- giorni_pro: periodo di Pro. Si accoda all'ultimo premio dell'account.
  pro_from                  timestamptz,
  pro_until                 timestamptz,
  -- credito_stripe: importo accreditato sul saldo del cliente Stripe.
  amount_cents              integer check (amount_cents is null or amount_cents > 0),
  stripe_balance_txn_id     text,
  -- Giorni non goduti convertiti in credito quando l'account si abbona.
  converted_at              timestamptz,
  converted_cents           integer check (converted_cents is null or converted_cents >= 0),
  converted_balance_txn_id  text,
  created_at                timestamptz not null default now(),
  check (kind <> 'giorni_pro' or (pro_from is not null and pro_until is not null and pro_until >= pro_from)),
  check (kind <> 'credito_stripe' or amount_cents is not null)
);

create index if not exists invite_rewards_user_idx
  on public.invite_rewards (user_id, created_at desc);

create index if not exists invite_rewards_pro_idx
  on public.invite_rewards (user_id, pro_until)
  where kind = 'giorni_pro';

comment on table public.invite_rewards is
  'Premi «Invita un artista»: 30 giorni di Pro (Free) o 9,99 € di credito Stripe (abbonati). Max 12 per anno solare.';

alter table public.invite_rewards enable row level security;
revoke all on table public.invite_rewards from anon, authenticated;

-- =========================================
-- 5. account_tier: subscription, omaggio OPPURE premio inviti
-- =========================================
-- Identica alla 0044 con un terzo termine. greatest() tiene il piano più alto:
-- un premio Pro non abbassa mai un Max pagato o un omaggio Max.
create or replace function public.account_tier(p_user_id uuid)
returns public.artist_tier_enum
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    greatest(
      (select max(a.tier_override)
         from public.artists a
        where a.user_id = p_user_id
          and a.tier_override is not null
          and (a.tier_override_expires_at is null or a.tier_override_expires_at > now())),
      (select max(s.tier)
         from public.subscriptions s
        where s.user_id = p_user_id
          and s.status in ('trialing', 'active', 'past_due')),
      (select 'pro'::public.artist_tier_enum
        where exists (
          select 1 from public.invite_rewards r
           where r.user_id = p_user_id
             and r.kind = 'giorni_pro'
             and r.pro_from <= now()
             and r.pro_until > now()))
    ),
    'free'::public.artist_tier_enum
  );
$$;

revoke all on function public.account_tier(uuid) from public, anon, authenticated;
grant execute on function public.account_tier(uuid) to service_role;

-- =========================================
-- 6. Ricalcolo del piano quando cambia un premio
-- =========================================
create or replace function public.invite_rewards_sync_tier()
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

revoke all on function public.invite_rewards_sync_tier() from public, anon, authenticated;

drop trigger if exists invite_rewards_sync_tier_trg on public.invite_rewards;
create trigger invite_rewards_sync_tier_trg
  after insert or update of pro_from, pro_until or delete on public.invite_rewards
  for each row execute function public.invite_rewards_sync_tier();

-- =========================================
-- 7. Accodare 30 giorni di Pro in modo atomico
-- =========================================
-- Il periodo parte dalla fine dell'ultimo premio dell'account, o da adesso se
-- è già finito: così i mesi si sommano anche se arrivano tutti insieme. Il
-- lock per account evita che due conferme parallele calcolino lo stesso inizio.
-- Idempotente: se l'invito ha già un premio, restituisce quello.
create or replace function public.inviti_assegna_giorni_pro(
  p_invite_id uuid,
  p_user_id   uuid,
  p_giorni    integer
)
returns public.invite_rewards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_esistente public.invite_rewards;
  v_inizio    timestamptz;
  v_riga      public.invite_rewards;
begin
  if p_giorni is null or p_giorni < 1 or p_giorni > 366 then
    raise exception 'giorni non validi: %', p_giorni;
  end if;

  perform pg_advisory_xact_lock(hashtext('invite_rewards:' || p_user_id::text));

  select * into v_esistente from public.invite_rewards where invite_id = p_invite_id;
  if found then
    return v_esistente;
  end if;

  select greatest(now(), coalesce(max(r.pro_until), now()))
    into v_inizio
    from public.invite_rewards r
   where r.user_id = p_user_id
     and r.kind = 'giorni_pro';

  insert into public.invite_rewards (invite_id, user_id, kind, pro_from, pro_until)
  values (p_invite_id, p_user_id, 'giorni_pro', v_inizio, v_inizio + make_interval(days => p_giorni))
  returning * into v_riga;

  return v_riga;
end;
$$;

revoke all on function public.inviti_assegna_giorni_pro(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.inviti_assegna_giorni_pro(uuid, uuid, integer) to service_role;

-- =========================================
-- 8. Piani scaduti da poco: ricalcolo della cache
-- =========================================
-- artists.tier è una cache che i trigger aggiornano quando cambia un dato, non
-- quando passa il tempo. Un premio (o un omaggio) che scade lascerebbe il
-- piano alto fino alla prossima modifica: il cron giornaliero chiama questa
-- funzione per gli account con una scadenza nelle ultime 48 ore.
-- Restituisce il numero di account ricalcolati.
create or replace function public.inviti_sync_scaduti()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select distinct user_id from (
      select ir.user_id
        from public.invite_rewards ir
       where ir.kind = 'giorni_pro'
         and ir.pro_until <= now()
         and ir.pro_until > now() - interval '48 hours'
      union
      select a.user_id
        from public.artists a
       where a.user_id is not null
         and a.tier_override_expires_at is not null
         and a.tier_override_expires_at <= now()
         and a.tier_override_expires_at > now() - interval '48 hours'
    ) t
  loop
    perform public.sync_account_tiers(r.user_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.inviti_sync_scaduti() from public, anon, authenticated;
grant execute on function public.inviti_sync_scaduti() to service_role;
