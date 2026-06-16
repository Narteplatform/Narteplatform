-- =========================================
-- N'arte — 0032 Seed formats + blog posts
-- Idempotente (on conflict do nothing).
-- =========================================

-- =========================================
-- 1. Seed formats
-- I contenuti rispecchiano i placeholder attuali di /format.
-- Titoli/tagline/descrizioni pronti per essere sovrascritti dall'admin UI.
-- =========================================

insert into public.formats
  (slug, title, tagline, description, icon, order_index, details, published)
values
  (
    'format-live-club',
    'Format 1',
    'Placeholder — definire titolo',
    'Descrizione del primo format N''arte. Aggiorna questo contenuto inserendo concept, target, durata indicativa e tipologia di location ideale.',
    'Music2',
    0,
    '{"bullets": []}',
    true
  ),
  (
    'format-live-festival',
    'Format 2',
    'Placeholder — definire titolo',
    'Descrizione del secondo format N''arte. Aggiorna questo contenuto inserendo concept, target, durata indicativa e tipologia di location ideale.',
    'Mic',
    1,
    '{"bullets": []}',
    true
  ),
  (
    'format-live-brand',
    'Format 3',
    'Placeholder — definire titolo',
    'Descrizione del terzo format N''arte. Aggiorna questo contenuto inserendo concept, target, durata indicativa e tipologia di location ideale.',
    'Sparkles',
    2,
    '{"bullets": []}',
    true
  )
on conflict (slug) do nothing;

-- =========================================
-- 2. Seed blog posts (5 articoli SEO placeholder)
-- Struttura copiata da 0021_blog.sql
-- =========================================

insert into public.blog_posts
  (slug, title, excerpt, cover_image, content, seo_title, seo_description, author_name, published_at)
values

-- Articolo 2 —————————————————————————————
(
  'booking-artisti-emergenti-guida-completa',
  'Booking di artisti emergenti: guida completa per organizzatori',
  'Tutto quello che devi sapere per prenotare un artista emergente in Italia: piattaforme, contratti, rider tecnico e gestione del giorno dell''evento.',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80',
  '<h2>Cos''è il booking artistico e perché è cambiato</h2>
<p>Il <strong>booking artistico</strong> è il processo con cui un organizzatore ingaggia un artista per un''esibizione live. Fino a pochi anni fa questo processo richiedeva agenti, telefonate e contratti cartacei. Oggi le piattaforme digitali hanno abbattuto queste barriere, permettendo di contattare direttamente artisti emergenti, vedere portfolio, ascoltare demo e ricevere conferma in pochi giorni.</p>

<h2>1. Trova la piattaforma giusta</h2>
<p>Esistono diverse soluzioni per il booking di artisti in Italia:</p>
<ul>
  <li><strong>Piattaforme dedicate</strong> come N''arte: profili verificati, genere, disponibilità e prezzi in un''unica schermata.</li>
  <li><strong>Social media</strong> (Instagram, TikTok): ottimi per scoprire talenti, ma senza garanzie contrattuali.</li>
  <li><strong>Agenzie tradizionali</strong>: utili per nomi consolidati, meno flessibili per artisti emergenti.</li>
</ul>

<h2>2. Rider tecnico: cosa aspettarsi</h2>
<p>Ogni artista professionale ha un <em>rider tecnico</em>, cioè un documento con le specifiche tecniche necessarie per l''esibizione. Può includere:</p>
<ul>
  <li>Numero di microfoni e canali mixer richiesti.</li>
  <li>Monitor sul palco e in-ear monitor.</li>
  <li>Retropalco, camerino e orari di sound check.</li>
  <li>Eventuali richieste di ospitalità (acqua, pasti, parcheggio).</li>
</ul>
<p>Per gli artisti emergenti il rider è spesso semplificato: verificalo prima di confermare il booking per evitare sorprese sui costi di produzione.</p>

<h2>3. Il contratto di esibizione</h2>
<p>Anche per esibizioni di piccola entità è buona pratica avere un accordo scritto che includa:</p>
<ul>
  <li>Data, ora e luogo dell''evento.</li>
  <li>Durata del set e numero di set (spesso uno, con bis eventuale).</li>
  <li>Compenso pattuito, modalità e tempistiche di pagamento.</li>
  <li>Clausola di cancellazione e rimborso.</li>
  <li>Chi si occupa di SIAE e diritti connessi.</li>
</ul>

<h2>4. Gestisci il giorno dell''evento</h2>
<p>Il giorno dell''esibizione è il momento della verità. Alcuni accorgimenti:</p>
<ol>
  <li><strong>Sound check</strong>: garantisci almeno 60-90 minuti prima dell''apertura al pubblico.</li>
  <li><strong>Comunicazione chiara</strong>: un referente unico per l''artista elimina confusione.</li>
  <li><strong>Pagamento puntuale</strong>: molti artisti preferiscono il saldo prima o subito dopo l''esibizione.</li>
</ol>

<h2>Conclusione</h2>
<p>Il booking di artisti emergenti è diventato accessibile e trasparente grazie alle piattaforme digitali. Con un processo strutturato — dalla scelta alla firma — costruisci un rapporto professionale duraturo con gli artisti e garantisci al tuo pubblico un''esperienza memorabile.</p>
<p><a href="/artisti">Scopri gli artisti disponibili su N''arte</a>.</p>',
  'Booking artisti emergenti: guida completa per organizzatori | N''arte',
  'Come prenotare artisti emergenti in Italia: piattaforme, rider tecnico, contratto e gestione del giorno dell''evento. Guida completa per organizzatori.',
  'N''arte',
  now()
),

