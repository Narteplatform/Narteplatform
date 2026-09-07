import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-09-07";

export const INIZIARE: HelpCategory = {
  slug: "iniziare",
  title: "Iniziare",
  description:
    "Primi passi su N'arte: cos'è la piattaforma, chi fa cosa e come creare un account.",
  icon: "rocket",
  audience: "all",
  articles: [
    {
      slug: "cos-e-narte",
      title: "Cos'è N'arte?",
      excerpt:
        "La piattaforma italiana che mette in contatto artisti emergenti e organizzatori di eventi. Cosa fa, per chi è pensata e come si mantiene.",
      updatedAt: UPDATED,
      related: ["cosa-fa-e-non-fa-narte", "differenze-ruoli", "come-creare-account"],
      content: `
<h2>Una piattaforma per la musica dal vivo emergente</h2>
<p>N'arte mette in contatto <strong>artisti emergenti</strong> e <strong>chi cerca musica dal vivo</strong>: locali, festival, brand, wedding planner, privati. Nasce nel 2018 come realtà che organizza serate a Napoli e nel 2026 diventa una piattaforma: otto anni di agenda, telefonate e passaparola trasformati in uno strumento che chiunque può usare.</p>

<h2>Cosa puoi fare</h2>
<ul>
  <li><strong>Sfogliare il roster</strong> degli artisti approvati dal team, filtrando per tipologia, genere e città su <a href="/artisti">/artisti</a>.</li>
  <li><strong>Inviare una richiesta di booking</strong> direttamente all'artista, indicando data, fascia oraria, budget e che tipo di serata hai in mente.</li>
  <li><strong>Condurre la trattativa in chat</strong>, con offerte tracciate che si accettano o si rifiutano con un click.</li>
  <li><strong>Candidarti come artista</strong> da <a href="/candidatura-artista">/candidatura-artista</a> per entrare nel roster pubblico.</li>
  <li><strong>Scoprire gli eventi</strong> in programma e quelli passati su <a href="/eventi">/eventi</a>, e i <a href="/format">format N'arte</a> già pronti per il tuo locale.</li>
</ul>

<h2>Il punto che conviene chiarire subito</h2>
<p><strong>N'arte non incassa il compenso dell'artista e non trattiene alcuna percentuale sull'ingaggio.</strong> Mette in contatto le due parti e si ferma lì: il cachet lo concordano e lo regolano direttamente artista e organizzatore, fuori dalla piattaforma. L'unica somma che N'arte incassa è l'abbonamento facoltativo degli artisti.</p>
<p>Ne parliamo per esteso in <a href="/help/iniziare/cosa-fa-e-non-fa-narte">cosa fa e cosa non fa N'arte</a>.</p>

<h2>Quanto costa</h2>
<p>La piattaforma è <strong>gratuita per il pubblico, per gli utenti registrati e per gli organizzatori</strong>. Nessun costo per cercare artisti, inviare richieste, negoziare in chat o confermare una data.</p>
<p>Per gli artisti esiste un profilo gratuito che non scade, e due piani a pagamento facoltativi che sbloccano chat, recensioni e visibilità. Il listino è su <a href="/prezzi">/prezzi</a>.</p>

<h2>Da dove cominciare</h2>
<ul>
  <li>Cerchi un artista per una data? Parti da <a href="/help/organizzatori/trovare-artista">come trovare l'artista giusto</a>.</li>
  <li>Sei un musicista? Parti da <a href="/help/artisti/candidatura-artista">come candidarsi</a>.</li>
  <li>Vuoi capire chi fa cosa? Leggi <a href="/help/iniziare/differenze-ruoli">i ruoli su N'arte</a>.</li>
</ul>
`,
    },

    {
      slug: "come-creare-account",
      title: "Come creare un account",
      excerpt:
        "Registrazione come utente o organizzatore, oppure candidatura artista: sono due percorsi diversi. Ecco quale scegliere e cosa succede dopo.",
      updatedAt: UPDATED,
      related: [
        "differenze-ruoli",
        "artisti/candidatura-artista",
        "account/recupero-password",
      ],
      content: `
<h2>Due percorsi, non uno</h2>
<p>Su N'arte l'account si crea in due modi diversi, a seconda di cosa vuoi fare. È la distinzione che genera più confusione, quindi vale la pena leggerla per intero.</p>

<h3>1. Registrazione standard — utente o organizzatore</h3>
<p>Vai su <a href="/register">/register</a>. Servono nome, email e una password di <strong>almeno 8 caratteri</strong>. Nel modulo scegli come vuoi usare la piattaforma:</p>
<ul>
  <li><strong>Utente</strong> — sblocchi i profili completi degli artisti e salvi i preferiti.</li>
  <li><strong>Organizzatore</strong> — in più puoi inviare richieste di booking, chattare e gestire il calendario delle date confermate.</li>
</ul>
<p><strong>Non è una scelta definitiva.</strong> Un account registrato come "utente" diventa organizzatore in automatico alla prima richiesta di booking che invia: non devi rifare nulla.</p>

<h3>2. Candidatura artista</h3>
<p>Se sei un musicista e vuoi entrare nel roster, <strong>non usare il modulo di registrazione</strong>: passa da <a href="/candidatura-artista">/candidatura-artista</a>.</p>
<p>Il motivo è che il profilo artista non si crea da soli. La candidatura viene letta dal team N'arte e, <strong>solo se approvata</strong>, genera il tuo account e il profilo pubblico. Trovi il dettaglio in <a href="/help/artisti/candidatura-artista">come candidarsi come artista</a>.</p>

<h2>La conferma via email è obbligatoria</h2>
<p>Dopo la registrazione standard ricevi un'<strong>email di conferma</strong>: finché non apri il link contenuto in quel messaggio, l'account non è attivo. Se non la trovi, controlla nella cartella spam o promozioni.</p>
<p>Fa eccezione un caso solo: se crei l'account <em>contestualmente</em> all'invio di una richiesta di booking dal profilo di un artista, l'accesso è immediato e non serve confermare nulla.</p>

<h2>Dove finisci dopo l'accesso</h2>
<p>Al login la piattaforma ti porta nell'area giusta in base al tuo ruolo: gli artisti in <strong>/dashboard</strong>, gli organizzatori in <strong>/organizzatore</strong>, gli utenti sulla home.</p>

<h2>Se qualcosa non funziona</h2>
<p>Non riesci ad accedere? Vedi <a href="/help/account/recupero-password">come recuperare la password</a>. Per tutto il resto, <a href="/contatti">scrivici</a>.</p>
`,
    },

    {
      slug: "differenze-ruoli",
      title: "Quali sono i ruoli su N'arte?",
      excerpt:
        "Utente, organizzatore, artista, consulente e team: cosa può fare ciascuno, cosa vede e come si passa da un ruolo all'altro.",
      updatedAt: UPDATED,
      related: ["come-creare-account", "cosa-fa-e-non-fa-narte", "glossario"],
      content: `
<h2>Cinque ruoli</h2>
<p>Ogni ruolo ha un'area dedicata e permessi diversi. Il tuo viene assegnato quando crei l'account e in un caso cambia da solo.</p>

<h3>Visitatore — senza account</h3>
<p>Può navigare eventi, format, blog, l'elenco degli artisti con i filtri, candidarsi come artista e scrivere dal modulo contatti. <strong>Non può</strong> aprire il profilo completo di un artista: bio, galleria, audio, video e calendario sono riservati a chi ha un account. I preferiti restano salvati nel browser.</p>

<h3>Utente registrato</h3>
<p>Sblocca i profili completi degli artisti e salva i preferiti sul proprio account, ritrovandoli su qualunque dispositivo. Può inviare una richiesta di booking: nel momento in cui lo fa, <strong>diventa automaticamente organizzatore</strong>.</p>

<h3>Organizzatore</h3>
<p>Locale, festival, brand, agenzia o privato che cerca artisti. Area: <strong>/organizzatore</strong>. Può registrare le proprie strutture, inviare richieste di booking, negoziare in chat con offerte tracciate, confermare la data finale, vedere il calendario delle date confermate e recensire l'artista dopo l'evento. <strong>È tutto gratuito</strong>, non esistono abbonamenti per gli organizzatori.</p>

<h3>Artista</h3>
<p>Musicista approvato dal team. Area: <strong>/dashboard</strong>. Gestisce profilo pubblico, galleria, video, audio, calendario delle disponibilità, richieste ricevute, chat, recensioni, consulenza e abbonamento. Con i piani superiori può gestire <a href="/help/artisti/profili-multipli">più profili artista</a> dallo stesso account.</p>
<p>Un account artista <strong>non può inviare richieste di booking</strong> ad altri artisti.</p>

<h3>Consulente</h3>
<p>Professionista del team che tiene le sessioni di <a href="/help/consulenza/prenotare-chiamata">consulenza</a> con gli artisti. Ha un accesso limitato ai soli appuntamenti e al proprio profilo.</p>

<h3>Team N'arte</h3>
<p>Approva le candidature, cura eventi, format e blog, modera le recensioni e può annullare una data confermata — ma solo indicando una motivazione. Ha visibilità sulle conversazioni per poter intervenire in caso di contestazione: lo trovi scritto anche nella <a href="/privacy">informativa privacy</a>.</p>

<h2>Si può cambiare ruolo?</h2>
<ul>
  <li><strong>Utente → organizzatore</strong>: automatico, alla prima richiesta di booking.</li>
  <li><strong>Verso artista</strong>: solo tramite <a href="/candidatura-artista">candidatura</a> e approvazione del team. Non è una conversione che puoi fare da solo.</li>
</ul>
`,
    },

    {
      slug: "tour-piattaforma",
      title: "Tour della piattaforma",
      excerpt:
        "Una mappa delle sezioni principali: cosa trovi in ciascuna pagina pubblica e cosa cambia una volta dentro la tua area riservata.",
      updatedAt: UPDATED,
      related: ["cos-e-narte", "differenze-ruoli", "glossario"],
      content: `
<h2>Le pagine pubbliche</h2>
<p>Accessibili a chiunque, anche senza account.</p>
<ul>
  <li><strong><a href="/">Home</a></strong> — eventi in evidenza, come funziona la piattaforma, artisti, collaborazioni e un modulo per raccontarci l'evento che hai in mente.</li>
  <li><strong><a href="/artisti">Artisti</a></strong> — il roster completo, con filtri per tipologia, generi e ricerca testuale. La scheda completa richiede l'accesso.</li>
  <li><strong><a href="/eventi">Eventi</a></strong> — le date in arrivo e l'archivio di quelle passate, filtrabili per categoria.</li>
  <li><strong><a href="/format">Format</a></strong> — i quattro contenitori live curati da N'arte: NaJam, NuLive, NaBand, NaCena.</li>
  <li><strong><a href="/blog">Blog</a></strong> — guide e approfondimenti su booking e musica dal vivo.</li>
  <li><strong><a href="/prezzi">Prezzi</a></strong> — i piani per gli artisti. Ricorda che per organizzatori e pubblico la piattaforma è gratuita.</li>
  <li><strong><a href="/chi-siamo">Chi siamo</a></strong> e <strong><a href="/collaborazioni">Collaborazioni</a></strong> — la storia e le realtà con cui lavoriamo.</li>
  <li><strong><a href="/contatti">Contatti</a></strong> — il modulo per scrivere al team.</li>
</ul>

<h2>L'area artista</h2>
<p>Si raggiunge da <strong>/dashboard</strong> dopo l'accesso. Contiene:</p>
<ul>
  <li><strong>Dashboard</strong> — riepilogo di foto, video, date libere, richieste nuove e chat.</li>
  <li><strong>Profilo artista</strong> — l'editor a blocchi che alimenta la tua pagina pubblica.</li>
  <li><strong>I tuoi profili</strong> — se il piano ne consente più di uno.</li>
  <li><strong>Calendario</strong> — le tue disponibilità e gli slot orari.</li>
  <li><strong>Richieste</strong>, <strong>Chat</strong>, <strong>Feedback</strong>, <strong>Statistiche</strong>, <strong>Abbonamento</strong> e <strong>Consulente N'arte</strong>.</li>
</ul>

<h2>L'area organizzatore</h2>
<p>Si raggiunge da <strong>/organizzatore</strong>. Contiene overview, <strong>Richieste inviate</strong>, <strong>Strutture</strong>, <strong>Calendario</strong> delle date confermate, <strong>Recensioni</strong>, <strong>Chat</strong> e <strong>Profilo</strong>.</p>

<h2>Cosa vedi solo dopo l'accesso</h2>
<p>La scheda completa di un artista — biografia estesa, galleria, tracce audio, video, formazione, requisiti tecnici e calendario — è visibile solo agli utenti registrati. Da visitatore vedi generi e categoria, e un invito a iscriverti. L'iscrizione è gratuita.</p>
`,
    },

    {
      slug: "cosa-fa-e-non-fa-narte",
      title: "Cosa fa e cosa non fa N'arte",
      excerpt:
        "Il confine del servizio, scritto senza giri di parole: cosa gestisce la piattaforma e cosa resta in mano ad artisti e organizzatori.",
      updatedAt: UPDATED,
      related: [
        "cos-e-narte",
        "pagamenti/modalita-pagamento",
        "policy/contestazioni",
      ],
      content: `
<h2>Perché questo articolo esiste</h2>
<p>Quasi tutti i malintesi nascono da un'aspettativa sbagliata su cosa faccia la piattaforma. Meglio metterlo nero su bianco.</p>

<h2>Cosa fa N'arte</h2>
<ul>
  <li><strong>Seleziona</strong> gli artisti del roster: ogni candidatura viene letta e approvata a mano.</li>
  <li><strong>Mette in contatto</strong> artisti e organizzatori, con un profilo pubblico e un canale di richiesta.</li>
  <li><strong>Traccia la trattativa</strong>: offerte con data, fascia oraria e budget, che si accettano o si rifiutano lasciando una traccia consultabile.</li>
  <li><strong>Sincronizza i calendari</strong>: quando una data è confermata, viene bloccata in automatico su quello dell'artista.</li>
  <li><strong>Notifica via email</strong> i passaggi che contano: nuova richiesta, risposta, conferma, annullamento.</li>
  <li><strong>Raccoglie le recensioni</strong> post-evento e le pubblica sul profilo dell'artista.</li>
  <li><strong>Organizza eventi propri</strong> e format live, con la propria direzione artistica.</li>
</ul>

<h2>Cosa non fa N'arte</h2>
<ul>
  <li><strong>Non incassa il compenso dell'ingaggio.</strong> Il denaro non passa mai dalla piattaforma: non lo riceviamo, non lo anticipiamo, non lo tratteniamo.</li>
  <li><strong>Non trattiene percentuali</strong> sul cachet. Quello che concordi è quello che prendi.</li>
  <li><strong>Non è parte del contratto</strong> fra artista e organizzatore. L'accordo è fra voi due; noi non lo firmiamo e non lo garantiamo.</li>
  <li><strong>Non genera contratti</strong> né fatture per l'esibizione, e non fornisce un modello con valore legale.</li>
  <li><strong>Non si occupa degli adempimenti SIAE</strong> né dei permessi dell'evento. Vedi <a href="/help/pagamenti/siae">chi paga la SIAE</a>.</li>
  <li><strong>Non impone penali</strong> se una data salta. Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</li>
  <li><strong>Non decide il tuo cachet</strong>: la fascia di prezzo la scegli tu e la tratti tu.</li>
  <li><strong>Non chiede l'esclusiva</strong>: continui a suonare dove vuoi, con chi vuoi.</li>
</ul>

<h2>E quando qualcosa va storto?</h2>
<p>Non essendo parte dell'accordo, N'arte non può obbligare nessuno a pagare o a esibirsi. Quello che può fare è <strong>leggere la conversazione</strong>, che resta tracciata, e intervenire sul comportamento di chi usa la piattaforma — fino ad annullare una data o sospendere un account. Il percorso è descritto in <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>

<h2>L'unica cosa che paghi a noi</h2>
<p>L'abbonamento dell'artista, che è facoltativo. Tutto il resto della piattaforma non genera alcun addebito. Dettagli in <a href="/help/pagamenti/abbonamento-artista">l'abbonamento artista</a>.</p>
`,
    },

    {
      slug: "glossario",
      title: "Glossario: le parole che usiamo",
      excerpt:
        "Richiesta, trattativa, offerta, lead, slot, struttura, roster, format: il significato preciso dei termini che incontri nella piattaforma.",
      updatedAt: UPDATED,
      related: ["differenze-ruoli", "booking/stati-richiesta", "tour-piattaforma"],
      content: `
<h2>Booking e trattativa</h2>
<ul>
  <li><strong>Richiesta di booking</strong> — la proposta che un organizzatore invia a un artista per una data specifica. Attraversa cinque stati, descritti in <a href="/help/booking/stati-richiesta">stati di una richiesta</a>.</li>
  <li><strong>Trattativa</strong> — la fase in cui l'artista ha accettato di discutere e si concordano i dettagli in chat. Non è ancora una conferma.</li>
  <li><strong>Offerta</strong> — una proposta strutturata inviata in chat con tre valori vincolanti: data, fascia oraria e budget. Si accetta o si rifiuta; una nuova offerta sostituisce quella ancora in sospeso.</li>
  <li><strong>Conferma</strong> — il passo finale, che spetta all'organizzatore. Blocca la data sul calendario dell'artista.</li>
  <li><strong>Prezzo definitivo</strong> — il compenso realmente pattuito, che le parti registrano sulla richiesta confermata con una doppia conferma. Vedi <a href="/help/organizzatori/prezzo-definitivo">il prezzo definitivo</a>.</li>
  <li><strong>Lead</strong> — una richiesta di contatto che non nasce dal flusso strutturato: arriva dal modulo contatti, dalla pagina di un format o dal vecchio modulo del profilo artista. Vedi <a href="/help/booking/differenze-lead-booking">lead e richiesta a confronto</a>.</li>
</ul>

<h2>Calendario</h2>
<ul>
  <li><strong>Disponibilità</strong> — lo stato di un giorno nel calendario dell'artista. I giorni futuri sono <em>disponibili</em> finché non li segni occupati.</li>
  <li><strong>Slot orario</strong> — una fascia con inizio e fine (per esempio 21:00-23:30) che l'artista può definire su una data specifica.</li>
  <li><strong>Fascia oraria</strong> — la parte della giornata indicata in una richiesta: mattina, pomeriggio, sera o notte.</li>
</ul>

<h2>Profili e contenuti</h2>
<ul>
  <li><strong>Roster</strong> — l'insieme degli artisti approvati e visibili su <a href="/artisti">/artisti</a>.</li>
  <li><strong>Profilo artista</strong> — la pagina pubblica di un progetto musicale. Un account può averne più di uno secondo il piano.</li>
  <li><strong>Percorso artistico</strong> — l'etichetta che qualifica il progetto: cover artist, tribute band o progetto inedito.</li>
  <li><strong>Struttura</strong> — un locale, club, teatro o festival registrato da un organizzatore, con indirizzo, capienza e foto.</li>
  <li><strong>Format</strong> — un contenitore live curato da N'arte, definito dal numero di elementi sul palco: <a href="/format">NaJam, NuLive, NaBand, NaCena</a>.</li>
</ul>

<h2>Abbonamento</h2>
<ul>
  <li><strong>Piano</strong> — il livello di abbonamento dell'account artista: Free, Pro o Max.</li>
  <li><strong>Profilo sospeso</strong> — un profilo che eccede il limite del piano dopo un cambio: resta salvato ma non è visibile. Non viene mai cancellato.</li>
  <li><strong>Verificato N'arte</strong> — il badge incluso nei piani a pagamento. Attesta un abbonamento attivo, non un controllo documentale.</li>
</ul>
`,
    },
  ],
};
