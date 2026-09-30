-- 0066 — Moderazione motivata e replica dell'artista sulle recensioni
--
-- CONTESTO
-- Il Regolamento delle recensioni (doc. 05 del fascicolo legale) promette:
--   * moderazione motivata e comunicata: chi ha deciso, quando e perché;
--   * cancellazione logica: la recensione eliminata resta in archivio e la
--     stessa data NON può essere recensita di nuovo (oggi la DELETE fisica
--     libera il vincolo unique su booking_request_id);
--   * diritto di replica dell'artista, una risposta pubblica per recensione;
--   * dichiarazione dell'autore (casella I1) registrata con la data.
--
-- Questa migration aggiunge le colonne che servono e ridefinisce la policy di
-- lettura, perché una recensione eliminata non sia leggibile da nessuno tranne
-- il superadmin. Il codice funziona anche prima di questa migration (ricade
-- sul comportamento precedente: la sola colonna `hidden`).
--
-- Additiva: nessun dato esistente viene toccato. Le colonne nascono null.

alter table public.feedback
  add column if not exists artist_reply text
    check (artist_reply is null or char_length(artist_reply) between 2 and 1000);

alter table public.feedback
  add column if not exists artist_reply_at timestamptz;

alter table public.feedback
  add column if not exists moderation_reason text;

-- `set null` e non `cascade`: se l'account dell'operatore viene cancellato,
-- la recensione e la traccia della decisione restano.
alter table public.feedback
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

alter table public.feedback
  add column if not exists moderated_at timestamptz;

-- Cancellazione logica. La riga resta, quindi resta anche il vincolo unique su
-- booking_request_id: la stessa data non si può recensire una seconda volta.
alter table public.feedback
  add column if not exists deleted_at timestamptz;

-- Momento in cui l'autore ha spuntato la dichiarazione I1.
alter table public.feedback
  add column if not exists declared_at timestamptz;

-- Le recensioni pubbliche sono la lettura più frequente (profilo e catalogo).
create index if not exists feedback_public_idx
  on public.feedback (artist_id, created_at desc)
  where hidden = false and deleted_at is null;

-- Policy di lettura: una recensione eliminata non è leggibile da artista e
-- organizzatore. Il superadmin la vede sempre (anche dalla policy "all").
drop policy if exists "feedback read involved" on public.feedback;
create policy "feedback read involved"
  on public.feedback for select
  using (
    (
      not hidden
      and deleted_at is null
      and (
        exists (select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
        or exists (select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid())
      )
    )
    or public.is_superadmin(auth.uid())
  );
