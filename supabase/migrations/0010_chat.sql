-- =========================================
-- N'arte — Chat real-time per booking_requests
-- =========================================
-- Aggiunge:
--   * enum chat_message_kind, chat_offer_status
--   * tabella booking_messages (testo / offerta / system)
--   * RLS: parti del booking + superadmin (sola lettura)
--   * funzione accept_chat_offer (transazione atomica)
--   * realtime publication
-- Idempotente.

-- =========================================
-- 1. Enum
-- =========================================
do $$ begin
  create type chat_message_kind as enum ('text','offer','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_offer_status as enum ('pending','accepted','rejected','superseded');
exception when duplicate_object then null; end $$;

-- =========================================
-- 2. Tabella booking_messages
-- =========================================
create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role role_enum not null,
  kind chat_message_kind not null default 'text',
  body text,
  offer_event_date date,
  offer_time_slot text,
  offer_budget numeric,
  offer_status chat_offer_status,
  offer_responded_at timestamptz,
  read_by_artist_at timestamptz,
  read_by_organizer_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_request_idx
  on public.booking_messages(booking_request_id, created_at);
create index if not exists booking_messages_sender_idx
  on public.booking_messages(sender_id);

alter table public.booking_messages enable row level security;

-- =========================================
-- 3. RLS
-- =========================================
drop policy if exists "booking_messages_read" on public.booking_messages;
create policy "booking_messages_read"
  on public.booking_messages for select using (
    exists (
      select 1 from public.booking_requests br
        join public.artists a on a.id = br.artist_id
        join public.organizers o on o.id = br.organizer_id
      where br.id = booking_messages.booking_request_id
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "booking_messages_insert" on public.booking_messages;
create policy "booking_messages_insert"
  on public.booking_messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.booking_requests br
        join public.artists a on a.id = br.artist_id
        join public.organizers o on o.id = br.organizer_id
      where br.id = booking_messages.booking_request_id
        and br.status = 'in_trattativa'
        and (
          (a.user_id = auth.uid() and booking_messages.sender_role = 'artist') or
          (o.user_id = auth.uid() and booking_messages.sender_role = 'organizer')
        )
    )
  );

drop policy if exists "booking_messages_update_offer" on public.booking_messages;
create policy "booking_messages_update_offer"
  on public.booking_messages for update using (
    kind = 'offer'
    and offer_status = 'pending'
    and sender_id <> auth.uid()
    and exists (
      select 1 from public.booking_requests br
        join public.artists a on a.id = br.artist_id
        join public.organizers o on o.id = br.organizer_id
      where br.id = booking_messages.booking_request_id
        and br.status = 'in_trattativa'
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
  );

-- Read receipt update: ognuno può aggiornare il proprio read_by_*_at
drop policy if exists "booking_messages_update_read" on public.booking_messages;
create policy "booking_messages_update_read"
  on public.booking_messages for update using (
    exists (
      select 1 from public.booking_requests br
        join public.artists a on a.id = br.artist_id
        join public.organizers o on o.id = br.organizer_id
      where br.id = booking_messages.booking_request_id
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
  );

-- =========================================
-- 4. Funzione transazionale: accept offer → conferma booking
-- =========================================
create or replace function public.accept_chat_offer(message_id uuid, actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _msg public.booking_messages%rowtype;
  _br public.booking_requests%rowtype;
  _is_artist boolean := false;
  _is_organizer boolean := false;
begin
  select * into _msg from public.booking_messages where id = message_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Messaggio non trovato');
  end if;
  if _msg.kind <> 'offer' or _msg.offer_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Offerta non più valida');
  end if;
  if _msg.sender_id = actor then
    return jsonb_build_object('ok', false, 'error', 'Non puoi accettare la tua offerta');
  end if;

  select * into _br from public.booking_requests where id = _msg.booking_request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trattativa non trovata');
  end if;
  if _br.status <> 'in_trattativa' then
    return jsonb_build_object('ok', false, 'error', 'Trattativa non aperta');
  end if;

  select exists(select 1 from public.artists where id = _br.artist_id and user_id = actor)
    into _is_artist;
  select exists(select 1 from public.organizers where id = _br.organizer_id and user_id = actor)
    into _is_organizer;
  if not (_is_artist or _is_organizer) then
    return jsonb_build_object('ok', false, 'error', 'Non autorizzato');
  end if;

  -- Marca offerta accettata
  update public.booking_messages
    set offer_status = 'accepted', offer_responded_at = now()
    where id = message_id;

  -- Aggiorna booking_request con termini offerta + status confermata
  update public.booking_requests
    set
      event_date = coalesce(_msg.offer_event_date, event_date),
      time_slot = coalesce(_msg.offer_time_slot, time_slot),
      budget_offer = coalesce(_msg.offer_budget, budget_offer),
      status = 'confermata',
      organizer_confirmed_at = case when _is_organizer then now() else organizer_confirmed_at end,
      artist_accepted_at = case when _is_artist then coalesce(artist_accepted_at, now()) else artist_accepted_at end
    where id = _br.id;

  -- Marca eventuali altre offerte pending come superseded
  update public.booking_messages
    set offer_status = 'superseded'
    where booking_request_id = _br.id
      and kind = 'offer'
      and offer_status = 'pending'
      and id <> message_id;

  -- System message in chat
  insert into public.booking_messages (booking_request_id, sender_id, sender_role, kind, body)
  values (
    _br.id,
    actor,
    case when _is_artist then 'artist'::role_enum else 'organizer'::role_enum end,
    'system',
    'Offerta accettata. Trattativa confermata.'
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_chat_offer(uuid, uuid) from public;
grant execute on function public.accept_chat_offer(uuid, uuid) to authenticated, service_role;

-- =========================================
-- 5. Realtime publication
-- =========================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.booking_messages';
    end if;
  end if;
end $$;
