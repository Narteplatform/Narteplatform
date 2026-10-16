-- 0073 — Notifiche in-app (campanella)
--
-- CONTESTO
-- Artisti e organizzatori scoprivano le novità solo aprendo le singole pagine
-- (richieste, chat, profilo). Da ora la topbar ha una campanella: una tabella
-- di notifiche per utente, con titolo, testo breve e link a dove andare.
--
--   - nuova richiesta di booking, offerta in chat, decisione dell'artista
--   - contenuto (foto, audio, video, copertina) approvato o rifiutato
--   - profilo approvato, account organizzatore approvato
--
-- Le notifiche le SCRIVE soltanto il server (service role), mai il client:
-- per anon e authenticated l'insert e il delete non esistono. L'utente può
-- solo leggere le proprie righe e segnarle come lette (colonna read_at).
--
-- Questa migration è INDIPENDENTE dalle altre: si può eseguire in qualunque
-- ordine. Il codice è già pronto e tollera la tabella mancante (la campanella
-- risulta semplicemente vuota e nessuna notifica viene scritta).
--
-- Additiva e idempotente: rieseguirla non cambia nulla di quanto già fatto.
-- Non tocca righe esistenti di nessun'altra tabella.

-- =========================================
-- 1. Tabella
-- =========================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  artist_id  uuid references public.artists(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  href       text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

-- Solo le non lette: è l'unica interrogazione frequente (campanella).
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- =========================================
-- 2. RLS e privilegi
-- =========================================
alter table public.notifications enable row level security;

-- La RLS filtra le righe ma non i privilegi di tabella: si parte da zero.
revoke all on table public.notifications from anon, authenticated;

-- L'utente legge le proprie e può solo aggiornare read_at (non titolo/testo).
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Nessuna policy di insert/delete: scrive solo la service role.
