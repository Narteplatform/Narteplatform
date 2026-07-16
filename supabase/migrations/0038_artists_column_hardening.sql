-- =========================================
-- N'arte — Hardening delle colonne privilegiate di artists
-- =========================================
-- FIX DI SICUREZZA. Da applicare PRIMA di qualunque migration billing.
--
-- Il buco: 0001_init.sql definisce
--     create policy "artists update self"
--       on public.artists for update using (auth.uid() = user_id);
-- e nessuna migration revoca l'UPDATE a `authenticated` (Supabase lo concede
-- di default su tutto lo schema public). Ma **RLS è row-level, non
-- column-level**: la policy decide QUALE RIGA puoi toccare, non QUALI COLONNE.
--
-- Conseguenza, oggi in produzione: un artista con la anon key (che è pubblica,
-- NEXT_PUBLIC_*) e il proprio JWT può fare
--     PATCH /rest/v1/artists?id=eq.<suo_id>   {"tier":"max"}
--     PATCH /rest/v1/artists?id=eq.<suo_id>   {"status":"approved"}
-- e auto-promuoversi. Il gate in updateArtistTier() non c'entra nulla: le
-- Server Actions e PostgREST sono due porte d'ingresso parallele, e questa
-- non passa dalla prima. Finché il tier era un'etichetta manuale era un
-- fastidio; quando il tier vale un abbonamento, è la piattaforma gratis.
--
-- Difesa a due strati:
--   1. REVOKE dei privilegi di scrittura → chiude la porta PostgREST.
--   2. Trigger di guardia su `tier` → chiude l'errore interno (il service role
--      bypassa RLS ma NON i trigger).
--
-- Idempotente.

-- =========================================
-- Strato 1 — Privilegi di tabella
-- =========================================
-- Verificato call-site per call-site: OGNI scrittura su artists passa già da
-- createAdminClient() (service role), che ignora questi grant.
--   - app/(admin)/admin/artisti/_actions.ts
--   - app/(artist)/dashboard/_actions.ts     (13 mutazioni, tutte admin client)
--   - app/(user)/artisti/[slug]/_actions.ts
--   - app/api/upload/video/route.ts
-- Il ruolo `authenticated` non ha quindi alcun bisogno di scrivere su artists.
--
-- ⚠️  QUESTO FALLISCE CHIUSO. Se un domani servisse una scrittura client-side
--     su artists, NON basta aggiungere una policy RLS: serve una grant di
--     colonna esplicita, es.
--         grant update (bio, city) on public.artists to authenticated;
--     Nota Postgres: `grant update` a livello di tabella implica TUTTE le
--     colonne e non è revocabile per singola colonna — per questo qui si
--     revoca l'UPDATE di tabella intero e si riconcede per colonna.
--
-- `select` NON viene toccato: le policy di lettura di 0001/0003 continuano a
-- filtrare (status='approved' or auth.uid()=user_id).
revoke insert, update, delete on public.artists from anon, authenticated;

-- =========================================
-- Colonne override
-- =========================================
-- Il superadmin non "imposta il tier": concede un OVERRIDE (omaggio, comp,
-- partnership). Distinzione non cosmetica — vedi admin_set_artist_tier().
alter table public.artists
  add column if not exists tier_override public.artist_tier_enum,
  add column if not exists tier_override_expires_at timestamptz,
  add column if not exists tier_override_reason text;

comment on column public.artists.tier_override is
  'Concessione manuale del superadmin (omaggio/partnership). Ha precedenza sulle subscription Stripe. NULL = nessun override.';
comment on column public.artists.tier_override_expires_at is
  'Scadenza dell''override. NULL = non scade. Oltre questa data compute_artist_tier() lo ignora.';
comment on column public.artists.tier is
  'CACHE DERIVATA — non scrivere direttamente. Fonte di verità: compute_artist_tier() = coalesce(override valido, max(subscription live), free). Mantenuta da sync_artist_tier() via trigger.';

-- Backfill: i tier non-free che esistono oggi sono stati concessi a mano dal
-- superadmin, quindi sono override per definizione. Senza questo passaggio il
-- primo sync li azzererebbe tutti a 'free'.
-- Gira PRIMA della creazione dei trigger, e tocca solo tier_override → non
-- fa scattare la guardia (che è `before update of tier`).
update public.artists
   set tier_override = tier,
       tier_override_reason = coalesce(tier_override_reason, 'Migrazione 0038: tier manuale pre-Stripe')
 where tier <> 'free'
   and tier_override is null;

-- =========================================
-- Fonte di verità del tier
-- =========================================
-- In 0038 conosce solo l'override: la tabella `subscriptions` non esiste
-- ancora. 0039_billing_stripe.sql la RIDEFINISCE (create or replace)
-- aggiungendo il max() sulle subscription live. Tenere le due versioni
-- allineate: questa è l'unica funzione che decide il tier di un artista.
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
    'free'::public.artist_tier_enum
  );
