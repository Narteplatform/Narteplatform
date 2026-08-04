-- =========================================
-- N'arte — Preferiti degli utenti su database
-- =========================================
-- Prima di questa migration i preferiti vivevano SOLO in localStorage: non
-- seguivano l'utente da un dispositivo all'altro e non erano contabili. Il
-- conteggio dei salvataggi è una delle quattro metriche di /dashboard/statistiche.
--
-- Additiva e idempotente. I preferiti degli ospiti restano in localStorage:
-- questa tabella copre solo gli utenti autenticati.
--
-- ⚠️  PRIMA TABELLA DEL PROGETTO IN CUI IL CLIENT SCRIVE DAVVERO.
--
--     Ovunque altrove la scrittura passa da createAdminClient() e RLS è una
--     rete di sicurezza inerte. Qui il proprietario legittimo della riga È
--     l'utente, quindi le Server Action usano il client UTENTE
--     (lib/supabase/server.ts → createClient()) e RLS diventa l'enforcement
--     reale, non decorativo. Conseguenza diretta: le policy qui sotto sono
--     l'unica cosa che impedisce a un utente di scrivere i preferiti di un
--     altro. Non allentarle, e non passare all'admin client "per comodità".

create table if not exists public.artist_favorites (
  user_id    uuid not null references auth.users(id)     on delete cascade,
  artist_id  uuid not null references public.artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

-- La PK serve a "i miei preferiti"; questo indice serve a "quanti hanno
-- salvato l'artista X", cioè alla statistica del piano Max.
create index if not exists artist_favorites_artist_idx
  on public.artist_favorites(artist_id);

comment on table public.artist_favorites is
  'Preferiti degli utenti AUTENTICATI. Gli ospiti restano su localStorage e non sono contabilizzati in nessuna statistica: la UI deve dirlo esplicitamente.';

alter table public.artist_favorites enable row level security;

-- L'artista NON può leggere chi lo ha salvato: la select è ristretta al
-- proprietario delle righe. Il conteggio per le statistiche passa dal server
-- con service role, che vede l'aggregato e mai i nomi.
drop policy if exists "artist_favorites select own" on public.artist_favorites;
create policy "artist_favorites select own"
  on public.artist_favorites for select
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));

-- `is_public` nella with check impedisce di salvare profili sospesi o non
-- ancora approvati. La sottoquery attraversa le policy di artists, che
-- ammettono già la lettura pubblica dei profili is_public: nessuna ricorsione
-- (la ricorsione di 0001 è chiusa da 0003 con is_superadmin security definer).
drop policy if exists "artist_favorites insert own" on public.artist_favorites;
create policy "artist_favorites insert own"
  on public.artist_favorites for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.artists a where a.id = artist_id and a.is_public)
  );

drop policy if exists "artist_favorites delete own" on public.artist_favorites;
create policy "artist_favorites delete own"
  on public.artist_favorites for delete
  using (user_id = auth.uid());

-- Un preferito si crea o si toglie: non esiste un UPDATE legittimo. Togliere il
-- privilegio evita che una policy scritta male in futuro apra una scrittura che
-- nessuno voleva.
revoke update on public.artist_favorites from anon, authenticated;

-- Gli ospiti non leggono e non scrivono: auth.uid() è NULL e le policy li
-- escludono già, ma il revoke lo rende esplicito e indipendente dalle policy.
revoke all on public.artist_favorites from anon;
