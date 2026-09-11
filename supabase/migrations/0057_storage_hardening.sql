-- =============================================================================
-- N'arte — Chiusura dei bucket di Storage
-- =============================================================================
-- ⛔ FIX DI SICUREZZA. Complemento della 0056, che chiude le tabelle: questa
-- chiude i file.
--
-- PERCHÉ ADESSO È IL MOMENTO GIUSTO: verificato sul progetto di produzione,
-- `chat-attachments` e `application-videos` sono OGGI VUOTI. Non c'è un solo
-- file da migrare, quindi stringere le regole non può far sparire niente a
-- nessuno. Fra un mese, con le trattative in corso, sarebbe un'altra storia.
--
-- I tre problemi chiusi qui:
--
-- 1. ENUMERAZIONE DEGLI ALLEGATI DI CHAT (il più grave).
--    0012 concede `select` su chat-attachments ad `anon` senza alcun vincolo.
--    `select` su storage.objects è ciò che abilita `list()`: un anonimo con la
--    sola anon key — che è pubblica, sta nel bundle del browser — poteva
--    elencare TUTTI i file di TUTTE le trattative e scaricarli. Dentro ci
--    passano documenti, note vocali e immagini scambiate durante la
--    negoziazione economica. CLAUDE.md dichiara questi allegati "contenuto
--    privato": da qui in poi lo sono anche nei fatti.
--
-- 2. SCRITTURA ANONIMA SU application-videos.
--    0033:39 concede `insert` senza `to authenticated` e senza vincoli: chiunque
--    poteva scrivere file arbitrari nel nostro Storage con la anon key,
--    saltando del tutto la rotta /api/upload-application-video (che pure
--    controlla freno, dimensione, MIME e magic bytes). Su un piano Free da 1 GB
--    è anche un modo per riempire lo spazio in pochi minuti.
--
-- 3. BUCKET EDITORIALI SCRIVIBILI DA CHIUNQUE SIA REGISTRATO.
--    app/api/upload/route.ts limita correttamente `blog`, `format` e
--    `format-video` al superadmin, ma le policy accettavano l'insert da
--    qualunque sessione: il gate di ruolo si saltava passando da PostgREST.
--
-- ⚠️ COSA NON CAMBIA, DI PROPOSITO: i bucket restano `public: true` e gli URL
-- già salvati in colonna continuano a funzionare. Il problema vero era poter
-- ELENCARE i file; un singolo URL contiene un UUID casuale e non è
-- indovinabile. Rendere privato chat-attachments richiederebbe di firmare gli
-- URL anche sul percorso realtime, ed è un lavoro a sé che non vale la pena
-- infilare in un fix di sicurezza — è annotato in fondo come passo successivo.
--
-- Idempotente.
-- =============================================================================

-- =========================================
-- 1. chat-attachments — niente più elenchi
-- =========================================
drop policy if exists "chat-attachments read public"        on storage.objects;
drop policy if exists "chat-attachments insert authenticated" on storage.objects;

-- Lettura: solo le due parti della conversazione, o il superadmin.
-- Il primo segmento del path è il conversation_id (lib/chat/upload.ts costruisce
-- `${conversationId}/${uuid}-${nome}`), quindi è agganciabile a `conversations`.
create policy "chat-attachments read party"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      public.is_superadmin(auth.uid())
      or exists (
        select 1
          from public.conversations c
          left join public.artists    a on a.id = c.artist_id
          left join public.organizers o on o.id = c.organizer_id
         where c.id::text = (storage.foldername(name))[1]
           and (a.user_id = auth.uid() or o.user_id = auth.uid())
      )
    )
  );

-- Scrittura: solo dentro la cartella di una conversazione di cui si fa parte.
-- Prima bastava essere autenticati per scrivere nella cartella di chiunque.
create policy "chat-attachments insert party"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
        from public.conversations c
        left join public.artists    a on a.id = c.artist_id
        left join public.organizers o on o.id = c.organizer_id
       where c.id::text = (storage.foldername(name))[1]
         and (a.user_id = auth.uid() or o.user_id = auth.uid())
    )
  );

-- =========================================
-- 2. application-videos — non si scrive dal browser
-- =========================================
-- L'upload passa solo da app/api/upload-application-video/route.ts, che usa il
-- service role: il ruolo `anon` non ha alcun bisogno di scrivere qui.
drop policy if exists "application-videos anon insert"   on storage.objects;
drop policy if exists "application-videos public select" on storage.objects;

-- I video di candidatura sono dati personali di chi si candida: li guarda chi
-- valuta la candidatura, non il pubblico.
create policy "application-videos superadmin select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'application-videos' and public.is_superadmin(auth.uid()));

-- =========================================
-- 3. Bucket editoriali — solo superadmin
-- =========================================
-- Allineati al gate che app/api/upload/route.ts applica già (KIND_SOLO_ADMIN).
-- La lettura resta pubblica: sono copertine e video che stanno sul sito.
do $$
declare b text;
begin
  foreach b in array array['blog-covers','format-covers','event-videos']
  loop
    execute format('drop policy if exists %I on storage.objects', b || ' auth insert');
    execute format($f$
      create policy %I on storage.objects for insert to authenticated
        with check (bucket_id = %L and public.is_superadmin(auth.uid()))
    $f$, b || ' superadmin insert', b);
  end loop;
end $$;

-- =========================================
-- VERIFICA — da eseguire subito dopo
-- =========================================
-- 1) Le policy attive sui bucket toccati:
--
--   select policyname, cmd, roles
--     from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname ilike any (array['chat-attachments%','application-videos%','%covers%','event-videos%'])
--    order by policyname;
--
-- 2) Controprova dal browser, da fare dopo: un anonimo che esegue
--    supabase.storage.from('chat-attachments').list() deve ricevere un errore
--    o una lista vuota, non l'elenco dei file.
--
-- 3) Controprova funzionale: inviare un allegato in una chat di prova e
--    verificare che si carichi e si veda. Se l'upload fallisce con "new row
--    violates row-level security", il path non comincia con il conversation_id
--    e va corretto lib/chat/upload.ts.
--
-- =========================================
-- PASSO SUCCESSIVO (non in questa migration)
-- =========================================
-- Per rendere gli allegati davvero privati e non solo non-elencabili:
-- portare il bucket a `public: false`, salvare il PATH invece dell'URL in
-- messages.attachment_url, e generare URL firmati in lib/chat/queries.ts e sul
-- percorso realtime. Va fatto finché il bucket è ancora piccolo.
