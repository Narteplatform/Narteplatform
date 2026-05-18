-- =========================================
-- N'arte — Chat v2: una chat per coppia (artist, organizer)
-- =========================================
-- Reset completo: drop tabella booking_messages e funzione accept_chat_offer
-- legate al modello legacy "una chat per booking_request".
--
-- Nuovo modello:
--   * conversations(artist_id, organizer_id) UNIQUE
--   * messages(conversation_id, ...)
--   * offerta standalone (event_date, time_slot, budget, description) ->
--     accept = crea booking_request confermata
-- Idempotente.

-- =========================================
-- 1. Drop legacy
-- =========================================
drop function if exists public.accept_chat_offer(uuid, uuid);
drop table if exists public.booking_messages cascade;
drop type if exists public.chat_message_kind cascade;
drop type if exists public.chat_offer_status cascade;

-- =========================================
-- 2. Enum
-- =========================================
create type public.chat_message_kind as enum (
  'text', 'offer', 'system', 'image', 'document', 'voice'
);

create type public.chat_offer_status as enum (
  'pending', 'accepted', 'rejected', 'superseded'
);

-- =========================================
-- 3. Tabella conversations
-- =========================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (artist_id, organizer_id)
);

create index if not exists conversations_artist_idx on public.conversations(artist_id);
create index if not exists conversations_organizer_idx on public.conversations(organizer_id);
create index if not exists conversations_last_msg_idx on public.conversations(last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select"
  on public.conversations for select using (
    exists (
      select 1 from public.artists a
      where a.id = conversations.artist_id and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizers o
      where o.id = conversations.organizer_id and o.user_id = auth.uid()
    )
    or public.is_superadmin(auth.uid())
  );

-- Insert/update gestiti via RPC security definer; nessuna policy per scrittura diretta.

-- =========================================
-- 4. Tabella messages
-- =========================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role role_enum not null,
  kind public.chat_message_kind not null default 'text',
  body text,
  -- Offer fields
  offer_event_date date,
  offer_time_slot text,
  offer_budget_cents bigint,
  offer_description text,
  offer_status public.chat_offer_status,
  offer_responded_at timestamptz,
  offer_booking_request_id uuid references public.booking_requests(id) on delete set null,
  -- Attachments
  attachment_url text,
  attachment_type text,
  attachment_name text,
  attachment_size bigint,
  attachment_duration_ms integer,
  -- Read receipts
  read_by_artist_at timestamptz,
  read_by_organizer_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx on public.messages(sender_id);

alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select using (
    exists (
      select 1
      from public.conversations c
      left join public.artists a on a.id = c.artist_id
      left join public.organizers o on o.id = c.organizer_id
      where c.id = messages.conversation_id
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      left join public.artists a on a.id = c.artist_id
      left join public.organizers o on o.id = c.organizer_id
      where c.id = messages.conversation_id
        and (
          (a.user_id = auth.uid() and messages.sender_role = 'artist') or
          (o.user_id = auth.uid() and messages.sender_role = 'organizer')
        )
    )
  );

-- Update offerta: solo non-mittente, solo pending → accept/reject
drop policy if exists "messages_update_offer" on public.messages;
create policy "messages_update_offer"
  on public.messages for update using (
    kind = 'offer'
    and offer_status = 'pending'
    and sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversations c
      left join public.artists a on a.id = c.artist_id
      left join public.organizers o on o.id = c.organizer_id
      where c.id = messages.conversation_id
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
  );

-- Update read receipts: qualsiasi membro
drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read"
  on public.messages for update using (
    exists (
      select 1
      from public.conversations c
      left join public.artists a on a.id = c.artist_id
      left join public.organizers o on o.id = c.organizer_id
      where c.id = messages.conversation_id
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
  );

-- =========================================
-- 5. Trigger last_message_at
-- =========================================
create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
     set last_message_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_last_message on public.messages;
create trigger trg_touch_conversation_last_message
  after insert on public.messages
  for each row execute function public.touch_conversation_last_message();

-- =========================================
-- 6. RPC get_or_create_conversation
-- =========================================
create or replace function public.get_or_create_conversation(
  p_artist_id uuid,
  p_organizer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
  _caller uuid := auth.uid();
  _is_artist boolean := false;
  _is_organizer boolean := false;
  _is_super boolean := false;
begin
  if _caller is null then
    raise exception 'Non autorizzato';
  end if;

  select exists(select 1 from public.artists where id = p_artist_id and user_id = _caller)
    into _is_artist;
  select exists(select 1 from public.organizers where id = p_organizer_id and user_id = _caller)
    into _is_organizer;
  select public.is_superadmin(_caller) into _is_super;

  if not (_is_artist or _is_organizer or _is_super) then
    raise exception 'Non autorizzato';
  end if;

  select id into _id
    from public.conversations
   where artist_id = p_artist_id and organizer_id = p_organizer_id;

  if _id is null then
    insert into public.conversations (artist_id, organizer_id)
      values (p_artist_id, p_organizer_id)
      returning id into _id;
  end if;

  return _id;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated, service_role;

-- =========================================
-- 7. RPC accept_offer_v2
-- =========================================
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

  if _msg.offer_booking_request_id is not null then
    -- Aggiorna booking esistente
    update public.booking_requests
       set event_date = coalesce(_msg.offer_event_date, event_date),
           time_slot = coalesce(_msg.offer_time_slot, time_slot),
           budget_offer = coalesce(_budget_eur, budget_offer),
           status = 'confermata',
           organizer_confirmed_at = case when _is_organizer then now() else organizer_confirmed_at end,
           artist_accepted_at = case when _is_artist then coalesce(artist_accepted_at, now()) else artist_accepted_at end
     where id = _msg.offer_booking_request_id;
    _br_id := _msg.offer_booking_request_id;
  else
    -- Crea nuovo booking confermato
    insert into public.booking_requests (
      organizer_id, artist_id, venue_id,
      event_date, time_slot, budget_offer, message, status,
      organizer_confirmed_at, artist_accepted_at
    ) values (
      _conv.organizer_id, _conv.artist_id, null,
      coalesce(_msg.offer_event_date, current_date),
      _msg.offer_time_slot,
      _budget_eur,
      coalesce(_msg.offer_description, 'Offerta accettata via chat'),
      'confermata',
      case when _is_organizer then now() else null end,
      case when _is_artist then now() else null end
    )
    returning id into _br_id;
  end if;

  -- Marca offerta accettata
  update public.messages
     set offer_status = 'accepted',
         offer_responded_at = now(),
         offer_booking_request_id = _br_id
   where id = p_message_id;

  -- Supersede pending precedenti della stessa conversazione
  update public.messages
     set offer_status = 'superseded'
   where conversation_id = _conv.id
     and kind = 'offer'
     and offer_status = 'pending'
     and id <> p_message_id;

  -- System message
  insert into public.messages (conversation_id, sender_id, sender_role, kind, body)
  values (
    _conv.id,
    _caller,
    _acting_role,
    'system',
    'Offerta accettata. Data confermata.'
  );

  return jsonb_build_object('ok', true, 'booking_request_id', _br_id);
end;
$$;

revoke all on function public.accept_offer_v2(uuid) from public;
grant execute on function public.accept_offer_v2(uuid) to authenticated, service_role;

-- =========================================
-- 8. Realtime publication
-- =========================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
    ) then
      execute 'alter publication supabase_realtime add table public.conversations';
    end if;
  end if;
end $$;

-- =========================================
-- 9. Storage bucket (mantenuto da 0012)
-- =========================================
insert into storage.buckets (id, name, public) values
  ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

drop policy if exists "chat-attachments insert authenticated" on storage.objects;
create policy "chat-attachments insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments');

drop policy if exists "chat-attachments read public" on storage.objects;
create policy "chat-attachments read public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'chat-attachments');

drop policy if exists "chat-attachments delete own" on storage.objects;
create policy "chat-attachments delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-attachments' and owner = auth.uid());
