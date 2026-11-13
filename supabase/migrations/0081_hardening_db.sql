-- 0081 — Hardening del database: privilegi mancanti, indici sulle chiavi
--        esterne, formati e dimensioni dei bucket di Storage
--
-- CONTESTO
-- Tre lacune trovate rileggendo tutte le migration fino alla 0080 e il codice
-- che le usa. Nessuna è un buco aperto come quello chiuso dalla 0056, ma sono
-- tutte "un solo strato di difesa dove ne servono due".
--
--   1. PRIVILEGI. Dodici tabelle hanno la RLS attiva ma non sono mai passate da
--      un `revoke … from anon, authenticated`. Supabase concede di default ad
--      anon e authenticated tutti i privilegi sullo schema public: a fermare
--      PostgREST è solo la RLS, e basta una policy scritta male (o aggiunta per
--      sbaglio domani) per riaprire la tabella a chiunque abbia la anon key,
--      che è pubblica. Esempi concreti di oggi:
--        - platform_feedback ha una policy di INSERT per gli utenti: un account
--          qualsiasi può scrivere feedback direttamente via PostgREST, saltando
--          la Server Action (validazione Zod, freni).
--        - consultant_slots ha una policy di UPDATE per il consulente: può
--          riscrivere orario, durata e stato dei propri slot senza passare dal
--          pannello.
--        - collaborations e admin_page_permissions hanno policy di scrittura
--          per il superadmin: scrivere dal browser non è un percorso previsto.
--      Per ciascuna tabella si revoca SOLO ciò che nessun percorso legittimo usa.
--      Il metodo: ogni riferimento nel codice (`.from("<tabella>")`, join
--      incorporati, sottoscrizioni realtime, RPC, policy di altre tabelle che la
--      interrogano) controllato uno per uno. Il service role, usato da
--      createAdminClient() e dalle funzioni security definer, ignora i grant:
--      nulla di ciò che passa di lì cambia.
--
--   2. INDICI. Alcune chiavi esterne non hanno un indice che le abbia come
--      prima colonna. Servono a due cose: ai filtri del codice (es. tutte le
--      letture `artists.user_id = …`, una trentina, più le policy RLS che
--      fanno lo stesso) e alle cancellazioni a cascata / `set null`, che senza
--      indice scandiscono l'intera tabella figlia per ogni riga cancellata.
--
--   3. STORAGE. Solo artist-videos (0036) e report-attachments (0070) hanno un
--      elenco di formati ammessi. Gli altri bucket accettano qualunque tipo di
--      file, SVG compreso (un SVG può contenere script ed è servito da un
--      dominio pubblico). Il controllo applicativo c'è (app/api/upload/route.ts)
--      ma le policy su storage.objects lasciano caricare alcuni bucket anche
--      direttamente con la anon key e una sessione (es. "artist-audio insert
--      authenticated", 0018:16): il limite del bucket vale per OGNI percorso.
--
-- NOTE OPERATIVE
--   - CREATE INDEX senza CONCURRENTLY: il SQL editor esegue tutto in una
--     transazione, e CONCURRENTLY non vi è ammesso. Il lucchetto (SHARE) blocca
--     le scritture sulla tabella per la durata della costruzione: con le
--     dimensioni attuali (decine/centinaia di righe) sono millisecondi.
--   - I limiti dei bucket valgono solo per i caricamenti NUOVI: i file già
--     presenti, di qualunque tipo, restano dove sono e continuano a servirsi.
--   - Tutti i limiti di dimensione restano sotto il tetto globale del piano
--     Free di Supabase (50 MB, vedi 0036): un valore superiore farebbe fallire
--     i caricamenti.
--
-- Additiva e idempotente: rieseguirla non cambia nulla. Non modifica né
-- cancella alcuna riga di dati (gli unici UPDATE sono sulla configurazione di
-- storage.buckets). Ogni blocco controlla che l'oggetto esista, quindi non
-- fallisce su una tabella mai creata o già eliminata.
-- INDIPENDENTE dalle altre migration in attesa: qualunque ordine.

-- =============================================================================
-- 1. PRIVILEGI DI TABELLA
-- =============================================================================
-- Legenda delle decisioni:
--   revoke all      → nessun client con sessione la usa: solo service role.
--   revoke scritture → la lettura serve (pagina pubblica, realtime, policy di
--                      un'altra tabella); insert/update/delete no.

-- -----------------------------------------------------------------------------
-- 1.1 admin_page_permissions — revoke all
-- -----------------------------------------------------------------------------
-- Letta e scritta solo con service role:
--   middleware.ts:124-131                         (client con SUPABASE_SERVICE_ROLE_KEY)
--   lib/admin/permissions.ts:29-31,59-60           (createAdminClient)
--   app/(admin)/admin/impostazioni/page.tsx:15,33  (createAdminClient)
--   app/(admin)/admin/impostazioni/_actions.ts:113-130,154-172 (createAdminClient)
-- La policy "perms write root only" (0024:44) apriva la scrittura via PostgREST.
do $$
begin
  if to_regclass('public.admin_page_permissions') is not null then
    revoke all on table public.admin_page_permissions from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.2 artist_media_submissions — revoke all
-- -----------------------------------------------------------------------------
-- Coda di moderazione: tutto via service role e RPC security definer.
--   app/(artist)/dashboard/_actions.ts:304,457,593,609     (admin)
--   app/(admin)/admin/moderazione/_actions.ts:178,219,402  (admin + RPC 0052)
--   app/(admin)/admin/artisti/[id]/page.tsx:52,78          (createAdminClient)
--   lib/media/moderation-queries.ts:106,196,241            (admin)
--   components/dashboard/AppShellData.tsx:141,180,204      (admin)
-- La policy di lettura "media_submissions read own or admin" (0051) non è
-- usata da nessun client di sessione.
do $$
begin
  if to_regclass('public.artist_media_submissions') is not null then
    revoke all on table public.artist_media_submissions from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.3 billing_customers — revoke all
-- -----------------------------------------------------------------------------
-- Anagrafica Stripe: solo service role.
--   app/(artist)/dashboard/abbonamento/_actions.ts:88-106,268-270 (admin)
--   app/api/stripe/webhook/route.ts:90-92,126                     (admin)
--   lib/inviti/ciclo.ts:286-287                                   (admin)
do $$
begin
  if to_regclass('public.billing_customers') is not null then
    revoke all on table public.billing_customers from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.4 booking_messages — tabella eliminata
-- -----------------------------------------------------------------------------
-- Eliminata da 0013_chat_v2.sql:18 (sostituita da conversations/messages).
-- Nessun riferimento nel codice. Il blocco serve solo se fosse stata ricreata
-- a mano: in quel caso nessuno deve poterla raggiungere.
do $$
begin
  if to_regclass('public.booking_messages') is not null then
    revoke all on table public.booking_messages from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.5 collaborations — revoke scritture, la lettura resta
-- -----------------------------------------------------------------------------
-- LETTURA PUBBLICA, da mantenere: lib/data/collaborations.ts:24-28 usa il
-- client di sessione (anon per i visitatori, authenticated per chi è loggato)
-- per il nastro dei loghi in home e su /collaborazioni.
-- Scritture solo via service role:
--   app/(admin)/admin/contenuti/_actions.ts:252-316 (admin)
do $$
begin
  if to_regclass('public.collaborations') is not null then
    revoke insert, update, delete, truncate, references, trigger
      on table public.collaborations from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.6 consultant_slots — revoke all ad anon, scritture ad authenticated
-- -----------------------------------------------------------------------------
-- Tutte le letture e scritture del codice passano da service role:
--   app/(admin)/admin/consulenza/_actions.ts:76,121,135,189,203,458-588 (admin)
--   app/(artist)/dashboard/consulenza/page.tsx:17-24,60  (admin, anche join)
--   app/(user)/artisti/_actions.ts:57-61                 (admin)
--   components/dashboard/AppShellData.tsx:799-812        (admin, join !inner)
--   lib/reminders/promemoria.ts:338                      (admin)
-- La SELECT resta ad authenticated per prudenza: le policy di `consultations`
-- (0019_consultant_role.sql:76-104) interrogano consultant_slots in una
-- sottoquery, che gira con i privilegi di chi legge. Senza SELECT qui, una
-- lettura di consultations da sessione fallirebbe con "permission denied"
-- invece di filtrare le righe. Oggi nessun client di sessione la fa, ma il
-- dato (orari degli slot) non è sensibile e la rottura sarebbe silenziosa.
-- Ad anon si toglie anche la lettura: nessun percorso la usa.
do $$
begin
  if to_regclass('public.consultant_slots') is not null then
    revoke all on table public.consultant_slots from anon;
    revoke insert, update, delete, truncate, references, trigger
      on table public.consultant_slots from authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.7 conversation_blocks — revoke all ad anon, scritture ad authenticated
-- -----------------------------------------------------------------------------
-- LETTURA DAL BROWSER, da mantenere ad authenticated: hooks/useConversationBlock.ts
-- :53-66 si iscrive a postgres_changes su questa tabella con il client del
-- browser. Realtime verifica la RLS eseguendo la SELECT con il ruolo
-- dell'utente: senza il privilegio SELECT il composer non si spegnerebbe più in
-- tempo reale quando il team blocca un utente.
-- Scritture solo via service role (0055:10-13):
--   lib/chat/moderation.ts:103-122,191-205 (admin)
-- Letture server: lib/chat/queries.ts:115,143 e lib/chat/actions.ts:80-82 (admin).
-- La chat richiede il login: anon non ha alcun motivo di leggerla.
do $$
begin
  if to_regclass('public.conversation_blocks') is not null then
    revoke all on table public.conversation_blocks from anon;
    revoke insert, update, delete, truncate, references, trigger
      on table public.conversation_blocks from authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.8 media_assets — revoke all
-- -----------------------------------------------------------------------------
-- Registro dei file su Bunny, "si legge e si scrive solo via service role"
-- (0050:134-136):
--   lib/storage/bunny/registry.ts:30-31             (admin)
--   lib/legal/completa-cancellazione.ts:505-516,813 (admin)
do $$
begin
  if to_regclass('public.media_assets') is not null then
    revoke all on table public.media_assets from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.9 platform_feedback — revoke all
-- -----------------------------------------------------------------------------
-- La policy "platform_feedback insert own" (0028:31) permette a ogni account
-- di inserire direttamente via PostgREST. Il codice scrive e legge solo con
-- service role:
--   lib/feedback/_actions.ts:249,278-282,322,344 (admin)
--   lib/feedback/queries.ts:522-525,592-594      (admin)
--   components/dashboard/AppShellData.tsx:213    (admin)
do $$
begin
  if to_regclass('public.platform_feedback') is not null then
    revoke all on table public.platform_feedback from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.10 rate_limits — revoke all
-- -----------------------------------------------------------------------------
-- Nessuna policy (0048:47-49), toccata solo dalle funzioni security definer
-- rate_limit_hit / rate_limits_prune, eseguibili solo dal service role
-- (0048:97-98,123-124) e chiamate con admin:
--   lib/security/rate-limit.ts:91-92
--   app/api/cron/retention/route.ts:239
-- Le funzioni security definer girano come proprietario: il revoke non le tocca.
do $$
begin
  if to_regclass('public.rate_limits') is not null then
    revoke all on table public.rate_limits from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.11 stripe_webhook_events — revoke all
-- -----------------------------------------------------------------------------
-- Contiene i payload integrali di Stripe. Solo service role:
--   app/api/stripe/webhook/route.ts:182-286 (admin)
--   app/api/cron/retention/route.ts:75,173  (admin)
-- Le funzioni della 0082 (stripe_evento_prendi/rilascia) sono security definer.
do $$
begin
  if to_regclass('public.stripe_webhook_events') is not null then
    revoke all on table public.stripe_webhook_events from anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1.12 subscriptions — revoke all
-- -----------------------------------------------------------------------------
-- Ledger degli abbonamenti, scritto solo dal webhook. Ogni lettura è admin:
--   app/(artist)/dashboard/abbonamento/page.tsx:62-64
--   app/(artist)/dashboard/abbonamento/_actions.ts:118-120,312-314
--   app/api/stripe/webhook/route.ts:151
--   lib/billing/shooting.ts:68, lib/billing/promemoria-rinnovo.ts:32,
--   lib/inviti/ciclo.ts:186,300, lib/admin/sospensione.ts:92,
--   lib/legal/{export-dati.ts:162,cancellazione.ts:316,completa-cancellazione.ts:576}
-- Le funzioni che calcolano il piano (account_tier, 0078:143-170; trigger
-- subscriptions_sync_tier, 0042) sono security definer: non dipendono da
-- questi privilegi.
do $$
begin
  if to_regclass('public.subscriptions') is not null then
    revoke all on table public.subscriptions from anon, authenticated;
  end if;
end $$;

-- =============================================================================
-- 2. INDICI SULLE CHIAVI ESTERNE
-- =============================================================================
-- Verificato su tutte le migration 0001-0080 che nessun indice esistente abbia
-- queste colonne come PRIMA colonna (un indice composto aiuta solo se la
-- colonna è in testa). Ogni indice si crea solo se tabella e colonna esistono.
--
--   booking_requests(venue_id)       FK venues on delete set null (0009:116);
--                                    filtro in app/(organizer)/organizzatore/calendario/page.tsx:53
--   profile_referrals(venue_id)      FK venues on delete set null (0068:34)
--   content_reports(reporter_user_id) FK auth.users on delete set null (0063:40);
--                                    filtro in lib/legal/completa-cancellazione.ts:441
--   media_assets(owner_user_id)      FK auth.users on delete set null (0050:121);
--                                    filtro in lib/legal/completa-cancellazione.ts:508
--   leads(requester_user_id)         la colonna della 0001:174; FK auth.users on
--                                    delete set null; filtro in completa-cancellazione.ts:385
--   artists(user_id)                 FK auth.users on delete set null (0001:87). La più
--                                    importante: ~30 filtri `.eq("user_id", …)` nel codice
--                                    e le policy RLS (`a.user_id = auth.uid()`, es. 0055:56,
--                                    0057:67) la usano a ogni lettura. Non unique: un
--                                    account può avere più profili (0042).
--   consultations(user_id)           FK auth.users on delete set null (0015:42); filtri in
--                                    dashboard/consulenza/page.tsx:24, _actions.ts:294,
--                                    lib/legal/export-dati.ts:228
--   messages(offer_booking_request_id) FK booking_requests on delete set null (0013:84):
--                                    senza indice ogni richiesta cancellata scandisce
--                                    tutta la tabella dei messaggi, la più grande del
--                                    database. Parziale: solo le offerte collegate.
--   notifications(artist_id)         FK artists on delete cascade (0073:29): stessa
--                                    ragione, su una tabella che cresce a ogni evento.
--                                    Parziale: solo le notifiche legate a un profilo.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('booking_requests_venue_idx',       'booking_requests',  'venue_id',                 null),
      ('profile_referrals_venue_idx',      'profile_referrals', 'venue_id',                 null),
      ('content_reports_reporter_idx',     'content_reports',   'reporter_user_id',         null),
      ('media_assets_owner_idx',           'media_assets',      'owner_user_id',            null),
      ('leads_requester_idx',              'leads',             'requester_user_id',        null),
      ('artists_user_idx',                 'artists',           'user_id',                  null),
      ('consultations_user_idx',           'consultations',     'user_id',                  null),
      ('messages_offer_booking_idx',       'messages',          'offer_booking_request_id', 'offer_booking_request_id is not null'),
      ('notifications_artist_idx',         'notifications',     'artist_id',                'artist_id is not null')
    ) as t(indice, tabella, colonna, condizione)
  loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = r.tabella
         and column_name = r.colonna
    ) then
      execute format(
        'create index if not exists %I on public.%I (%I)%s',
        r.indice, r.tabella, r.colonna,
        case when r.condizione is null then '' else ' where ' || r.condizione end
      );
    else
      raise notice 'Indice % saltato: manca la colonna %.%', r.indice, r.tabella, r.colonna;
    end if;
  end loop;
