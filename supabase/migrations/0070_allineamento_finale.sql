-- 0070 — Allineamento finale al fascicolo legale (seconda lista del cliente)
--
-- ⚠️ ESEGUIRE DOPO LA 0069, come comando separato: usa il nuovo stato «accettata».
--
-- CONTESTO
-- Raccoglie le modifiche al database richieste dalla seconda lista del cliente.
-- Tutte additive o limitate a funzioni, vincoli e privilegi: nessuna riga
-- esistente viene modificata o cancellata.
--
--   1. Booking con doppia conferma: transizioni e accept_offer_v2.
--   2. Prova delle accettazioni: ruolo, user agent, impronta dell'IP.
--   3. Segnalazioni: allegati (archivio privato) e assegnazione.
--   4. Strutture nascoste dal team.
--   5. Registro dei recessi dagli abbonamenti.
--   6. Visitatori non registrati: nessun dato identificativo degli artisti
--      leggibile con la chiave pubblica, né recapiti dei consulenti.

-- =========================================
-- 1. Booking con doppia conferma
-- =========================================
--   pending        → in_trattativa | accettata | rifiutata | annullata | confermata
--   in_trattativa  → accettata | confermata | annullata
--   accettata      → confermata | in_trattativa | annullata
--   confermata     → annullata          (solo il Team)

create or replace function public.booking_requests_transition_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if (old.status = 'pending'
        and new.status in ('in_trattativa', 'accettata', 'rifiutata', 'annullata', 'confermata'))
     or (old.status = 'in_trattativa' and new.status in ('accettata', 'confermata', 'annullata'))
     or (old.status = 'accettata' and new.status in ('confermata', 'in_trattativa', 'annullata'))
     or (old.status = 'confermata' and new.status = 'annullata') then
    return new;
  end if;

  raise exception 'Transizione di stato non ammessa: % → %', old.status, new.status
    using errcode = 'check_violation';
end;
$$;

-- accept_offer_v2: se accetta l'organizzatore la data è confermata; se accetta
-- l'artista la richiesta diventa «accettata» e aspetta la conferma
-- dell'organizzatore (pulsante «Conferma data»).
create or replace function public.accept_offer_v2(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _msg public.messages%rowtype;
  _conv public.conversations%rowtype;
  _caller uuid := auth.uid();
  _is_artist boolean := false;
  _is_organizer boolean := false;
  _acting_role role_enum;
  _br_id uuid;
  _br_status booking_status_enum;
  _budget_eur numeric;
begin
  if _caller is null then
    return jsonb_build_object('ok', false, 'error', 'Non autorizzato');
  end if;

  select * into _msg from public.messages where id = p_message_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Offerta non trovata');
  end if;
  if _msg.kind <> 'offer' or _msg.offer_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Offerta non più valida');
  end if;
  if _msg.sender_id = _caller then
    return jsonb_build_object('ok', false, 'error', 'Non puoi accettare la tua offerta');
  end if;

  select * into _conv from public.conversations where id = _msg.conversation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Conversazione non trovata');
  end if;

  select exists(select 1 from public.artists where id = _conv.artist_id and user_id = _caller)
    into _is_artist;
  select exists(select 1 from public.organizers where id = _conv.organizer_id and user_id = _caller)
    into _is_organizer;
  if not (_is_artist or _is_organizer) then
    return jsonb_build_object('ok', false, 'error', 'Non autorizzato');
  end if;

  _acting_role := case when _is_artist then 'artist'::role_enum else 'organizer'::role_enum end;
  _budget_eur := case when _msg.offer_budget_cents is null then null
                      else _msg.offer_budget_cents::numeric / 100 end;

  -- Quale richiesta confermare
  _br_id := _msg.offer_booking_request_id;
  if _br_id is null then
    select id into _br_id
      from public.booking_requests
     where artist_id = _conv.artist_id
       and organizer_id = _conv.organizer_id
       and status in ('pending', 'in_trattativa', 'accettata')
     order by created_at desc
     limit 1;
  end if;

  begin
    if _br_id is not null then
      select status into _br_status from public.booking_requests where id = _br_id for update;
      if _br_status not in ('pending', 'in_trattativa', 'accettata') then
        return jsonb_build_object('ok', false, 'error',
          'La richiesta collegata a questa offerta non è più aperta.');
      end if;

      update public.booking_requests
         set event_date = coalesce(_msg.offer_event_date, event_date),
             time_slot = coalesce(_msg.offer_time_slot, time_slot),
             budget_offer = coalesce(_budget_eur, budget_offer),
             -- Doppia conferma: l'accettazione dell'artista porta a «accettata»;
             -- solo quella dell'organizzatore conferma e blocca la data.
             status = case when _is_organizer then 'confermata'::booking_status_enum
                           else 'accettata'::booking_status_enum end,
             organizer_confirmed_at = case when _is_organizer then now() else organizer_confirmed_at end,
             artist_accepted_at = case when _is_artist then coalesce(artist_accepted_at, now()) else artist_accepted_at end
       where id = _br_id;
    else
      if _msg.offer_event_date is null then
        return jsonb_build_object('ok', false, 'error',
          'L''offerta non indica una data: non si può confermare.');
      end if;

      insert into public.booking_requests (
        organizer_id, artist_id, venue_id,
        event_date, time_slot, budget_offer, message, status,
        organizer_confirmed_at, artist_accepted_at
      ) values (
        _conv.organizer_id, _conv.artist_id, null,
        _msg.offer_event_date,
        _msg.offer_time_slot,
        _budget_eur,
        coalesce(_msg.offer_description, 'Data concordata in chat'),
        case when _is_organizer then 'confermata'::booking_status_enum
             else 'accettata'::booking_status_enum end,
        case when _is_organizer then now() else null end,
        case when _is_artist then now() else null end
      )
      returning id into _br_id;
    end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error',
      'L''artista ha già una data confermata in quel giorno.');
  end;

  update public.messages
     set offer_status = 'accepted',
         offer_responded_at = now(),
         offer_booking_request_id = _br_id
   where id = p_message_id;

  update public.messages
     set offer_status = 'superseded'
   where conversation_id = _conv.id
     and kind = 'offer'
     and offer_status = 'pending'
     and id <> p_message_id;

  insert into public.messages (conversation_id, sender_id, sender_role, kind, body)
  values (
    _conv.id,
    _caller,
    _acting_role,
    'system',
    case when _is_organizer
      then 'Offerta accettata dall''organizzatore: data confermata nel calendario. L''accordo è fra artista e organizzatore; N''arte non ne è parte e non gestisce il pagamento.'
      else 'Offerta accettata dall''artista: in attesa della conferma definitiva dell''organizzatore. L''accordo è fra artista e organizzatore; N''arte non ne è parte.'
    end
  );

  return jsonb_build_object(
    'ok', true,
    'booking_request_id', _br_id,
    'stato', case when _is_organizer then 'confermata' else 'accettata' end
  );
