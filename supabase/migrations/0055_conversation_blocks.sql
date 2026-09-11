-- =========================================
-- N'arte — Feature C: blocco di un utente in una singola conversazione
-- =========================================
-- Interamente additiva: crea solo la tabella conversation_blocks (+ indici,
-- RLS, publication realtime). Non tocca conversations, messages né alcuna
-- colonna esistente. Con la tabella vuota — cioè prima di qualunque blocco
-- creato da un superadmin — la chat si comporta esattamente come oggi: nessun
-- default cambia, nessuna riga esistente viene letta o modificata.
--
-- L'autorizzazione nell'app NON passa dalle RLS (lib/chat/actions.ts scrive
-- sempre con la service role): questa tabella ha solo policy di SELECT.
-- Le scritture (blocco/sblocco) avvengono esclusivamente da lib/chat/moderation.ts
-- tramite createAdminClient(), esattamente come per l'insert dei messaggi.
--
-- Idempotente: eseguibile più volte senza effetti collaterali.

-- =========================================
-- 1. Tabella
-- =========================================
create table if not exists public.conversation_blocks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_role role_enum not null,
  reason text not null check (length(btrim(reason)) between 3 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references auth.users(id) on delete set null,
  lift_note text
);

-- Un solo blocco ATTIVO per (conversazione, utente): non impedisce la storia
-- di blocchi/sblocchi passati, solo la sovrapposizione di due blocchi vivi.
create unique index if not exists conversation_blocks_active_unique_idx
  on public.conversation_blocks (conversation_id, blocked_user_id)
  where lifted_at is null;

create index if not exists conversation_blocks_conversation_idx
  on public.conversation_blocks (conversation_id);

-- =========================================
-- 2. RLS — sola lettura, per le due parti della conversazione o il superadmin
-- =========================================
alter table public.conversation_blocks enable row level security;

drop policy if exists "conversation_blocks_select" on public.conversation_blocks;
create policy "conversation_blocks_select"
  on public.conversation_blocks for select using (
    exists (
      select 1
      from public.conversations c
      left join public.artists a on a.id = c.artist_id
      left join public.organizers o on o.id = c.organizer_id
      where c.id = conversation_blocks.conversation_id
        and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
    or public.is_superadmin(auth.uid())
  );

-- Nessuna policy di insert/update/delete: il blocco/sblocco passa solo dalla
-- service role (lib/chat/moderation.ts), mai da un client con RLS.

-- =========================================
-- 3. Realtime publication (idempotente)
-- =========================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_blocks'
    ) then
      execute 'alter publication supabase_realtime add table public.conversation_blocks';
    end if;
  end if;
end $$;
