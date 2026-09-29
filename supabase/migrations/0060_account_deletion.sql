-- 0060 — Richieste di cancellazione dell'account
--
-- CONTESTO
-- L'informativa privacy e due articoli del centro assistenza promettevano che
-- una persona potesse chiedere la cancellazione del proprio account. Non
-- esisteva alcun modo di farlo: l'unica cancellazione possibile era quella che
-- un amministratore esegue a mano, e nessuno la riceveva.
--
-- PERCHÉ UNA RICHIESTA IN DUE TEMPI E NON UN PULSANTE CHE CANCELLA
-- Su questo schema la cancellazione non è un `delete`. Cinque tabelle —
-- `leads`, `contact_messages`, `artist_applications`, `consultations`,
-- `email_log` — non sono legate a `auth.users` e sopravvivono al cascade; i file
-- su bunny.net il cascade non li raggiunge affatto; e i messaggi di una
-- conversazione hanno un altro lato che ha diritto a conservare i propri. Un
-- pulsante che promettesse di cancellare tutto e ne cancellasse metà
-- dichiarerebbe una cosa non vera.
--
-- Quindi: la richiesta si registra qui, si conferma via email, e alla conferma
-- l'account viene DISATTIVATO subito — accesso chiuso, profilo tolto dal
-- pubblico. La rimozione definitiva resta un passaggio controllato entro 30
-- giorni, con la procedura scritta in docs/REGISTRO_TRATTAMENTI.md §6.
--
-- Additiva: nessuna tabella esistente viene toccata.

create table if not exists public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Il token NON si conserva in chiaro: se ne conserva l'impronta. Chi legge
  -- questa tabella — un amministratore, un backup finito dove non doveva — non
  -- deve poter confermare la cancellazione dell'account di qualcun altro.
  token_hash    text not null,

  reason        text,
  requested_at  timestamptz not null default now(),
  expires_at    timestamptz not null,

  -- Lo stato si ricava dalle date, senza un enum da mantenere allineato:
  --   confermata  → confirmed_at non nullo
  --   annullata   → cancelled_at non nullo
  --   completata  → completed_at non nullo
  --   in attesa   → nessuna delle tre
  confirmed_at  timestamptz,
  cancelled_at  timestamptz,
  completed_at  timestamptz,

  -- Cosa è stato cambiato per disattivare, così si può tornare indietro finché
  -- la rimozione definitiva non è stata eseguita. Una disattivazione da cui non
  -- si può tornare indietro è una cancellazione anticipata, e i 30 giorni
  -- esistono proprio perché il ripensamento sia possibile.
  restore_state jsonb
);

comment on table public.account_deletion_requests is
  'Richieste di cancellazione account: registrate qui, confermate via email, e revocabili finché la rimozione definitiva non è avvenuta.';
comment on column public.account_deletion_requests.token_hash is
  'sha256 del token inviato per email. Il token in chiaro non esiste da nessuna parte se non nella casella di posta dell''interessato.';
comment on column public.account_deletion_requests.restore_state is
  'Stato precedente di ciò che la disattivazione ha modificato (es. lo stato dei profili artista), per poterlo ripristinare.';

-- Una sola richiesta aperta per volta è garantita dal codice, non da un vincolo:
-- un vincolo qui impedirebbe di riaprirne una dopo un annullamento.
create unique index if not exists account_deletion_requests_token_idx
  on public.account_deletion_requests (token_hash);
create index if not exists account_deletion_requests_user_idx
  on public.account_deletion_requests (user_id, requested_at desc);

alter table public.account_deletion_requests enable row level security;

-- Ognuno vede le proprie richieste: serve a mostrarle nell'area personale.
drop policy if exists "cancellazioni: leggi le proprie" on public.account_deletion_requests;
create policy "cancellazioni: leggi le proprie"
  on public.account_deletion_requests for select
  using (auth.uid() = user_id);

drop policy if exists "cancellazioni: superadmin legge tutto" on public.account_deletion_requests;
create policy "cancellazioni: superadmin legge tutto"
  on public.account_deletion_requests for select
  using (public.is_superadmin(auth.uid()));

-- Nessuna policy di scrittura: si scrive solo da server con il service role.
-- Una richiesta che l'utente potesse creare o confermare da sé, senza passare
-- dalla posta, renderebbe inutile il secondo passaggio.

-- Doppio strato, come in 0046 e 0049: la RLS filtra le righe, i privilegi
-- governano l'accesso alla tabella. Senza il revoke, `anon` e `authenticated`
-- ereditano i permessi di default dello schema e la tabella resta raggiungibile
-- via PostgREST.
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;

notify pgrst, 'reload schema';