-- Articolo 3 —————————————————————————————
(
  'format-live-narte-cosa-sono-come-funzionano',
  'Format live N''arte: cosa sono e come funzionano',
  'I format N''arte sono contenitori di musica live curati per club, festival e brand. Scopri come funzionano e come portarne uno nel tuo evento.',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80',
  '<h2>L''idea dietro i format N''arte</h2>
<p>Un <strong>format live</strong> non è semplicemente un concerto: è un''esperienza strutturata, con una sua identità visiva, un filo narrativo e una selezione artistica coerente. I format N''arte nascono dall''esigenza di offrire a club, festival e brand un prodotto chiavi in mano, riconoscibile e di qualità.</p>

<h2>Cosa distingue un format da una serata normale</h2>
<p>Quattro elementi caratterizzano ogni format N''arte:</p>
<ul>
  <li><strong>Curation artistica</strong>: gli artisti non sono scelti a caso, ma selezionati per genere, energia e coerenza con il mood del format.</li>
  <li><strong>Identità visiva</strong>: ogni format ha un proprio nome, palette cromatica e comunicazione social.</li>
  <li><strong>Struttura del programma</strong>: warm-up, headliner, eventuali talk o momenti di interazione col pubblico.</li>
  <li><strong>Technical rider unificato</strong>: le specifiche tecniche sono standardizzate per semplificare la produzione.</li>
</ul>

<h2>Chi può ospitare un format N''arte</h2>
<p>I format sono pensati per tre tipologie di partner:</p>
<ol>
  <li><strong>Club e locali</strong>: serate tematiche con line-up curate che portano un pubblico nuovo e fidelizzato.</li>
  <li><strong>Festival</strong>: stage o slot dedicati, con identità propria all''interno del cartellone.</li>
  <li><strong>Brand e aziende</strong>: eventi di brand activation, launching e corporate con musica live di qualità.</li>
</ol>

<h2>Come funziona la partnership</h2>
<p>Il processo è semplice:</p>
<ol>
  <li>Compili il form di interesse specificando data, location e tipo di evento.</li>
  <li>Il team N''arte ti invia il dossier completo con line-up proposte, technical rider e preventivo.</li>
  <li>Confermi e definiamo insieme tutti i dettagli produttivi.</li>
  <li>Il giorno dell''evento il format N''arte porta il suo pubblico e la sua identità nel tuo spazio.</li>
</ol>

<h2>Conclusione</h2>
<p>Portare un format N''arte nel tuo locale o festival significa aggiungere valore all''esperienza del pubblico e differenziare la tua programmazione. Contattaci per ricevere il dossier completo.</p>
<p><a href="/contatti">Scrivici ora</a>.</p>',
  'Format live N''arte: cosa sono e come funzionano | N''arte',
  'I format N''arte sono contenitori di musica live curati per club, festival e brand. Scopri come funzionano e come ospitarne uno nel tuo evento.',
  'N''arte',
  now()
),

