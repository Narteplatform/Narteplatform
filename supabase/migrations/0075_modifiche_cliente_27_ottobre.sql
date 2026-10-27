-- 0075 — Modifiche richieste dal cliente (27/10/2026)
--
-- CONTESTO
-- Tre richieste del cliente hanno bisogno di spazio nel database. Ognuna è
-- indipendente dalle altre:
--
--   1. Candidatura come artista singolo o come band. Chi si candida sceglie
--      «Artista singolo» o «Band»; per la band indica quanti sono. Il dato
--      passa al profilo all'approvazione, compare sulla pagina pubblica e fa
--      da filtro nel catalogo. Null = non indicato (tutti i profili esistenti).
--
--   2. Testo completo delle email negli «Ultimi invii» dell'admin. Il registro
--      salvava destinatari, oggetto ed esito ma non il corpo. Da ora si salva
--      l'HTML; le email con link di accesso (invito, recupero password,
--      conferma cancellazione…) NON si salvano, e `body_source` lo dice:
--        salvato   = corpo scritto al momento dell'invio
--        provider  = corpo recuperato in seguito da Brevo/Resend
--        riservato = email con link di accesso, corpo volutamente non salvato
--      Il corpo segue la conservazione del registro (365 giorni, cron retention).
--
--   3. Proposte Max verso i privati registrati. La segnalazione di un artista
--      può andare anche a un utente privato (ruolo `user`): si tiene il
--      collegamento al suo profilo come già si fa per organizzatori e strutture.
--      Chiude anche la lettura diretta delle segnalazioni da parte dell'artista
--      (policy «owner»): vedeva l'email del destinatario, che ora può essere
--      quella di un privato.
--
-- INDIPENDENTE dalle migration in attesa (0069/0070/0071/0073/0074): qualunque
-- ordine. Il codice è già online e tollera ogni parte mancante.
--
-- ATTENZIONE 0070: la 0070 revoca a anon la lettura di `artists` e la riconcede
-- solo su un elenco di colonne. Un `revoke` a livello di tabella cancella anche
-- i privilegi di colonna concessi prima: se la 0070 viene eseguita DOPO questa,
-- rieseguire questa (è idempotente) per ridare a anon `formazione` e `componenti`.
--
-- Additiva e idempotente. Non modifica né cancella righe esistenti.

-- =========================================
-- 1. Artista singolo / band
-- =========================================
alter table public.artists
  add column if not exists formazione text
    check (formazione is null or formazione in ('solista', 'band')),
  add column if not exists componenti smallint
    check (componenti is null or componenti between 2 and 30);

alter table public.artist_applications
  add column if not exists formazione text
    check (formazione is null or formazione in ('solista', 'band')),
  add column if not exists componenti smallint
    check (componenti is null or componenti between 2 and 30);

comment on column public.artists.formazione is
  'solista | band. Null = non indicato (profili nati prima della 0075).';
comment on column public.artists.componenti is
  'Numero di componenti della band (2-30). Null per i solisti o se non indicato.';

-- Il catalogo filtra per formazione anche per gli ospiti. Se la 0070 è già
-- applicata anon legge solo le colonne concesse: si aggiungono queste due.
-- Se non è applicata, anon legge già tutta la tabella e il grant non cambia nulla.
grant select (formazione, componenti) on public.artists to anon;

-- =========================================
-- 2. Corpo delle email nel registro
-- =========================================
alter table public.email_log
  add column if not exists body_html text,
  add column if not exists body_source text
    check (body_source is null or body_source in ('salvato', 'provider', 'riservato'));

comment on column public.email_log.body_html is
  'HTML dell''email inviata. Null per gli invii precedenti alla 0075 e per quelli riservati.';

-- =========================================
-- 3. Proposte Max verso i privati
-- =========================================
alter table public.profile_referrals
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

comment on column public.profile_referrals.profile_id is
  'Presente se il destinatario è un utente privato registrato (ruolo user).';

-- Il proprietario dell'artista leggeva via PostgREST tutte le colonne delle
-- proprie segnalazioni, email del destinatario compresa. Con i privati fra i
-- destinatari è il dato personale di un terzo. La dashboard legge dal server
-- con la service role e mostra solo il nome delle strutture: la policy non
-- serve più, si toglie. Resta la lettura del Team (superadmin).
drop policy if exists "profile_referrals_select_owner" on public.profile_referrals;
