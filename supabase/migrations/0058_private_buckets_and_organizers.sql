-- =============================================================================
-- N'arte — Bucket privati e anagrafica organizzatori riservata
-- =============================================================================
-- Chiude i due residui rimasti dopo 0056 e 0057.
--
-- ⚠️ RICHIEDE IL CODICE CORRISPONDENTE GIÀ ONLINE. Non è una migration
-- autonoma: da quando i bucket sono privati, gli allegati si aprono solo con
-- URL firmati, che li genera il codice (lib/storage/signed.ts). Se questa
-- migration viene eseguita PRIMA del deploy, per la finestra intermedia gli
-- allegati di chat e i video di candidatura non si aprono.
--
-- Non si perde nulla in nessun caso: i file restano al loro posto, cambia solo
-- come se ne ottiene l'indirizzo. E oggi i due bucket sono comunque VUOTI —
-- verificato: zero file, zero candidature con video, zero allegati in chat.
--
-- Idempotente.
-- =============================================================================

-- =========================================
-- 1. I due bucket diventano privati
-- =========================================
-- Finora restavano `public: true`: la 0057 aveva tolto la possibilità di
-- ELENCARE i file, ma chi possedeva l'indirizzo esatto di un file poteva
-- ancora scaricarlo senza alcun account, per sempre. Un indirizzo firmato
-- invece scade, quindi un link inoltrato o finito in un log smette di valere.
--
-- Perché proprio questi due e non gli altri: qui dentro passano i documenti
-- delle trattative e i video delle candidature, cioè dati personali. Copertine,
-- gallerie ed eventi restano pubblici perché è il loro mestiere: stanno sul
-- sito, li deve vedere chiunque.
update storage.buckets
   set public = false
 where id in ('chat-attachments', 'application-videos');

-- =========================================
-- 2. Anagrafica organizzatori e strutture
-- =========================================
-- 0009 le apriva in lettura a chiunque con `using (true)`. Ma `organizers`
-- contiene `phone` e `bio`, e `venues` contiene `phone`, `email` e `address`:
-- un anonimo con la sola anon key poteva scaricarsi l'elenco completo dei
-- contatti. Verificato in produzione prima di questa modifica.
--
-- ⚠️ La vetrina pubblica NON si rompe: il nome e l'avatar dell'organizzatore
-- che ha confermato una data arrivano dalla vista `booking_requests_public`,
-- che seleziona solo le colonne mostrabili (display_name, avatar_url, nome e
-- città della struttura) e — non avendo `security_invoker` — gira con i
-- privilegi del proprietario, quindi non dipende da queste policy.
--
-- Verificato inoltre call-site per call-site: ogni lettura di `organizers` e
-- `venues` nel codice passa da createAdminClient() (service role), che ignora
-- la RLS. Nessun componente client le interroga.
drop policy if exists "organizers public read" on public.organizers;
create policy "organizers read own or admin"
  on public.organizers for select
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));

drop policy if exists "venues public read" on public.venues;
create policy "venues read own or admin"
  on public.venues for select
  using (
    public.is_superadmin(auth.uid())
    or exists (
      select 1 from public.organizers o
       where o.id = organizer_id and o.user_id = auth.uid()
    )
  );

-- =========================================
-- VERIFICA — da eseguire subito dopo
-- =========================================
-- 1) I bucket sono privati (attesi due `false`):
--
--   select id, public from storage.buckets
--    where id in ('chat-attachments','application-videos');
--
-- 2) La vetrina pubblica regge ancora — deve continuare a restituire righe con
--    il nome dell'organizzatore, esattamente come prima:
--
--   select organizer_name, venue_name from public.booking_requests_public limit 5;
--
-- 3) Controprova dal sito, dopo il deploy: aprire il profilo pubblico di un
--    artista con una data confermata e verificare che il banner mostri ancora
--    nome e struttura. Poi, da amministratore, aprire /admin/artisti e
--    controllare che il video di una candidatura parta.
