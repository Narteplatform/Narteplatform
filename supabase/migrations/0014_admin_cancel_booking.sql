-- =========================================
-- N'arte — Admin cancel data confermata
-- =========================================
-- Aggiunge:
--   * Colonne cancel su booking_requests (cancelled_by, cancelled_at, cancellation_reason)
--   * RPC superadmin_cancel_booking(p_booking_id, p_reason) → annulla confermata,
--     libera disponibilità (via trigger sync_booking_availability esistente),
--     posta system message in chat se la conversation esiste
-- Idempotente.

-- =========================================
-- 1. Colonne cancel
-- =========================================
alter table public.booking_requests
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_reason text;

-- =========================================
-- 2. RPC superadmin_cancel_booking
-- =========================================
create or replace function public.superadmin_cancel_booking(
  p_booking_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _caller uuid := auth.uid();
  _br public.booking_requests%rowtype;
  _conv_id uuid;
  _artist_user uuid;
  _organizer_user uuid;
  _artist_email text;
  _organizer_email text;
  _artist_name text;
  _organizer_name text;
  _venue_name text;
begin
  if _caller is null then
    return jsonb_build_object('ok', false, 'error', 'Non autorizzato');
  end if;
  if not public.is_superadmin(_caller) then
    return jsonb_build_object('ok', false, 'error', 'Permessi insufficienti');
  end if;
  if p_reason is null or length(trim(p_reason)) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Motivazione obbligatoria (min 10 caratteri)');
  end if;

  select * into _br from public.booking_requests where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Prenotazione non trovata');
  end if;
  if _br.status <> 'confermata' then
    return jsonb_build_object('ok', false, 'error', 'Solo prenotazioni confermate possono essere annullate');
  end if;

  -- Update status → annullata (trigger sync_booking_availability libera la data)
  update public.booking_requests
     set status = 'annullata',
         cancelled_at = now(),
         cancelled_by = _caller,
         cancellation_reason = trim(p_reason)
   where id = p_booking_id;

  -- Lookup conversation (se esiste) e posta system message
  select id into _conv_id
    from public.conversations
   where artist_id = _br.artist_id and organizer_id = _br.organizer_id;

  if _conv_id is not null then
    insert into public.messages (conversation_id, sender_id, sender_role, kind, body)
    values (
      _conv_id,
      _caller,
      'superadmin'::role_enum,
      'system',
      'Data del ' || to_char(_br.event_date, 'DD/MM/YYYY') ||
      ' annullata dall''amministratore. Motivo: ' || trim(p_reason)
    );
  end if;

  -- Lookup dati per email
  select user_id, stage_name into _artist_user, _artist_name
    from public.artists where id = _br.artist_id;
  select user_id, display_name into _organizer_user, _organizer_name
    from public.organizers where id = _br.organizer_id;
  if _br.venue_id is not null then
    select name into _venue_name from public.venues where id = _br.venue_id;
  end if;

  if _artist_user is not null then
    select email into _artist_email from auth.users where id = _artist_user;
  end if;
  if _organizer_user is not null then
    select email into _organizer_email from auth.users where id = _organizer_user;
  end if;

  return jsonb_build_object(
    'ok', true,
    'booking_id', _br.id,
    'event_date', _br.event_date,
    'artist_email', _artist_email,
    'organizer_email', _organizer_email,
    'artist_name', _artist_name,
    'organizer_name', _organizer_name,
    'venue_name', _venue_name,
    'reason', trim(p_reason)
  );
end;
$$;

revoke all on function public.superadmin_cancel_booking(uuid, text) from public;
grant execute on function public.superadmin_cancel_booking(uuid, text) to authenticated, service_role;
