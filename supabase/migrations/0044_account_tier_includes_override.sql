-- 0044 — Il piano è UNO SOLO per account, omaggi inclusi.
--
-- Problema risolto: fino a 0043 esistevano due verità sul piano di un artista.
--   • `artists.tier` (badge in topbar, gating di galleria/audio/chat/percorso)
--     derivava da compute_artist_tier(), che INCLUDE l'omaggio del superadmin
--     (`artists.tier_override`).
--   • `account_tier()` (pagina Abbonamento, quota profili) guardava SOLO le
--     subscription Stripe e ignorava deliberatamente gli omaggi.
-- Un artista con omaggio MAX vedeva quindi il badge MAX, la scritta "N'arte
-- Free" nell'abbonamento e un solo slot profilo: un piano che non sblocca nulla.
--
-- Scelta: l'omaggio vale per l'ACCOUNT, esattamente come un abbonamento pagato.
-- Questo INVERTE la decisione documentata in 0042 ("un omaggio su un profilo non
-- dà all'account il diritto di crearne altri"). La ragione del cambio è che
-- quella regola produceva una UI che si contraddice da sola, e il caso d'uso
-- reale dell'omaggio è "regalare il piano a questa persona", non "sbloccare una
-- singola scheda".
--
-- Conseguenza voluta: un omaggio Pro su un profilo dà all'account gli slot
-- profilo di Pro, e TUTTI i profili dell'account ereditano il tier.
--
-- Idempotente.

-- =========================================
-- account_tier: subscription live OPPURE omaggio attivo, il maggiore dei due
-- =========================================
-- greatest() in Postgres ignora i NULL e torna NULL solo se lo sono tutti:
-- il coalesce esterno copre quel caso. L'enum è ordinato free < pro < max,
-- quindi max()/greatest() confrontano i piani nel verso giusto.
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
          and s.status in ('trialing', 'active', 'past_due'))
    ),
    'free'::public.artist_tier_enum
  );
$$;

revoke all on function public.account_tier(uuid) from public, anon, authenticated;
grant execute on function public.account_tier(uuid) to service_role;

-- =========================================
-- compute_artist_tier: il profilo eredita il piano dell'account
-- =========================================
-- Prima leggeva l'override del SOLO profilo corrente, quindi un omaggio su un
-- profilo lasciava i fratelli a free. Ora un profilo collegato a un account vale
-- quanto l'account (che a sua volta già include l'omaggio, vedi sopra).
--
-- Il ramo `user_id is null` copre i profili creati dall'admin e non ancora
-- collegati a un utente: per loro l'unica fonte possibile è il proprio override.
create or replace function public.compute_artist_tier(p_artist_id uuid)
returns public.artist_tier_enum
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
       when a.user_id is not null then public.account_tier(a.user_id)
       when a.tier_override is not null
            and (a.tier_override_expires_at is null or a.tier_override_expires_at > now())
         then a.tier_override
       else 'free'::public.artist_tier_enum
     end
     from public.artists a
    where a.id = p_artist_id),
    'free'::public.artist_tier_enum
  );
$$;

revoke all on function public.compute_artist_tier(uuid) from public, anon, authenticated;
grant execute on function public.compute_artist_tier(uuid) to service_role;

-- =========================================
-- Propagazione dell'omaggio
-- =========================================
-- Annulla e sostituisce il commento di 0043 ("un override manuale non cambia
-- gli slot dell'account, non serve agganciare artists_override_sync_trg"): ora
-- li cambia, quindi il trigger serve eccome.
--
-- Nessuna ricorsione: questo trigger è `update of tier_override,
-- tier_override_expires_at`, mentre le funzioni chiamate scrivono `tier` e
-- `plan_suspended`. Anche artists_inherit_account_tier_trg (0042) è ristretto a
-- `update of user_id`, quindi non si riarma.
create or replace function public.artists_override_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.sync_account_tiers(new.user_id);
    perform public.sync_account_profile_suspension(new.user_id);
  else
    perform public.sync_artist_tier(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists artists_override_sync_trg on public.artists;
create trigger artists_override_sync_trg
  after update of tier_override, tier_override_expires_at on public.artists
  for each row execute function public.artists_override_sync();

-- admin_set_artist_tier scriveva la causa e poi sincronizzava il solo profilo
-- toccato. Ora la propagazione all'account è responsabilità del trigger qui
-- sopra; alla funzione resta il compito di scrivere l'override e restituire il
-- tier risultante.
create or replace function public.admin_set_artist_tier(
  p_artist_id  uuid,
  p_tier       public.artist_tier_enum,
  p_expires_at timestamptz default null,
  p_reason     text default null
)
returns public.artist_tier_enum
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.artists where id = p_artist_id;
  if not found then
    raise exception 'Artista non trovato' using errcode = 'P0002';
  end if;

  -- 'free' come override significa "nessuna concessione", non "declassa":
  -- se l'account ha una subscription Stripe attiva quella continua a valere.
  -- Per togliere davvero un piano pagato si cancella la subscription su Stripe.
  if p_tier = 'free' then
    update public.artists
       set tier_override = null,
           tier_override_expires_at = null,
           tier_override_reason = null
     where id = p_artist_id;
  else
    update public.artists
       set tier_override = p_tier,
           tier_override_expires_at = p_expires_at,
           tier_override_reason = p_reason
     where id = p_artist_id;
  end if;

  -- Il trigger artists_override_sync_trg ha già riallineato tier e sospensioni
  -- di tutto l'account: qui si legge solo il risultato.
  return public.compute_artist_tier(p_artist_id);
end;
$$;

revoke all on function public.admin_set_artist_tier(uuid, public.artist_tier_enum, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_artist_tier(uuid, public.artist_tier_enum, timestamptz, text)
  to service_role;

-- =========================================
-- Riallineamento
-- =========================================
-- Sistema gli account già esistenti con un omaggio attivo: senza questo, il
-- disallineamento resterebbe finché qualcuno non tocca l'override.
do $$
declare
  r record;
begin
  for r in select distinct user_id from public.artists where user_id is not null loop
    perform public.sync_account_tiers(r.user_id);
    perform public.sync_account_profile_suspension(r.user_id);
  end loop;

  -- Profili non collegati ad alcun account: hanno solo il proprio override.
  for r in select id from public.artists where user_id is null loop
    perform public.sync_artist_tier(r.id);
  end loop;
end $$;