$$;

-- Unico scrittore legittimo di artists.tier.
create or replace function public.sync_artist_tier(p_artist_id uuid)
returns public.artist_tier_enum
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.artist_tier_enum;
begin
  v_tier := public.compute_artist_tier(p_artist_id);

  -- GUC transaction-local: è la chiave che apre la guardia. Una PATCH
  -- PostgREST non può impostarlo (non controlla la transazione), quindi la
  -- superficie di scrittura su `tier` è chiusa per costruzione.
  perform set_config('app.privileged_write', 'on', true);

  update public.artists
     set tier = v_tier
   where id = p_artist_id
     and tier is distinct from v_tier;

  perform set_config('app.privileged_write', 'off', true);
  return v_tier;
end;
$$;

-- =========================================
-- Strato 2 — Trigger di guardia
-- =========================================
-- Guardia SOLO su `tier`, deliberatamente non su `status`:
--   - `tier` ha un unico scrittore legittimo (sync_artist_tier) e vale denaro
--     → un `.update({tier})` scritto per errore da un dev deve esplodere.
--   - `status` ha scrittori legittimi multipli (updateArtistStatus,
--     approveApplication, rejectApplication) → guardarlo significherebbe
--     rifattorizzare tre flussi per zero guadagno: il vettore esterno su
--     `status` è già chiuso dalla revoke dello Strato 1.
--
-- `before update of tier` scatta quando la colonna è MENZIONATA nell'UPDATE,
-- anche se il valore non cambia: per questo il raise è condizionato a
-- `is distinct from`. Verificato che artistSchema non contiene `tier`, quindi
-- updateArtist() non passa di qui.
create or replace function public.artists_guard_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tier is distinct from old.tier
     and coalesce(current_setting('app.privileged_write', true), 'off') <> 'on' then
    raise exception
      'artists.tier è una cache derivata e non è scrivibile direttamente. Per una concessione manuale usare public.admin_set_artist_tier(artist_id, tier, expires_at, reason); per un abbonamento, scrivere sul ledger public.subscriptions (il tier si sincronizza da solo via trigger).'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists artists_guard_privileged_columns_trg on public.artists;
create trigger artists_guard_privileged_columns_trg
  before update of tier on public.artists
  for each row execute function public.artists_guard_privileged_columns();

-- =========================================
-- Override manuale del superadmin
-- =========================================
-- Sostituisce il vecchio `admin.from("artists").update({tier})`, che era anche
-- semanticamente sbagliato: scriveva la cache, quindi il primo webhook Stripe
-- successivo avrebbe silenziosamente cancellato l'omaggio. Qui si scrive la
-- CAUSA (l'override), e la cache si ricalcola da sé.
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
  v_tier public.artist_tier_enum;
begin
  if not exists (select 1 from public.artists where id = p_artist_id) then
    raise exception 'Artista non trovato' using errcode = 'P0002';
  end if;

  -- 'free' come override significa "nessuna concessione", non "declassa":
  -- se l'artista ha una subscription Stripe attiva quella continua a valere.
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

  v_tier := public.sync_artist_tier(p_artist_id);
  return v_tier;
end;
$$;

-- Nessuna di queste funzioni è raggiungibile dal client: il gate di ruolo resta
-- ensureAdmin() nella Server Action, coerentemente con il resto del progetto
-- (AGENTS.md: "All admin mutations go through Server Actions that re-validate
-- auth + role + Zod"). Non si usa is_superadmin(auth.uid()) qui dentro perché
-- sotto service role auth.uid() è NULL e il check fallirebbe sempre.
revoke all on function public.compute_artist_tier(uuid) from public, anon, authenticated;
revoke all on function public.sync_artist_tier(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_artist_tier(uuid, public.artist_tier_enum, timestamptz, text) from public, anon, authenticated;

grant execute on function public.compute_artist_tier(uuid) to service_role;
grant execute on function public.sync_artist_tier(uuid) to service_role;
grant execute on function public.admin_set_artist_tier(uuid, public.artist_tier_enum, timestamptz, text) to service_role;

-- Sync dell'override: se il superadmin scrive tier_override per altra via
-- (es. SQL Editor), la cache si allinea comunque.
-- Non ricorsivo: aggiorna solo `tier`, e questo trigger è `of tier_override`.
create or replace function public.artists_override_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_artist_tier(new.id);
  return null;
end;
$$;

drop trigger if exists artists_override_sync_trg on public.artists;
create trigger artists_override_sync_trg
  after update of tier_override, tier_override_expires_at on public.artists
  for each row execute function public.artists_override_sync();
