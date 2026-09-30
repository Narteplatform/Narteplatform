-- 0061 — Integrità degli stati del booking
--
-- CONTESTO
-- L'analisi del codice fatta per il fascicolo legale ha trovato tre modi in cui
-- lo stato di una richiesta poteva cambiare in modo diverso da quanto dicono i
-- termini d'uso:
--
--   1. l'organizzatore poteva annullare una data già CONFERMATA con una
--      chiamata diretta all'azione (il pulsante era nascosto solo a video);
--   2. il rifiuto dell'artista non controllava lo stato: portava a «rifiutata»
--      anche una data confermata;
--   3. accettare un'Offerta in chat creava un SECONDO booking già confermato,
--      perché l'offerta non veniva mai collegata alla richiesta in trattativa.
--      La trattativa originale restava orfana, e se la data era già occupata
--      l'utente riceveva un errore SQL grezzo.
--
-- I punti 1 e 2 sono già corretti nelle server action. Questa migration corregge
-- il punto 3 alla radice e aggiunge un controllo di ultima istanza nel database,
-- perché le azioni scrivono con il client di servizio e la RLS non le ferma.
--
-- Additiva: ridefinisce una funzione e aggiunge un trigger. Nessun dato
-- esistente viene modificato. Le righe già in uno stato «impossibile» restano
-- come sono: il trigger controlla solo le transizioni future.

-- =========================================
-- 1. Transizioni ammesse
-- =========================================
--   pending        → in_trattativa | rifiutata | annullata | confermata
--   in_trattativa  → confermata | annullata
--   confermata     → annullata          (solo il Team: superadmin_cancel_booking)
--   rifiutata      → (nessuna)
--   annullata      → (nessuna)
--
-- Un UPDATE che non cambia lo stato (date, note, compenso annotato) passa
-- sempre. La regola «solo il Team annulla una data confermata» è applicata
-- nelle server action e nella funzione del Team: qui si blocca ciò che nessuno
-- deve poter fare, chiunque sia.

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
        and new.status in ('in_trattativa', 'rifiutata', 'annullata', 'confermata'))
     or (old.status = 'in_trattativa' and new.status in ('confermata', 'annullata'))
     or (old.status = 'confermata' and new.status = 'annullata') then
    return new;
  end if;

  raise exception 'Transizione di stato non ammessa: % → %', old.status, new.status
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists trg_booking_requests_transition_guard on public.booking_requests;
create trigger trg_booking_requests_transition_guard
  before update of status on public.booking_requests
  for each row execute function public.booking_requests_transition_guard();

-- =========================================
-- 2. accept_offer_v2 — conferma la trattativa esistente
-- =========================================
-- Cambia rispetto alla 0013:
--   * se l'offerta è collegata a una richiesta, la conferma SOLO se è ancora
--     aperta (pending o in trattativa);
--   * se non è collegata (offerte inviate prima di questa versione), cerca la
--     richiesta aperta più recente fra le stesse due parti e conferma quella;
--   * crea un nuovo booking solo se fra le due parti non c'è nessuna richiesta
--     aperta: è il caso legittimo di una seconda data concordata in chat dopo
--     una prima già chiusa;
--   * se la data è già confermata con qualcun altro, restituisce un messaggio
--     leggibile invece dell'errore dell'indice unico.
--
-- Il messaggio di sistema dice esplicitamente che l'accordo è fra le parti:
-- N'arte registra la data, non è parte del contratto.

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
       and status in ('pending', 'in_trattativa')
     order by created_at desc
     limit 1;
  end if;

  begin
    if _br_id is not null then
      select status into _br_status from public.booking_requests where id = _br_id for update;
      if _br_status not in ('pending', 'in_trattativa') then
        return jsonb_build_object('ok', false, 'error',
          'La richiesta collegata a questa offerta non è più aperta.');
      end if;

      update public.booking_requests
         set event_date = coalesce(_msg.offer_event_date, event_date),
             time_slot = coalesce(_msg.offer_time_slot, time_slot),
             budget_offer = coalesce(_budget_eur, budget_offer),
             status = 'confermata',
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
        'confermata',
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
    'Offerta accettata: data confermata nel calendario. L''accordo è fra artista e organizzatore; N''arte non ne è parte e non gestisce il pagamento.'
  );

  return jsonb_build_object('ok', true, 'booking_request_id', _br_id);
end;
$$;

revoke all on function public.accept_offer_v2(uuid) from public;
grant execute on function public.accept_offer_v2(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
