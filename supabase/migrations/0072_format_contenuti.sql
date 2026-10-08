-- =========================================
-- N'arte — 0072 Contenuti dei quattro format
-- =========================================
-- CONTESTO
-- La migration 0037 aveva creato i quattro format con descrizioni provvisorie
-- e con formazioni sbagliate (NaJam duo, NuLive trio). Oggi la gamma è:
--   NuLive = solo o duo, NaJam = trio, NaBand = band (4+), NaCena = evento
--   della community ospitato da casa N'arte.
-- Questa migration aggiorna ordine, segmento (colonna `tagline`), descrizione e
-- prezzo / etichetta (chiave `prezzo` dentro `details`, letta da
-- lib/content/format-covers.ts → formatPrezzo) delle quattro righe esistenti.
--
-- SICUREZZA
--   * Solo UPDATE, uno per slug. Nessuna DELETE, nessuna INSERT.
--   * `details` viene FUSO (`||`), non sostituito: le altre chiavi restano.
--   * `cover_image` non viene toccata: le foto di ripiego stanno in
--     public/format/ e le sceglie il codice.
--   * Se uno slug non esiste l'UPDATE non fa nulla (0 righe), senza errori.
--   * Idempotente: rieseguirla riscrive gli stessi valori.

update public.formats
set order_index = 0,
    tagline = 'Solo o duo · Serate intime e aperitivi',
    description = 'Quando la musica deve esserci, ma senza rubare la scena, serve qualcosa di essenziale: un artista da solo, oppure un duo, voce e strumento, nient''altro. È il formato più agile che abbiamo, e si adatta quasi a tutto. Perfetto per l''aperitivo che si allunga, per la cena in cui la gente vuole ancora parlarsi, per il locale dove conta più l''atmosfera che il volume.',
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object('prezzo', 'a partire da 200€'),
    updated_at = now()
where slug = 'nulive';

update public.formats
set order_index = 1,
    tagline = 'Trio · Live acustici e groove',
    description = 'Una sala da riempire senza invaderla: è qui che entra in gioco il trio. Tre elementi che si ascoltano, si rincorrono e danno un suono pieno, senza l''ingombro di una band intera. È la scelta giusta per il live acustico che diventa protagonista, o per quella serata groove in cui, a un certo punto, la gente comincia a muoversi.',
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object('prezzo', 'a partire da 300€'),
    updated_at = now()
where slug = 'najam';

update public.formats
set order_index = 2,
    tagline = 'Band · Eventi e palchi grandi',
    description = 'Se la musica è il centro di tutto, ti serve la band al completo: quattro o più elementi, tanta energia e nessun compromesso. È quella che chiami per la festa, per l''evento importante, per il palco grande davanti a un pubblico che ha solo voglia di ballare.',
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object('prezzo', 'a partire da 400€'),
    updated_at = now()
where slug = 'naband';

update public.formats
set order_index = 3,
    tagline = 'Evento community · Ospita casa N''arte',
    description = 'La musica, a volte, nasce semplicemente intorno a una tavola. NaCena è l''evento di casa N''arte: la serata in cui la community si ritrova, e il tuo locale diventa il posto dove succede. Arrivano artisti che ci conoscono da anni e altri che vogliono scoprirci per la prima volta, si siedono insieme, mangiano, suonano. Nessuna scaletta, solo musica e persone, e un locale che diventa casa per una sera.',
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object('prezzo', 'Candidature aperte'),
    updated_at = now()
where slug = 'nacena';