-- Articolo 4 —————————————————————————————
(
  'organizzare-evento-musicale-successo',
  'Organizzare un evento musicale di successo: la guida in 7 passi',
  'Dalla location alla comunicazione, dal rider tecnico al giorno dell''evento: tutto quello che serve per organizzare un evento musicale live che lasci il segno.',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80',
  '<h2>Perché la pianificazione è tutto</h2>
<p>Organizzare un <strong>evento musicale dal vivo</strong> è un''operazione complessa che coinvolge decine di variabili: artisti, tecnici, venue, comunicazione, licenze e logistica. Un buon piano elimina il 90% degli imprevisti e ti permette di goderti il risultato del tuo lavoro il giorno dell''evento.</p>

<h2>Passo 1: definisci obiettivo e budget</h2>
<p>Prima di qualsiasi altra cosa, rispondi a due domande:</p>
<ul>
  <li><strong>Qual è l''obiettivo?</strong> Brand awareness, raccolta fondi, intrattenimento puro, lancio di un prodotto?</li>
  <li><strong>Qual è il budget disponibile?</strong> Suddividilo subito per macro-voci: artisti, produzione tecnica, venue, comunicazione, SIAE/licenze, imprevisti (almeno 10%).</li>
</ul>

<h2>Passo 2: scegli la location</h2>
<p>La venue deve essere adeguata al tipo di evento e al pubblico atteso:</p>
<ul>
  <li>Capienza certificata e via di fuga conformi alle normative.</li>
  <li>Impianto audio e luci già presenti o facilmente integrabile.</li>
  <li>Accessibilità e parcheggi.</li>
  <li>Disponibilità per sound check e allestimento.</li>
</ul>

<h2>Passo 3: prenota gli artisti in anticipo</h2>
<p>Per artisti emergenti, dai almeno 4-6 settimane di anticipo. Per nomi più strutturati, 3-6 mesi. Usa piattaforme come N''arte per trovare artisti disponibili nella tua città e nella tua fascia di budget.</p>

<h2>Passo 4: ottieni le licenze</h2>
<p>In Italia ogni evento con musica dal vivo richiede:</p>
<ul>
  <li><strong>SIAE</strong>: dichiarazione e pagamento diritti d''autore.</li>
  <li><strong>Autorizzazione comunale</strong> (per eventi sopra una certa soglia di capienza o in aree pubbliche).</li>
  <li><strong>SUAP / TULPS</strong>: per eventi con somministrazione di alimenti e bevande.</li>
</ul>

<h2>Passo 5: gestisci la produzione tecnica</h2>
<p>Coordinate con il tecnico del suono almeno una settimana prima per verificare rider, noleggio attrezzatura e piano di allestimento.</p>

<h2>Passo 6: comunica l''evento</h2>
<p>Avvia la comunicazione almeno 3 settimane prima: social media, PR locali, newsletter. Un evento musicale si riempie con la comunicazione costante, non con un singolo post il giorno prima.</p>

<h2>Passo 7: il giorno dell''evento</h2>
<p>Dai un referente unico a ogni area (artisti, tecnica, ospitalità, sicurezza). Prevedi un run-of-show dettagliato con minuti precisi per ogni fase. E ricorda: la flessibilità fa la differenza tra un buon organizzatore e un grande organizzatore.</p>

<h2>Conclusione</h2>
<p>Con la giusta pianificazione, anche un evento con budget limitato può diventare un''esperienza memorabile. Inizia dalla scelta dell''artista giusto: <a href="/artisti">sfoglia i profili su N''arte</a>.</p>',
  'Organizzare un evento musicale di successo: guida in 7 passi | N''arte',
  'Come organizzare un evento musicale dal vivo: dalla location al booking degli artisti, dalle licenze alla comunicazione. Guida pratica in 7 passi.',
  'N''arte',
  now()
),