end $$;

-- =============================================================================
-- 3. STORAGE — formati e dimensioni ammessi per bucket
-- =============================================================================
-- Gli elenchi seguono quelli chiusi del codice, non li allargano:
--   immagini → lib/storage/bunny/paths.ts (IMAGE_EXT), usati da
--              app/api/upload/route.ts su ENTRAMBI i rami (Bunny e Supabase).
--              Il tipo salvato è quello rilevato dai byte
--              (lib/security/file-signature.ts:45-51): jpeg, png, gif, webp,
--              avif. NIENTE SVG. Le compressioni nel browser producono
--              image/jpeg (lib/upload/compressImage.ts:227).
--   audio    → lib/storage/bunny/paths.ts (AUDIO_EXT), applicato da
--              app/api/upload/route.ts e da /api/upload/audio/sign. Il tipo
--              salvato su Supabase è quello dichiarato, già filtrato su questo
--              elenco: va ammesso per intero, alias compresi.
--   video    → VIDEO_MIME di app/api/upload/route.ts e di
--              app/api/upload-application-video/route.ts:37 (mp4, webm, mov).
--
-- Dimensioni:
--   immagini 5 MB → il codice si ferma a 4 MiB (IMAGE_MAX) e Vercel a 4,5 MB
--                   di body: il bucket non scatta mai PRIMA del codice, e
--                   chiude comunque i caricamenti diretti fuori misura.
--   audio   25 MB → AUDIO_MAX di app/api/upload/route.ts e MAX_AUDIO_BYTES della
--                   rotta di firma.
--   video   50 MB → VIDEO_MAX delle due rotte (e tetto del piano Free, 0036).
--
-- Non toccati, di proposito:
--   artist-videos       → già configurato dalla 0036 (mp4, webm, 50 MB).
--   report-attachments  → già configurato dalla 0070 (jpeg, png, webp, pdf, 5 MB).
--   chat-attachments    → SOLO la dimensione (25 MB = MAX di lib/chat/upload.ts:6).
--                         I formati no: il browser carica direttamente con
--                         contentType = file.type, senza alcun elenco chiuso nel
--                         codice. `accept` di components/chat/MessageComposer.tsx
--                         :143,150 è solo un suggerimento al selettore file;
--                         le note vocali arrivano come "audio/webm;codecs=opus"
--                         (components/chat/VoiceRecorder.tsx:14-17); da Windows
--                         uno zip è "application/x-zip-compressed", da iPhone una
--                         foto può essere image/heic. Un elenco qui farebbe
--                         fallire allegati oggi legittimi. Il bucket è privato e
--                         scrivibile solo dalle parti della conversazione (0057).

