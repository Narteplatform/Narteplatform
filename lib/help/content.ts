// Centro Assistenza N'arte — contenuti statici file-based.
// Per aggiungere/modificare articoli: edita questo file. Articoli marcati
// `placeholder: true` mostrano un banner "in preparazione" nella UI.

export type HelpArticle = {
  slug: string;
  title: string;
  excerpt: string;
  /** HTML del corpo articolo. Usa <h2>, <h3>, <p>, <ul>, <ol>, <li>, <a>, <strong>, <em>. */
  content: string;
  updatedAt?: string;
  placeholder?: boolean;
  /** Articoli correlati (slug nello stesso category). Auto-computed se vuoto. */
  related?: string[];
};

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  /** Nome icona lucide-react (vedi lib/help/icons.tsx) */
  icon:
    | "rocket"
    | "music"
    | "users"
    | "calendar"
    | "phone"
    | "user-cog"
    | "credit-card"
    | "shield";
  audience: "all" | "artist" | "organizer" | "user";
  articles: HelpArticle[];
};

const PLACEHOLDER_BODY = `
<p>Questo articolo è in preparazione. Stiamo lavorando per pubblicarlo a breve con tutte le informazioni di cui hai bisogno.</p>
<p>Nel frattempo, se hai una domanda urgente, puoi <a href="/contatti">contattare il team N'arte</a> o consultare la nostra <a href="/faq">pagina FAQ</a>.</p>
`;

function placeholder(slug: string, title: string, excerpt: string): HelpArticle {
  return { slug, title, excerpt, content: PLACEHOLDER_BODY, placeholder: true };
}

