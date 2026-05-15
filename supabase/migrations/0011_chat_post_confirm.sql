-- =========================================
-- N'arte — Chat dopo conferma
-- =========================================
-- Permette ad artista e organizzatore di scrivere messaggi testuali
-- anche dopo che la trattativa è 'confermata'. Le offerte restano
-- consentite solo durante 'in_trattativa'.
-- Idempotente.

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
          -- testo e system in trattativa o confermata
          (booking_messages.kind in ('text','system') and br.status in ('in_trattativa','confermata'))
          -- offerte solo in trattativa
          or (booking_messages.kind = 'offer' and br.status = 'in_trattativa')
        )
    )
  );
