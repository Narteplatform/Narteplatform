-- 0080 — Offerta in chat: proposta + accettazione confermano la data al prezzo
--
-- CONTESTO
-- Nuovo flusso della trattativa (novembre 2026):
--   • l'organizzatore invia la richiesta, l'artista preme «Inizia trattativa»;
--   • con Pro/Max si tratta in chat con il widget Offerta (data, fascia,
--     compenso). Chi propone ha già dato il suo consenso; quando l'ALTRA parte
--     accetta, la data è confermata e bloccata a quel prezzo — qualunque dei
--     due abbia proposto. Non c'è più il passaggio intermedio «accettata»
--     seguito dalla conferma separata dell'organizzatore (0069/0070);
--   • con il piano Free la chat non è disponibile, per nessuna delle due parti:
--     la trattativa si svolge via email e l'accordo si registra fuori chat
--     (lo gestisce il codice, non questa migration).
--
-- Cosa cambia qui, solo nella funzione accept_offer_v2:
--   1. chiunque accetti porta la richiesta a «confermata»;
--   2. il compenso dell'offerta diventa il compenso concordato, già confermato
--      da entrambi: final_price, proposto da chi ha inviato l'offerta,
--      confermato da chi l'ha accettata (colonne della 0026);
--   3. un'offerta senza compenso non si può accettare;
--   4. con un artista sul piano Free la funzione rifiuta: è eseguibile da
--      `authenticated` via PostgREST, quindi il controllo nel codice non basta.
--
-- Nessuna riga esistente viene modificata. Il trigger sulle transizioni (0070)
-- ammette già in_trattativa → confermata e pending → confermata. Le richieste
-- rimaste «accettata» si confermano ancora dal widget («Conferma data a …»).
--
-- Il codice funziona anche PRIMA di questa migration: con la funzione della
-- 0070 l'accettazione dell'artista produce ancora «accettata» e il widget
-- mostra all'organizzatore il pulsante di conferma; il compenso viene
-- completato dall'azione server.
--
-- Idempotente: rieseguirla non cambia nulla.

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
  _artist_tier text;
  _data_testo text;
  _prezzo_testo text;
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
  if _msg.offer_budget_cents is null then
    return jsonb_build_object('ok', false, 'error',
      'L''offerta non indica un compenso: chiedi di inviarne una con il prezzo.');
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

  -- La chat (e quindi l'offerta) è dei piani Pro e Max. artists.tier è la
  -- cache mantenuta da compute_artist_tier (0044) e include l'omaggio del team.
  select tier::text into _artist_tier from public.artists where id = _conv.artist_id;
  if coalesce(_artist_tier, 'free') = 'free' then
    return jsonb_build_object('ok', false, 'error',
      'La chat con offerte è disponibile con i piani Pro e Max: con il piano Free la trattativa si svolge via email.');
  end if;

  _acting_role := case when _is_artist then 'artist'::role_enum else 'organizer'::role_enum end;
  _budget_eur := _msg.offer_budget_cents::numeric / 100;

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

      -- Proposta (chi ha inviato l'offerta) + accettazione (chi la accetta):
      -- la data è confermata e bloccata a questo prezzo.
      update public.booking_requests
         set event_date = coalesce(_msg.offer_event_date, event_date),
             time_slot = coalesce(_msg.offer_time_slot, time_slot),
             budget_offer = _budget_eur,
             status = 'confermata'::booking_status_enum,
             organizer_confirmed_at = now(),
             artist_accepted_at = coalesce(artist_accepted_at, now()),
             final_price = _budget_eur,
             final_price_proposed_by = _msg.sender_id,
             final_price_proposed_at = _msg.created_at,
             final_price_confirmed_by = _caller,
             final_price_confirmed_at = now()
       where id = _br_id;
    else
      if _msg.offer_event_date is null then
        return jsonb_build_object('ok', false, 'error',
          'L''offerta non indica una data: non si può confermare.');
      end if;

      insert into public.booking_requests (
        organizer_id, artist_id, venue_id,
        event_date, time_slot, budget_offer, message, status,
        organizer_confirmed_at, artist_accepted_at,
        final_price, final_price_proposed_by, final_price_proposed_at,
        final_price_confirmed_by, final_price_confirmed_at
      ) values (
        _conv.organizer_id, _conv.artist_id, null,
        _msg.offer_event_date,
        _msg.offer_time_slot,
        _budget_eur,
        coalesce(_msg.offer_description, 'Data concordata in chat'),
        'confermata'::booking_status_enum,
        now(), now(),
        _budget_eur, _msg.sender_id, _msg.created_at,
        _caller, now()
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

  select to_char(event_date, 'DD/MM/YYYY') into _data_testo
    from public.booking_requests where id = _br_id;
  _prezzo_testo := replace(trim(to_char(_budget_eur, '9999999990.99')), '.', ',') || ' €';

  insert into public.messages (conversation_id, sender_id, sender_role, kind, body)
  values (
    _conv.id,
    _caller,
    _acting_role,
    'system',
    'Accordo confermato da entrambi: ' || coalesce(_data_testo, 'data dell''offerta') || ' a '
      || _prezzo_testo || '. La data è bloccata nel calendario. L''accordo è fra artista e '
      || 'organizzatore; N''arte non ne è parte e non gestisce il pagamento.'
  );

  return jsonb_build_object(
    'ok', true,
    'booking_request_id', _br_id,
    'stato', 'confermata'
  );
end;
$$;

revoke all on function public.accept_offer_v2(uuid) from public;
grant execute on function public.accept_offer_v2(uuid) to authenticated, service_role;