-- Articolo 5 —————————————————————————————
(
  'tendenze-musica-dal-vivo-italia',
  'Tendenze della musica dal vivo in Italia: cosa sta cambiando',
  'Dal boom dei piccoli live club al ritorno del vinile, dagli artisti ibridi ai format esperienziali: le tendenze che ridisegnano la scena musicale live italiana.',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1600&q=80',
  '<h2>La musica live sta vivendo un momento straordinario</h2>
<p>Dopo gli anni del distanziamento e dei concerti digitali, la <strong>musica dal vivo in Italia</strong> ha vissuto un rimbalzo potente. I dati di settore mostrano una crescita costante del numero di eventi, della spesa media per biglietto e — cosa più interessante — della domanda di <em>esperienze live di qualità</em> in contesti intimi e mid-size.</p>

<h2>1. Il ritorno dei live club di qualità</h2>
<p>I grandi festival restano un riferimento, ma la tendenza più interessante è la riscoperta dei <strong>live club</strong>: sale da 200 a 1.000 persone dove il rapporto artista-pubblico è diretto e autentico. Molti organizzatori stanno investendo in questa fascia, cercando artisti capaci di riempire questi spazi con un proprio pubblico fidelizzato.</p>

<h2>2. Artisti ibridi: producer + performer</h2>
<p>La separazione tra produttore in studio e performer live si sta assottigliando. Sempre più artisti portano il loro setup di produzione sul palco, creando set live che fondono elettronica e strumenti tradizionali. Questo formato è particolarmente richiesto per eventi di brand activation e festival sperimentali.</p>

<h2>3. Format esperienziali e site-specific</h2>
<p>I concerti in location inusuali — cantine, musei, tetti, spazi industriali — sono in forte crescita. Il pubblico cerca non solo musica ma un''<strong>esperienza totale</strong> che combini spazio, visual e suono. I format site-specific richiedono cura nella produzione ma generano engagement e contenuto organico altissimi.</p>

<h2>4. La scena emergente come driver di innovazione</h2>
<p>Gli artisti emergenti italiani stanno portando influenze internazionali nella musica locale: afrobeat, jazz contemporaneo, hyperpop e neo-soul si mescolano con sonorità mediterranee, creando un panorama sonoro originale e commercialmente interessante. Scoprirli prima che diventino mainstream è il vantaggio competitivo degli organizzatori più attenti.</p>

<h2>5. Booking digitale: la fine degli intermediari opachi</h2>
<p>Le piattaforme di booking diretto stanno eliminando le inefficienze del mercato tradizionale. Organizzatori e artisti possono ora negoziare in trasparenza, con prezzi visibili, disponibilità in tempo reale e contratti digitali. Una rivoluzione che avvantaggia soprattutto la scena emergente, dove i margini sono storicamente stretti.</p>

<h2>Conclusione</h2>
<p>La musica live italiana è in fermento. Chi sa cogliere queste tendenze — investendo in format originali, valorizzando artisti emergenti e adottando strumenti digitali di booking — si posiziona in modo vincente in un mercato che premia la qualità e l''autenticità.</p>
<p><a href="/artisti">Esplora la scena emergente su N''arte</a>.</p>',
  'Tendenze musica dal vivo in Italia 2025: cosa sta cambiando | N''arte',
  'Dal boom dei live club agli artisti ibridi, dai format site-specific al booking digitale: le tendenze che ridisegnano la scena musicale live italiana nel 2025.',
  'N''arte',
  now()
)

on conflict (slug) do nothing;
