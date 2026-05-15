-- =========================================
-- N'arte — Chat: allegati (immagini, documenti, vocali)
-- =========================================
-- Aggiunge:
--   * nuovi valori enum chat_message_kind: 'image','document','voice'
--   * colonne attachment_url, attachment_type, attachment_name,
--     attachment_size, attachment_duration_ms su booking_messages
--   * RLS insert estesa: anche image/document/voice consentiti come
--     i messaggi 'text' (in_trattativa o confermata)
--   * bucket storage 'chat-attachments' (public-read, signed-write)
-- Idempotente.

-- =========================================
-- 1. Nuovi valori enum
-- =========================================
do $$ begin
  alter type chat_message_kind add value if not exists 'image';
exception when others then null; end $$;

do $$ begin
  alter type chat_message_kind add value if not exists 'document';
exception when others then null; end $$;

do $$ begin
  alter type chat_message_kind add value if not exists 'voice';
exception when others then null; end $$;

-- =========================================
-- 2. Colonne allegato
-- =========================================
alter table public.booking_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_size bigint,
  add column if not exists attachment_duration_ms integer;

-- =========================================
-- 3. RLS insert: allega anche image/document/voice ai kind consentiti
-- =========================================
drop policy if exists "booking_messages_insert" on public.booking_messages;
create policy "booking_messages_insert"
  on public.booking_messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.booking_requests br
        join public.artists a on a.id = br.artist_id
        join public.organizers o on o.id = br.organizer_id
      where br.id = booking_messages.booking_request_id
        and (
          (a.user_id = auth.uid() and booking_messages.sender_role = 'artist') or
          (o.user_id = auth.uid() and booking_messages.sender_role = 'organizer')
        )
        and (
          (booking_messages.kind in ('text','system','image','document','voice')
            and br.status in ('in_trattativa','confermata'))
          or (booking_messages.kind = 'offer' and br.status = 'in_trattativa')
        )
    )
  );

-- =========================================
-- 4. Bucket storage chat-attachments
-- =========================================
insert into storage.buckets (id, name, public) values
  ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Policy: chiunque autenticato può uploadare nella propria root del booking
-- (path = <booking_request_id>/<uuid>-filename); la verifica fine sulle parti
-- del booking avviene lato server action prima dell'upload.
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
