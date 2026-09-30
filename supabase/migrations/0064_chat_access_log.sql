-- 0064 — Accesso motivato alle chat private
--
-- CONTESTO
-- I termini d'uso (art. 8.6) e la politica di moderazione (art. 15) promettono
-- che il Team N'arte acceda alle chat private SOLO per assistenza,
-- contestazioni, segnalazioni o obblighi di legge, in modo motivato, limitato
-- e registrato. Oggi il superadmin legge tutte le conversazioni senza
-- motivazione e senza lasciare traccia, e le policy `messages_select` e
-- `conversations_select` (0013) gli consentono di leggerle anche dal browser,
-- via PostgREST e realtime.
--
-- Questa migration fa due cose:
--   1. crea il registro `chat_access_log`: una riga per ogni apertura di una
--      conversazione da parte del Team, con categoria, motivazione, eventuale
--      riferimento a una segnalazione e scadenza dell'accesso (2 ore);
--   2. toglie a `messages_select` e `conversations_select` la clausola
--      `or public.is_superadmin(auth.uid())`. Da qui in poi il pannello legge
--      i messaggi solo lato server, con la chiave di servizio, dopo aver
--      registrato l'accesso. Il browser di un admin non può più leggerli.
--
-- CHIAVE ESTERNA SU admin_user_id. `references auth.users(id)` SENZA cascade e
-- senza set null: la colonna è NOT NULL (chi ha letto va sempre saputo) e un
-- `set null` la violerebbe. Con il comportamento predefinito (NO ACTION)
-- cancellare l'account di un operatore che ha aperto chat fallisce finché il
-- registro lo cita: è voluto, il registro degli accessi non si perde
-- cancellando chi ha acceduto. Se serve rimuovere quell'account, va prima
-- deciso cosa fare del registro.
--
-- conversation_id → conversations ON DELETE CASCADE: se la conversazione viene
-- eliminata (con gli artisti/organizzatori che la possiedono) il registro
-- degli accessi a un contenuto ormai inesistente segue la sorte del contenuto.
--
-- ORDINE. Indipendente dalle altre: si può applicare prima o dopo 0065. Finché
-- NON è applicata il pannello /admin/chat non mostra alcun messaggio
-- (senza registro non si legge). Le policy modificate restano valide per artisti
-- e organizzatori, che non ne risentono.

create table if not exists public.chat_access_log (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  admin_user_id   uuid not null references auth.users(id),
  conversation_id uuid not null references public.conversations(id) on delete cascade,

  reason_category text not null
    check (reason_category in ('assistenza', 'contestazione', 'segnalazione', 'obbligo_di_legge')),
  reason_text     text not null check (char_length(trim(reason_text)) >= 10),

  -- Riferimento a una segnalazione (S-), un reclamo (R-) o una decisione (D-),
  -- se l'accesso nasce da lì. Testo e non chiave esterna: vedi 0065.
  report_reference text
    check (report_reference is null or report_reference ~ '^[SRD]-[0-9A-F]{8}$'),

  -- Fine dell'accesso: dopo questo istante il pannello richiede una nuova
  -- motivazione.
  expires_at      timestamptz not null
);

create index if not exists chat_access_log_conversation_idx
  on public.chat_access_log (conversation_id, created_at desc);
create index if not exists chat_access_log_admin_idx
  on public.chat_access_log (admin_user_id, conversation_id, expires_at desc);
create index if not exists chat_access_log_created_idx
  on public.chat_access_log (created_at desc);

alter table public.chat_access_log enable row level security;

-- Lettura: il Team. Scrittura: solo il server con la chiave di servizio.
drop policy if exists "chat_access_log_select_superadmin" on public.chat_access_log;
create policy "chat_access_log_select_superadmin"
  on public.chat_access_log for select
  using (public.is_superadmin(auth.uid()));

-- La RLS è per riga: senza revoca, PostgREST esporrebbe comunque la tabella
-- in scrittura ai ruoli anon e authenticated (vedi 0046, 0056).
revoke all on public.chat_access_log from anon, authenticated;
grant select on public.chat_access_log to authenticated;

-- =========================================
-- Il superadmin non legge più le chat dal browser
-- =========================================
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
  );

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
  );

notify pgrst, 'reload schema';