export const HELP_CATEGORIES: HelpCategory[] = [
  // ============================================
  // INIZIARE
  // ============================================
  {
    slug: "iniziare",
    title: "Iniziare",
    description:
      "Primi passi su N'arte: cos'è la piattaforma, come funziona e come creare un account.",
    icon: "rocket",
    audience: "all",
    articles: [
      {
        slug: "cos-e-narte",
        title: "Cos'è N'arte?",
        excerpt:
          "Una panoramica della piattaforma: cosa offre, a chi è rivolta e come si distingue da agenzie tradizionali.",
        content: `
<h2>Una piattaforma per la musica live emergente</h2>
<p>N'arte è la piattaforma italiana che mette in contatto <strong>artisti emergenti</strong> e <strong>organizzatori di eventi</strong>. Niente intermediari nascosti, niente percentuali poco trasparenti: l'organizzatore vede direttamente l'artista, dialoga con lui e conferma il booking in pochi click.</p>

<h2>Cosa puoi fare con N'arte</h2>
<ul>
  <li><strong>Sfogliare il roster</strong> di artisti italiani approvati dal team N'arte, filtrando per genere, tipologia e città.</li>
  <li><strong>Inviare una richiesta di booking</strong> diretta all'artista per la tua data, indicando location, budget orientativo e tipo di evento.</li>
  <li><strong>Gestire la trattativa in chat</strong>: offerte tracciate, controproposta, conferma definitiva.</li>
  <li><strong>Prenotare una consulenza gratuita</strong> con uno dei consulenti N'arte per essere guidato nella scelta dell'artista.</li>
  <li><strong>Candidarti come artista</strong> per entrare nel roster pubblico.</li>
</ul>

<h2>Per chi è pensata</h2>
<p>N'arte è pensata per tre profili principali:</p>
<ul>
  <li><strong>Artisti emergenti italiani</strong> che vogliono aumentare la propria visibilità e ricevere richieste di booking qualificate.</li>
  <li><strong>Organizzatori di eventi</strong> (club, festival, brand, wedding planner, locali) che cercano artisti per programmazioni dal vivo.</li>
  <li><strong>Privati</strong> che vogliono prenotare musica live per eventi personali (cene, compleanni, matrimoni).</li>
</ul>

<p>Vuoi approfondire? Continua con <a href="/help/iniziare/come-creare-account">come creare un account</a>.</p>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "come-creare-account",
        title: "Come creare un account",
        excerpt:
          "Registrazione standard (utente/organizzatore) o candidatura artista: differenze e flusso passo-passo.",
        content: `
<h2>Due percorsi di registrazione</h2>
<p>Su N'arte esistono due modi per creare un account:</p>

<h3>1. Registrazione standard (utente / organizzatore)</h3>
<p>Se vuoi prenotare artisti o esplorare il roster, vai su <a href="/register">/register</a> e crea un account in pochi secondi con email e password. Potrai successivamente promuovere il tuo profilo a <em>organizzatore</em> se gestisci eventi in modo continuativo.</p>

<h3>2. Candidatura artista</h3>
<p>Se sei un artista e vuoi entrare nel roster pubblico N'arte, devi candidarti tramite <a href="/candidatura-artista">/candidatura-artista</a>. Compili un form con nome d'arte, generi (massimo 3), bio e link social. L'account artista viene creato subito; la pubblicazione del profilo richiede l'approvazione del team N'arte.</p>

<h2>Conferma email</h2>
<p>Dopo la registrazione potresti ricevere una mail di benvenuto. Non è richiesta verifica via link: l'account è attivo da subito.</p>

<h2>Hai problemi?</h2>
<p>Se non riesci a registrarti, consulta <a href="/help/account/recupero-password">come recuperare la password</a> o <a href="/contatti">contattaci</a>.</p>
`,
        updatedAt: "2026-05-26",
      },
      placeholder(
        "tour-piattaforma",
        "Tour della piattaforma in 5 minuti",
        "Video walkthrough delle sezioni principali: home, artisti, eventi, dashboard."
      ),
      placeholder(
        "differenze-ruoli",
        "Quali sono i ruoli su N'arte?",
        "Superadmin, artista, organizzatore, utente, consulente: cosa può fare ciascuno."
      ),
    ],
  },

  // ============================================
  // PER ARTISTI
  // ============================================
  {
    slug: "artisti",
    title: "Per artisti",
    description:
      "Tutto quello che serve a un artista per entrare nel roster, ottimizzare il profilo e gestire le richieste.",
    icon: "music",
    audience: "artist",
    articles: [
      {
        slug: "candidatura-artista",
        title: "Come candidarsi come artista",
        excerpt:
          "Form di candidatura: cosa preparare, requisiti minimi e tempi di approvazione.",
        content: `
<h2>Prima di iniziare</h2>
<p>La candidatura artista richiede pochi minuti, ma è consigliato preparare in anticipo questi materiali:</p>
<ul>
  <li><strong>Nome d'arte</strong> definitivo (poi modificabile dalla dashboard).</li>
  <li><strong>Bio breve</strong> (max 2.000 caratteri) che racconti il progetto, la formazione, lo stile.</li>
  <li><strong>Link social</strong> attivi: Instagram, Spotify, sito (almeno uno).</li>
  <li><strong>Generi musicali</strong>: scegline da 1 a 3 — sii preciso, è il filtro principale che usano gli organizzatori.</li>
  <li><strong>Email e password</strong> per il tuo account artista.</li>
</ul>

<h2>Compilazione</h2>
<p>Vai su <a href="/candidatura-artista">/candidatura-artista</a> e compila il form. Al submit:</p>
<ol>
  <li>Il tuo account viene creato immediatamente: puoi già accedere a <a href="/login">/login</a>.</li>
  <li>La candidatura entra in stato <strong>"in attesa"</strong> e viene revisionata dal team N'arte.</li>
  <li>Ricevi una email di conferma di avvenuta ricezione.</li>
</ol>

<h2>Tempi di approvazione</h2>
<p>Indicativamente <strong>2-5 giorni lavorativi</strong>. Quando il team approva la candidatura, viene creato in automatico il tuo profilo artista pubblico e ricevi una notifica.</p>

<h2>Se sei rifiutato</h2>
<p>La candidatura può essere rifiutata se mancano informazioni essenziali o se il progetto non rientra negli standard editoriali del roster. In ogni caso ricevi una motivazione e puoi ricandidarti dopo aver risolto i punti critici.</p>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "ottimizza-profilo",
        title: "Come ottimizzare il profilo artista",
        excerpt:
          "Cover, gallery, video, tracce audio e percorso artistico: cosa fa la differenza per ricevere più richieste.",
        content: `
<h2>Profilo completo = più richieste</h2>
<p>I profili con cover, gallery, audio e video ricevono in media molte più richieste di booking rispetto ai profili scarni. Ecco la checklist consigliata.</p>

<h2>1. Cover image</h2>
<p>Verticale (formato 3:4), alta qualità, illuminazione professionale. È la prima immagine che vede l'organizzatore in lista. Evita screenshot social, foto sgranate o con watermark.</p>

<h2>2. Bio (almeno 300 caratteri)</h2>
<p>Racconta in poche righe: chi sei, da quanto suoni, il tuo genere, i punti di forza live, eventuali brani/album rilasciati. Niente liste sterili: una voce autentica funziona meglio.</p>

<h2>3. Generi musicali (max 3)</h2>
<p>Scegli con criterio: i tre generi sono i tag con cui ti trovano. Meglio "pop rock + cantautore italiano" che 8 etichette generiche.</p>

<h2>4. Strumenti suonati live</h2>
<p>Indica gli strumenti che effettivamente porti sul palco. Determinano la <em>tipologia</em> con cui appari nei filtri (cantante, batterista, DJ…).</p>

<h2>5. Galleria + video + tracce audio</h2>
<ul>
  <li><strong>Galleria</strong>: almeno 3 foto live, possibilmente diverse tra loro.</li>
  <li><strong>Video</strong>: 1-3 link a performance dal vivo (YouTube/Vimeo).</li>
  <li><strong>Tracce audio</strong>: demo, brani inediti o estratti live in MP3/WAV/M4A.</li>
</ul>

<h2>6. Percorso artistico (solo Pro/Max)</h2>
<p>Se sei nel piano Pro o Max, puoi specificare la tua categoria: <em>cover artist</em>, <em>tribute band</em> o <em>progetto inedito</em>. Aiuta gli organizzatori a filtrarti meglio.</p>

<h2>Salva e pubblica</h2>
<p>Tutti i campi si modificano da <a href="/dashboard/profilo-artista">/dashboard/profilo-artista</a>. Le modifiche sono immediate sulla pagina pubblica.</p>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "gestire-richieste",
        title: "Come gestire le richieste di booking",
        excerpt:
          "Quando ricevi una nuova richiesta: come rispondere, accettare, declinare o aprire una trattativa in chat.",
        content: `
<h2>Dove vedi le richieste</h2>
<p>Tutte le richieste arrivano in <a href="/dashboard/leads">/dashboard/leads</a> con tre stati:</p>
<ul>
  <li><strong>Nuove</strong>: ancora non gestite. Ricevi anche una email di notifica.</li>
  <li><strong>Contattate</strong>: hai già scritto all'organizzatore o accettato in via preliminare.</li>
  <li><strong>Chiuse</strong>: trattativa conclusa (confermata, declinata o annullata).</li>
</ul>

<h2>Workflow consigliato</h2>
<ol>
  <li>Rispondi <strong>entro 24-48 ore</strong>: gli organizzatori spesso valutano più artisti in parallelo.</li>
  <li>Se la data è libera e il budget congruo, <strong>accetta in via preliminare</strong> e apri la chat per concordare i dettagli.</li>
  <li>Usa la <strong>chat N'arte</strong> per scambi rapidi e tracciati: nessuna conversazione perduta su WhatsApp.</li>
  <li>Quando entrambi siete d'accordo, l'organizzatore <strong>conferma la data</strong>: ricevi email automatica e l'evento entra in calendario.</li>
</ol>

<h2>Declinare con cortesia</h2>
<p>Se non sei disponibile, declinare velocemente è un favore all'organizzatore (può rivolgersi ad altri). Lo fai con un click da <a href="/dashboard/leads">/dashboard/leads</a>.</p>

<h2>Calendario disponibilità</h2>
<p>Mantieni aggiornato il calendario in <a href="/dashboard/calendario">/dashboard/calendario</a>: gli organizzatori vedono le date occupate prima ancora di scriverti.</p>
`,
        updatedAt: "2026-05-26",
      },
      placeholder(
        "tier-pro-max",
        "Differenze tra piani Free, Pro e Max",
        "Cosa include ciascun piano e come effettuare l'upgrade."
      ),
      placeholder(
        "compensi-fatturazione",
        "Compensi, contratto e fatturazione",
        "Come avviene il pagamento, chi emette fattura, ritenute e SIAE."
      ),
      placeholder(
        "video-promo",
        "Come registrare un video live efficace",
        "Linee guida tecniche e creative per video che convertono."
      ),
    ],
  },

  // ============================================
  // PER ORGANIZZATORI
  // ============================================
  {
    slug: "organizzatori",
    title: "Per organizzatori",
    description:
      "Guide per chi prenota artisti: cercare nel roster, inviare richieste, gestire la trattativa.",
    icon: "users",
    audience: "organizer",
    articles: [
      {
        slug: "trovare-artista",
        title: "Come trovare l'artista giusto",
        excerpt:
          "Filtri per genere, tipologia, città e disponibilità: usare la pagina /artisti al meglio.",
        content: `
<h2>Punto di partenza: /artisti</h2>
<p>La pagina <a href="/artisti">/artisti</a> mostra tutto il roster approvato. Puoi combinare tre tipi di filtro:</p>
<ul>
  <li><strong>Tipologia artista</strong> (multi-select): cantante, chitarrista, batterista, DJ, sassofonista…</li>
  <li><strong>Generi musicali</strong> (multi-select): pop, rock, jazz, elettronica, cantautorato…</li>
  <li><strong>Ricerca testuale</strong>: nome d'arte o città.</li>
</ul>
<p>Il contatore artisti si aggiorna in tempo reale. Reset filtri in alto a destra.</p>

<h2>Cosa guardare nella card</h2>
<ul>
  <li><strong>Cover + nome d'arte</strong>: prima impressione, audio e video sono nel dettaglio.</li>
  <li><strong>Generi</strong>: 1-3 etichette principali.</li>
  <li><strong>Città</strong>: utile per minimizzare costi viaggio.</li>
  <li><strong>Fascia di prezzo</strong> (visibile solo a organizzatori e superadmin).</li>
</ul>

<h2>Aprire il profilo</h2>
<p>Click sulla card: accedi alla pagina dettaglio con bio completa, gallery, audio, video, percorso artistico (se presente) e form di richiesta booking.</p>

<h2>Hai dubbi sulla scelta?</h2>
<p>Prenota una <a href="/help/consulenza/prenotare-chiamata">chiamata gratuita con un consulente N'arte</a>: ti aiutiamo a restringere il campo in 30 minuti.</p>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "richiedere-booking",
        title: "Come inviare una richiesta di booking",
        excerpt:
          "Form di richiesta: dati obbligatori, cosa scrivere nel messaggio e cosa succede dopo l'invio.",
        content: `
<h2>Aprire il form</h2>
<p>Nella pagina dettaglio dell'artista trovi il form di richiesta. Se non sei loggato, puoi inserire i dati di contatto direttamente nel form e il sistema crea automaticamente il tuo account.</p>

<h2>Campi del form</h2>
<ul>
  <li><strong>Data evento</strong> (obbligatoria): se l'artista ha il giorno bloccato in calendario, il sistema te lo segnala.</li>
  <li><strong>Slot orario</strong>: mattina / pomeriggio / sera / notte. Opzionale ma raccomandato.</li>
  <li><strong>Location</strong>: indirizzo o nome locale. Se sei organizzatore registrato, puoi collegare una <em>struttura</em> già salvata.</li>
  <li><strong>Budget</strong>: indicativo, in euro. Anche se preliminare, dà subito un segnale all'artista.</li>
  <li><strong>Messaggio</strong> (min 20 caratteri): descrivi tipo di evento, pubblico atteso, durata del set, eventuali richieste tecniche.</li>
</ul>

<h2>Cosa succede dopo</h2>
<ol>
  <li>L'artista riceve una mail con il riepilogo della richiesta.</li>
  <li>Tu ricevi una mail di conferma di avvenuto invio.</li>
  <li>Si apre una <strong>chat dedicata</strong> in cui dialogare con l'artista.</li>
  <li>La trattativa procede con offerte e controproposte; alla conferma, la data viene registrata in entrambi i calendari.</li>
</ol>

<h2>Tempi di risposta</h2>
<p>Indicativamente 24-72 ore. Se l'artista non risponde entro 5 giorni, considera di scrivere a un altro artista o contattare il team N'arte per supporto.</p>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "gestire-trattativa",
        title: "Come gestire la trattativa in chat",
        excerpt:
          "Offerte tracciate, controproposta, conferma: come usare la chat N'arte senza intoppi.",
        content: `
<h2>Chat dedicata</h2>
<p>Ogni richiesta apre una conversazione 1-a-1 con l'artista in <a href="/organizzatore/chat">/organizzatore/chat</a>. Tutti gli scambi (testo, allegati, offerte) sono tracciati e disponibili in caso di contestazioni.</p>

<h2>Offerte strutturate</h2>
<p>Oltre ai messaggi liberi puoi inviare <strong>offerte strutturate</strong> con tre campi vincolanti:</p>
<ul>
  <li>Data evento</li>
  <li>Slot orario (mattina/pomeriggio/sera/notte)</li>
  <li>Budget in euro</li>
</ul>
<p>L'artista può <strong>accettare</strong>, <strong>rifiutare</strong> o inviare una <em>controproposta</em>. Quando un'offerta viene accettata, il booking entra automaticamente in stato "in trattativa avanzata".</p>

<h2>Conferma finale</h2>
<p>Dopo l'accettazione, vai in <a href="/organizzatore/richieste">/organizzatore/richieste</a> e clicca <strong>Conferma data</strong>. A questo punto:</p>
<ul>
  <li>Entrambi ricevete email di conferma.</li>
  <li>La data viene marcata "occupata" nel calendario dell'artista.</li>
  <li>L'evento appare in <em>"Confermate"</em> nella tua dashboard.</li>
</ul>

<h2>Allegati</h2>
<p>Puoi inviare PDF (contratti, brief), immagini (foto location) e file vocali. Limite: 25 MB per file.</p>
`,
        updatedAt: "2026-05-26",
      },
      placeholder(
        "strutture-multiple",
        "Gestire più strutture/venue",
        "Salvare strutture per inviare richieste più rapide e ricevere richieste mirate."
      ),
      placeholder(
        "annullare-data",
        "Annullare una data confermata",
        "Quando è possibile, policy di cancellazione e penali."
      ),
      placeholder(
        "guida-rider-tecnico",
        "Cos'è il rider tecnico e perché chiederlo",
        "Allestimento audio/luci minimo per ciascun tipo di formazione."
      ),
    ],
  },

  // ============================================
  // BOOKING & RICHIESTE
  // ============================================
  {
    slug: "booking",
    title: "Booking e richieste",
    description:
      "Stati di una richiesta, email automatiche, calendario disponibilità e flusso end-to-end.",
    icon: "calendar",
    audience: "all",
    articles: [
      {
        slug: "stati-richiesta",
        title: "Stati di una richiesta di booking",
        excerpt:
          "Pending, in trattativa, confermata, rifiutata, annullata: cosa significano e cosa fare in ciascuno.",
        content: `
<h2>I cinque stati</h2>
<ul>
  <li><strong>Pending</strong> — richiesta appena inviata, artista non ha ancora risposto.</li>
  <li><strong>In trattativa</strong> — artista ha accettato in via preliminare, si sta concordando in chat.</li>
  <li><strong>Confermata</strong> — data e budget approvati da entrambe le parti, evento in calendario.</li>
  <li><strong>Rifiutata</strong> — l'artista ha dichiarato indisponibilità o non c'è accordo economico.</li>
  <li><strong>Annullata</strong> — il booking confermato è stato cancellato (da una delle parti o dal team N'arte).</li>
</ul>

<h2>Email automatiche</h2>
<p>Per ogni transizione di stato, sia artista che organizzatore ricevono una notifica via email. Il team N'arte supervisiona tutti gli invii nel pannello admin (<a href="/help/account/notifiche-email">vedi articolo dedicato</a>).</p>

<h2>Chi può cambiare lo stato</h2>
<ul>
  <li><strong>Artista</strong>: accetta o rifiuta una richiesta pending; può inviare controproposte in chat.</li>
  <li><strong>Organizzatore</strong>: conferma la data finale, può inviare nuove offerte.</li>
  <li><strong>Superadmin</strong>: può annullare un booking confermato in caso di contestazione (con motivazione obbligatoria).</li>
</ul>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "calendario-disponibilita",
        title: "Calendario disponibilità (artista)",
        excerpt:
          "Come segnare giorni occupati, slot ricorrenti e fasce orarie per evitare richieste impossibili.",
        content: `
<h2>Dove gestirlo</h2>
<p>Da <a href="/dashboard/calendario">/dashboard/calendario</a> (richiede ruolo artista). Visualizzazione mensile con due stati per giorno:</p>
<ul>
  <li><strong>Disponibile</strong> (default).</li>
  <li><strong>Occupato</strong>: gli organizzatori vedono la data sbarrata e non possono inviare richieste.</li>
</ul>

<h2>Slot orari</h2>
<p>Oltre allo stato giornaliero, puoi definire <strong>slot orari predefiniti</strong> (es. "Live serata 21:00-00:00") e applicarli a singole date. Questo aiuta gli organizzatori a capire le tue finestre tipiche.</p>

<h2>Best practice</h2>
<ul>
  <li>Aggiorna il calendario <strong>almeno una volta a settimana</strong>.</li>
  <li>Blocca le date di tour o vacanze in anticipo.</li>
  <li>Per date confermate via N'arte, il sistema le blocca <strong>automaticamente</strong>.</li>
</ul>
`,
        updatedAt: "2026-05-26",
      },
      placeholder(
        "differenze-lead-booking",
        "Differenza tra lead e booking_request",
        "Quando arriva un lead (da utente normale) vs una booking request (da organizzatore registrato)."
      ),
      placeholder(
        "contratto-modello",
        "Modello di contratto N'arte",
        "Template di contratto base scaricabile (TBD)."
      ),
    ],
  },

  // ============================================
  // CONSULENZA
  // ============================================
  {
    slug: "consulenza",
    title: "Consulenza N'arte",
    description:
      "Chiamate gratuite con un consulente per scegliere artisti, format e strategie di programmazione.",
    icon: "phone",
    audience: "all",
    articles: [
      {
        slug: "prenotare-chiamata",
        title: "Come prenotare una chiamata con un consulente",
        excerpt:
          "Slot disponibili, durata, cosa preparare prima della call.",
        content: `
<h2>A chi serve</h2>
<p>La consulenza N'arte è pensata per:</p>
<ul>
  <li><strong>Organizzatori</strong> che vogliono aiuto nella scelta dell'artista per un evento specifico.</li>
  <li><strong>Artisti</strong> che cercano feedback su profilo, posizionamento e strategia.</li>
  <li><strong>Brand</strong> interessati a un format N'arte custom per un'attivazione.</li>
</ul>

<h2>Come prenotare</h2>
<ol>
  <li>Vai sulla sezione consulenza (link in homepage o dalla dashboard artista).</li>
  <li>Scegli uno degli <strong>slot disponibili</strong> dei prossimi 30 giorni.</li>
  <li>Compila nome, email, telefono e una breve descrizione delle tue necessità.</li>
  <li>Ricevi mail di conferma con orario e link/numero per la call.</li>
</ol>

<h2>Durata</h2>
<p>Generalmente <strong>30 minuti</strong> (alcuni slot possono essere di 45-60 minuti, indicato nella scheda).</p>

<h2>Costo</h2>
<p><strong>Gratuita</strong>. Nessuna carta richiesta in fase di prenotazione.</p>
`,
        updatedAt: "2026-05-26",
      },
      placeholder(
        "annullare-consulenza",
        "Annullare o riprogrammare una consulenza",
        "Come modificare l'orario o annullare la chiamata."
      ),
      placeholder(
        "diventa-consulente",
        "Vuoi diventare consulente N'arte?",
        "Requisiti, processo di selezione e come collaborare con il team."
      ),
    ],
  },

  // ============================================
  // ACCOUNT & PROFILO
  // ============================================
  {
    slug: "account",
    title: "Account e profilo",
    description:
      "Login, password, email, ruoli, eliminazione account e gestione delle notifiche.",
    icon: "user-cog",
    audience: "all",
    articles: [
      {
        slug: "recupero-password",
        title: "Come recuperare la password",
        excerpt:
          "Reset password via email da /login: passi e cosa fare se non ricevi la mail.",
        content: `
<h2>Reset standard</h2>
<ol>
  <li>Vai su <a href="/login">/login</a>.</li>
  <li>Click su <strong>"Password dimenticata"</strong>.</li>
  <li>Inserisci la tua email e invia.</li>
  <li>Riceverai un link di reset valido per 60 minuti.</li>
</ol>

<h2>Non arriva la mail?</h2>
<ul>
  <li>Controlla la cartella <strong>Spam</strong> / <strong>Promozioni</strong>.</li>
  <li>Verifica di aver inserito l'email corretta (quella con cui ti sei registrato).</li>
  <li>Se hai un account creato dalla candidatura artista, è l'email indicata in fase di submission.</li>
</ul>

<h2>Ancora bloccato?</h2>
<p><a href="/contatti">Scrivici</a> indicando il tuo nome d'arte (se artista) o l'email registrazione: ti aiutiamo manualmente.</p>
`,
        updatedAt: "2026-05-26",
      },
      {
        slug: "notifiche-email",
        title: "Quali email automatiche invia N'arte",
        excerpt:
          "Elenco completo delle notifiche e come il team le monitora.",
        content: `
<h2>Quando arrivano</h2>
<p>N'arte invia email automatiche nei seguenti casi:</p>
<ul>
  <li><strong>Candidatura artista ricevuta</strong> (candidato + admin).</li>
  <li><strong>Nuova richiesta booking</strong> (artista + admin).</li>
  <li><strong>Risposta artista al booking</strong> (organizzatore).</li>
  <li><strong>Conferma data</strong> (artista + organizzatore).</li>
  <li><strong>Annullamento da admin</strong> (artista + organizzatore, con motivazione).</li>
  <li><strong>Prenotazione consulenza</strong> (utente + admin).</li>
  <li><strong>Messaggio contatti</strong> (admin).</li>
</ul>

<h2>Provider</h2>
<p>Tutte le email sono inviate via <strong>Resend</strong> con dominio verificato. Mittente: <code>N'arte &lt;noreply@narte.it&gt;</code>.</p>

<h2>Supervisione admin</h2>
<p>Il superadmin può monitorare tutti gli invii dal pannello <a href="/admin/email">/admin/email</a>: stato (sent/failed/skipped), template, destinatari, statistiche aggregate.</p>

<h2>Disattivare le notifiche</h2>
<p>Al momento non è possibile disattivare le email transazionali (sono fondamentali per il flusso booking). Newsletter e comunicazioni marketing seguono regole separate (in arrivo).</p>
`,
        updatedAt: "2026-05-26",
      },
      placeholder(
        "cambiare-email",
        "Cambiare email account",
        "Procedura per aggiornare l'indirizzo email di registrazione."
      ),
      placeholder(
        "eliminare-account",
        "Eliminare il proprio account",
        "Differenza tra disattivazione e cancellazione GDPR, dati conservati."
      ),
      placeholder(
        "privacy-dati",
        "Privacy e gestione dati personali",
        "Cookie policy, esportazione dati, diritti GDPR."
      ),
    ],
  },

  // ============================================
  // PAGAMENTI (placeholder category)
  // ============================================
  {
    slug: "pagamenti",
    title: "Pagamenti e fatturazione",
    description:
      "Modalità di pagamento, fatturazione tra artista e organizzatore, ritenute e SIAE.",
    icon: "credit-card",
    audience: "all",
    articles: [
      placeholder(
        "modalita-pagamento",
        "Modalità di pagamento accettate",
        "Bonifico, carta, soluzioni alternative."
      ),
      placeholder(
        "fattura-artista",
        "Chi emette la fattura: artista o N'arte?",
        "Regole, casistiche (P.IVA, prestazione occasionale) e flussi."
      ),
      placeholder(
        "siae",
        "Gestione SIAE per eventi live",
        "Quando serve, chi la paga, come comunicarla."
      ),
      placeholder(
        "acconto-saldo",
        "Acconto, saldo e tutele",
        "Best practice per tutelare entrambe le parti."
      ),
    ],
  },

  // ============================================
  // POLICY (placeholder category)
  // ============================================
  {
    slug: "policy",
    title: "Policy, termini e sicurezza",
    description:
      "Termini di servizio, codice di condotta, gestione contestazioni e sicurezza account.",
    icon: "shield",
    audience: "all",
    articles: [
      placeholder(
        "termini-servizio",
        "Termini di servizio N'arte",
        "Versione integrale dei ToS."
      ),
      placeholder(
        "codice-condotta",
        "Codice di condotta della community",
        "Comportamenti attesi tra artisti, organizzatori e staff."
      ),
      placeholder(
        "contestazioni",
        "Come gestiamo le contestazioni",
        "Mediazione N'arte, escalation, rimborsi."
      ),
      placeholder(
        "sicurezza-account",
        "Sicurezza dell'account",
        "Best practice password, sospetta attività, contatto rapido staff."
      ),
    ],
  },
];

// ============================================
// HELPERS
// ============================================

export function findCategory(slug: string): HelpCategory | null {
  return HELP_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function findArticle(
  categorySlug: string,
  articleSlug: string
): { category: HelpCategory; article: HelpArticle } | null {
  const category = findCategory(categorySlug);
  if (!category) return null;
  const article = category.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return { category, article };
}

export function popularArticles(limit = 6): {
  category: HelpCategory;
  article: HelpArticle;
}[] {
  const out: { category: HelpCategory; article: HelpArticle }[] = [];
  const POPULAR_SLUGS: [string, string][] = [
    ["iniziare", "cos-e-narte"],
    ["organizzatori", "richiedere-booking"],
    ["artisti", "candidatura-artista"],
    ["consulenza", "prenotare-chiamata"],
    ["artisti", "ottimizza-profilo"],
    ["booking", "stati-richiesta"],
  ];
  for (const [cat, art] of POPULAR_SLUGS) {
    const f = findArticle(cat, art);
    if (f) out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

export function searchArticles(
  query: string,
  limit = 20
): { category: HelpCategory; article: HelpArticle }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: { category: HelpCategory; article: HelpArticle }[] = [];
  for (const cat of HELP_CATEGORIES) {
    for (const art of cat.articles) {
      const hay = `${art.title} ${art.excerpt} ${art.content}`.toLowerCase();
      if (hay.includes(q)) out.push({ category: cat, article: art });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function relatedArticles(
  categorySlug: string,
  currentSlug: string,
  limit = 4
): HelpArticle[] {
  const cat = findCategory(categorySlug);
  if (!cat) return [];
  const related = cat.articles
    .find((a) => a.slug === currentSlug)?.related;
  if (related && related.length > 0) {
    return cat.articles.filter((a) => related.includes(a.slug)).slice(0, limit);
  }
  return cat.articles.filter((a) => a.slug !== currentSlug).slice(0, limit);
}