-- 3.1 Immagini (bucket pubblici)
--   artist-images        → kind artist, avatar           (app/api/upload/route.ts BUCKETS)
--   event-covers         → kind event, event_home
--   venue-images         → kind venue
--   format-covers        → kind format
--   blog-covers          → kind blog, site, site-logo (site/site-logo: solo jpeg/png/webp,
--                          più stretti ancora, lo applica il codice)
--   collaboration-logos  → creato dalla 0001, oggi nessun percorso del codice vi scrive:
--                          si allinea agli altri perché resti chiuso agli SVG.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
       file_size_limit    = 5242880   -- 5 MB
 where id in ('artist-images', 'event-covers', 'venue-images',
              'format-covers', 'blog-covers', 'collaboration-logos');

-- 3.2 Audio
update storage.buckets
   set allowed_mime_types = array['audio/mpeg', 'audio/mp3',
                                  'audio/wav', 'audio/x-wav', 'audio/wave',
                                  'audio/mp4', 'audio/x-m4a', 'audio/aac',
                                  'audio/ogg', 'audio/flac', 'audio/x-flac'],
       file_size_limit    = 26214400  -- 25 MB
 where id = 'artist-audio';

-- 3.3 Video su Supabase (eventi/format e candidature, "fase successiva" per Bunny)
update storage.buckets
   set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime'],
       file_size_limit    = 52428800  -- 50 MB
 where id in ('event-videos', 'application-videos');

