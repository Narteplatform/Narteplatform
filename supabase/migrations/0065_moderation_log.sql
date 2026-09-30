-- 0065 — Registro delle decisioni di moderazione
--
-- CONTESTO
-- I termini d'uso e la politica di moderazione promettono che ogni intervento
-- del Team su un contenuto o su un account sia motivato, comunicato
-- all'interessato e contestabile (art. 17 DSA). Oggi nessuna azione del
-- pannello lascia traccia di chi ha deciso, quando e perché: rifiutare una
-- candidatura, nascondere un profilo, oscurare una recensione, rifiutare una
-- foto sono cambi di stato muti.
--
-- Questa tabella è il registro unico: una riga per ogni decisione, scritta
-- dal server nel momento in cui la decisione viene presa, con il motivo e
-- l'esito della comunicazione all'interessato. Serve a tre cose:
--   * dimostrare, in caso di contestazione, che la decisione è stata motivata;
--   * gestire i reclami (il riferimento stampato nell'email rimanda qui);
--   * rispondere a un'autorità che chieda conto delle misure adottate.
--
-- Additiva: nessuna tabella esistente viene toccata.

create table if not exists public.moderation_actions (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  -- Chi ha deciso. `set null` e non `cascade`: se l'account dell'operatore
  -- viene cancellato, la decisione resta nel registro.
  actor_id         uuid references auth.users(id) on delete set null,

  -- Su cosa. Testo libero e non enum: le categorie crescono con il prodotto
  -- (profilo, media, video, recensione, candidatura, conversazione, struttura,
  -- account, booking) e un enum andrebbe migrato a ogni aggiunta.
  target_type      text not null check (char_length(target_type) between 2 and 40),
  target_id        text,

  -- Chi la subisce, se è un utente registrato.
  affected_user_id uuid references auth.users(id) on delete set null,
  -- Email dell'interessato quando non ha un account (es. candidato respinto).
  affected_email   text,

  action           text not null check (char_length(action) between 2 and 60),
  reason           text not null check (char_length(trim(reason)) >= 10),

  -- Segnalazione o reclamo da cui nasce la decisione, se c'è. Senza chiave
  -- esterna: la tabella delle segnalazioni ha una sua migration e le due
  -- restano applicabili in qualunque ordine.
  report_id        uuid,

  -- Esito della comunicazione all'interessato.
  notified_at      timestamptz,
  notify_error     text
);

create index if not exists moderation_actions_created_idx
  on public.moderation_actions (created_at desc);
create index if not exists moderation_actions_target_idx
  on public.moderation_actions (target_type, target_id);
create index if not exists moderation_actions_affected_idx
  on public.moderation_actions (affected_user_id);

alter table public.moderation_actions enable row level security;

-- Lettura: il Team. Scrittura: solo il server con la chiave di servizio.
drop policy if exists "moderation_actions_select_superadmin" on public.moderation_actions;
create policy "moderation_actions_select_superadmin"
  on public.moderation_actions for select
  using (public.is_superadmin(auth.uid()));

-- La RLS è per riga: senza revoca, PostgREST esporrebbe comunque la tabella
-- in scrittura ai ruoli anon e authenticated (vedi 0046, 0056).
revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;

notify pgrst, 'reload schema';