end;
$$;

revoke all on function public.accept_offer_v2(uuid) from public;
grant execute on function public.accept_offer_v2(uuid) to authenticated, service_role;

-- =========================================
-- 2. Prova delle accettazioni
-- =========================================
alter table public.user_consents add column if not exists role text;
alter table public.user_consents add column if not exists user_agent text;
alter table public.user_consents add column if not exists ip_hash text;

comment on column public.user_consents.ip_hash is
  'Impronta sha256 (con sale) dell''indirizzo IP al momento dell''accettazione: prova tecnica senza conservare l''IP in chiaro.';

drop function if exists public.record_consent(text, text, boolean, text);

create or replace function public.record_consent(
  p_kind       text,
  p_version    text,
  p_accepted   boolean default true,
  p_ref        text default null,
  p_user_agent text default null,
  p_ip_hash    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
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

  select role::text into v_role from public.profiles where id = v_user;

  insert into public.user_consents (user_id, kind, version, accepted, ref, role, user_agent, ip_hash)
  values (
    v_user, p_kind, p_version, p_accepted,
    nullif(btrim(p_ref), ''),
    v_role,
    left(nullif(btrim(p_user_agent), ''), 400),
    nullif(btrim(p_ip_hash), '')
  );
end;
$$;

revoke all on function public.record_consent(text, text, boolean, text, text, text) from public, anon;
grant execute on function public.record_consent(text, text, boolean, text, text, text) to authenticated;

-- =========================================
-- 3. Segnalazioni: allegati e assegnazione
-- =========================================
alter table public.content_reports add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.content_reports add column if not exists assigned_to uuid references auth.users(id) on delete set null;

-- Archivio PRIVATO degli allegati: nessuna policy per i client. Caricamento e
-- lettura passano dal server (chiave di servizio, URL firmati a breve scadenza).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-attachments', 'report-attachments', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false;

-- =========================================
-- 4. Strutture nascoste dal team
-- =========================================
alter table public.venues add column if not exists hidden_at timestamptz;

-- =========================================
-- 5. Registro dei recessi
-- =========================================
create table if not exists public.subscription_withdrawals (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  user_id                 uuid references auth.users(id) on delete set null,
  user_email              text,
  stripe_subscription_id  text not null,
  canale                  text not null check (canale in ('online', 'email', 'pec', 'modulo')),
  ricevuto_il             timestamptz not null,
  rimborso_cent           integer not null default 0 check (rimborso_cent >= 0),
  stato_rimborso          text not null default 'non_dovuto'
                            check (stato_rimborso in ('non_dovuto', 'eseguito', 'da_eseguire', 'fallito')),
  registrato_da           uuid references auth.users(id) on delete set null,
  note                    text
);

create index if not exists subscription_withdrawals_user_idx on public.subscription_withdrawals (user_id);

alter table public.subscription_withdrawals enable row level security;
drop policy if exists "subscription_withdrawals_select" on public.subscription_withdrawals;
create policy "subscription_withdrawals_select"
  on public.subscription_withdrawals for select
  using (public.is_superadmin(auth.uid()) or auth.uid() = user_id);

revoke all on public.subscription_withdrawals from anon, authenticated;
grant select on public.subscription_withdrawals to authenticated;

-- =========================================
-- 6. Visitatori non registrati
-- =========================================
-- Decisione del cliente: chi non è registrato non deve poter leggere nulla che
-- identifichi un artista — né sulla pagina né interrogando l'API con la chiave
-- pubblica. La RLS è per riga: per limitare le COLONNE servono i privilegi.
revoke select on public.artists from anon;
grant select (id, genre, instruments, tier, is_public, status, percorso_artistico)
  on public.artists to anon;

-- Contenuti e calendario degli artisti: solo per chi ha un account.
revoke select on public.artist_videos        from anon;
revoke select on public.artist_availability  from anon;
revoke select on public.artist_date_slots    from anon;
revoke select on public.artist_default_slots from anon;

-- Recapiti del team: email e telefono dei consulenti non sono pubblici.
revoke select on public.consultants from anon;

notify pgrst, 'reload schema';