-- 3.4 Allegati di chat: solo la dimensione, vedi sopra.
update storage.buckets
   set file_size_limit = 26214400     -- 25 MB
 where id = 'chat-attachments';

notify pgrst, 'reload schema';

-- =============================================================================
-- VERIFICA — sola lettura, da eseguire subito dopo
-- =============================================================================
-- 1) Privilegi rimasti ad anon/authenticated sulle dodici tabelle.
--    Atteso, ESATTAMENTE:
--      collaborations       anon           SELECT
--      collaborations       authenticated  SELECT
--      consultant_slots     authenticated  SELECT
--      conversation_blocks  authenticated  SELECT
--    e nessun'altra riga (booking_messages non deve comparire: non esiste).
--
--   select table_name, grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public'
--      and grantee in ('anon', 'authenticated')
--      and table_name in ('admin_page_permissions', 'artist_media_submissions',
--                         'billing_customers', 'booking_messages', 'collaborations',
--                         'consultant_slots', 'conversation_blocks', 'media_assets',
--                         'platform_feedback', 'rate_limits', 'stripe_webhook_events',
--                         'subscriptions')
--    order by table_name, grantee, privilege_type;
--
-- 2) Gli indici nuovi. Attese 9 righe:
--
--   select tablename, indexname, indexdef
--     from pg_indexes
--    where schemaname = 'public'
--      and indexname in ('booking_requests_venue_idx', 'profile_referrals_venue_idx',
--                        'content_reports_reporter_idx', 'media_assets_owner_idx',
--                        'leads_requester_idx', 'artists_user_idx',
--                        'consultations_user_idx', 'messages_offer_booking_idx',
--                        'notifications_artist_idx')
--    order by tablename;
--
-- 3) Configurazione dei bucket. Attesi: i sei bucket immagine con 5242880 e i
--    cinque formati immagine; artist-audio con 26214400 e gli undici formati
--    audio; event-videos e application-videos con 52428800 e mp4/webm/quicktime;
--    chat-attachments con 26214400 e allowed_mime_types NULL; artist-videos e
--    report-attachments come prima. Un bucket NON elencato qui con
--    allowed_mime_types NULL è stato creato fuori dalle migration: segnalarlo.
--
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets
--    order by id;
--
-- 4) Controprova applicativa, dopo il deploy (nessuna scrittura di prova sul DB):
--    - home e /collaborazioni mostrano ancora il nastro dei loghi;
--    - in una chat aperta da due browser, il blocco deciso dal team spegne il
--      composer in tempo reale (sottoscrizione su conversation_blocks);
--    - il caricamento di una foto della gallery e di una traccia audio va a buon
--      fine con l'interruttore BUNNY_UPLOADS_ENABLED com'è oggi.
