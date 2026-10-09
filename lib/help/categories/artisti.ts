import type { HelpCategory } from "@/lib/help/types";
import {
  ENTITLEMENTS,
  PLAN_LABELS,
  PLAN_PRICES_CENTS,
  PLAN_FEATURES,
  formatPrice,
} from "@/lib/billing/plans";
import {
  MAX_VIDEO_BYTES_BUNNY,
  MAX_VIDEO_PER_ARTIST,
} from "@/lib/upload/video-limits";

const UPDATED = "2026-10-09";

/** Megabyte leggibili a partire dai byte della fonte unica. */
const MB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/**
 * Righe della tabella «Cosa include ogni piano»: le stesse di /prezzi e di
 * /dashboard/abbonamento (PLAN_FEATURES in lib/billing/plans.ts), così il
 * Centro Assistenza non può dire una cosa diversa dal listino. Si mostrano le
 * richieste di booking e le righe che distinguono i piani (`primary`).
 */
const PLAN_TABLE_ROWS = PLAN_FEATURES.filter(
  (r) => r.primary || r.label === "Richieste di booking"
)
  .map((r) => {
    const cella = (v: string | boolean) => (v === true ? "sì" : v === false ? "—" : v);
    return `    <tr><td>${r.label}</td><td>${cella(r.values.free)}</td><td>${cella(r.values.pro)}</td><td>${cella(r.values.max)}</td></tr>`;
  })
  .join("\n");

export const ARTISTI: HelpCategory = {
  slug: "artisti",
  title: "Per artisti",
  description:
    "Entrare nel roster, costruire un profilo che riceve richieste e gestire le proposte che arrivano.",
  icon: "music",
  audience: "artist",
  articles: [
    {
      slug: "candidatura-artista",
      title: "Come candidarsi come artista",
      excerpt:
        "Cosa preparare, come si compila il modulo, quanto si attende e cosa succede dopo l'invio.",
      updatedAt: UPDATED,
      related: ["ottimizza-profilo", "tier-pro-max", "iniziare/come-creare-account"],
      content: `
<h2>Prima di iniziare</h2>
<p>La candidatura richiede pochi minuti, ma conviene avere già sottomano:</p>
<ul>
  <li><strong>Nome e cognome</strong> e un <strong>indirizzo email</strong> che controlli spesso: la risposta arriverà lì.</li>
  <li><strong>Nome d'arte</strong>, anche provvisorio: potrai cambiarlo in seguito dalla dashboard.</li>
  <li><strong>Generi musicali</strong>, da 1 a un massimo di 3. Sono il filtro principale con cui ti cercano, quindi meglio due etichette precise che cinque generiche.</li>
  <li><strong>Strumenti</strong> che porti sul palco (facoltativo, massimo 3).</li>
  <li><strong>Una biografia</strong> che racconti il progetto: da quanto suoni, che tipo di serate fai, cosa ti distingue.</li>
  <li><strong>Almeno un link attivo</strong> fra Instagram, Spotify e sito.</li>
  <li>Un <strong>video di riferimento</strong>: è facoltativo, ma aiuta molto, perché una performance dice più di tre paragrafi.</li>
</ul>

<h2>Cosa succede quando invii</h2>
<p>Questo è il punto che sorprende più spesso: <strong>la candidatura non crea un account.</strong> Non riceverai credenziali e per il momento non potrai accedere.</p>
<ol>
  <li>La candidatura viene registrata ed entra in stato <strong>in attesa</strong>.</li>
  <li>Ricevi un'email che ne conferma la ricezione.</li>
  <li>Il team la legge e prende una decisione.</li>
  <li><strong>Solo se viene approvata</strong> creiamo il tuo account e il tuo profilo artista. A quel punto ti arriva un'email con un link per impostare la password e accedere da <a href="/login">/login</a>.</li>
</ol>

<h2>Quanto si attende</h2>
<p>Indicativamente <strong>2-5 giorni lavorativi</strong>. Ogni candidatura viene valutata a mano da una persona del team, quindi nei periodi più affollati può servire qualche giorno in più.</p>

<h2>Se la candidatura non viene accolta</h2>
<p>Può succedere se mancano informazioni essenziali, se i link non funzionano o se il progetto non rientra negli standard editoriali del roster.</p>
<p><strong>Al momento il rifiuto non genera un'email automatica</strong>: se sono passate più di due settimane senza notizie, <a href="/contatti">scrivici</a> con il nome d'arte con cui ti sei candidato e ti diciamo a che punto siamo. Una volta sistemati i punti deboli, puoi ricandidarti.</p>

<h2>Serve un account a testa se siamo una band?</h2>
<p>No. Una band si candida come <strong>un solo progetto</strong>, con un nome d'arte e un referente. I nomi dei componenti li aggiungi poi nel profilo, nel campo formazione.</p>

<h2>Quanto costa</h2>
<p>La candidatura è gratuita e il profilo ${PLAN_LABELS.free} non scade. I piani a pagamento sono facoltativi e sbloccano chat, recensioni e visibilità: trovi tutto in <a href="/help/artisti/tier-pro-max">le differenze tra i piani</a>.</p>
`,
    },

    {
      slug: "ottimizza-profilo",
      title: "Come ottimizzare il profilo artista",
      excerpt:
        "La checklist dei campi che contano: cosa compilare, in che ordine e perché un profilo completo riceve più richieste.",
      updatedAt: UPDATED,
      related: ["foto-video-audio", "badge-e-visibilita", "video-promo"],
      content: `
<h2>Dove si modifica</h2>
<p>Tutto si gestisce da <strong>/dashboard/profilo-artista</strong>. L'editor è diviso in blocchi che apri e salvi uno alla volta, così puoi compilare una sezione oggi e un'altra domani. Ogni salvataggio aggiorna subito la tua pagina pubblica.</p>
<p>In fondo alla barra laterale c'è l'indicatore <strong>"Profilo completo"</strong>: controlla sette voci e ti mostra quali mancano ancora.</p>

<h2>Le sette voci che contano</h2>
<p>L'indicatore misura proprio le cose che un organizzatore guarda prima di scriverti.</p>
<ol>
  <li><strong>Foto di copertina</strong> — verticale, formato 3:4. È la prima immagine che si vede in elenco, quindi evita screenshot dai social, foto sgranate o con loghi sopra.</li>
  <li><strong>Biografia</strong> — servono almeno alcune righe sostanziose. Racconta chi sei, che tipo di live porti e quanto dura di solito il tuo set.</li>
  <li><strong>Galleria</strong> — almeno 3 foto, meglio se diverse tra loro: un primo piano, una sul palco, una con il pubblico.</li>
  <li><strong>Almeno un video</strong> — conta più di tutto il resto messo insieme. Vedi <a href="/help/artisti/video-promo">come registrare un video efficace</a>.</li>
  <li><strong>Almeno un genere</strong> — da 1 a 3, è il filtro con cui ti trovano.</li>
  <li><strong>Fascia di prezzo</strong> — indicarla ti aiuta a ricevere richieste in linea con il tuo cachet.</li>
  <li><strong>Lingue</strong> — italiano, dialetto, inglese, francese, spagnolo.</li>
</ol>

<h2>Il blocco "Informazioni di booking"</h2>
<p>È la sezione che gli organizzatori leggono con più attenzione prima di decidere. I campi sono tutti facoltativi, ma ognuno che compili è una domanda in meno durante la trattativa:</p>
<ul>
  <li><strong>Durata minima e massima del set</strong>, da 30 a 180 minuti.</li>
  <li><strong>Cosa aspettarsi dal live</strong> — stile, atmosfera, i momenti migliori del set.</li>
  <li><strong>Storia del progetto</strong> in versione estesa.</li>
  <li><strong>Formazione</strong> — nome e ruolo di chi sale sul palco.</li>
  <li><strong>Scaletta di esempio</strong>.</li>
  <li><strong>Influenze musicali</strong>, separate da virgola.</li>
  <li><strong>Requisiti tecnici</strong> — impianto, palco, alimentazione. Se li indichi, la sera stessa non ci sono sorprese.</li>
</ul>

<h2>Strumenti e percorso artistico</h2>
<p>Gli <strong>strumenti</strong> che indichi decidono la tipologia con cui compari nei filtri (cantante, chitarrista, batterista, dj), quindi segna quelli che porti effettivamente sul palco.</p>
<p>Il <strong>percorso artistico</strong> (cover artist, tribute band o progetto inedito) è incluso nei piani ${PLAN_LABELS.pro} e ${PLAN_LABELS.max} e aiuta gli organizzatori a capire al volo che tipo di serata proponi.</p>

<h2>Social</h2>
<p>Puoi collegare Instagram, Facebook, TikTok, YouTube, Spotify e il tuo sito. I link compaiono sulla pagina pubblica e sono il modo più immediato per mostrare che il progetto è attivo.</p>

<h2>Quanto materiale puoi caricare</h2>
<p>Dipende dal piano: ${ENTITLEMENTS.free.galleryMax} foto e ${ENTITLEMENTS.free.videoMax} video con ${PLAN_LABELS.free}, fino a ${ENTITLEMENTS.pro.galleryMax} foto con ${PLAN_LABELS.pro}, fino a ${ENTITLEMENTS.max.galleryMax} con ${PLAN_LABELS.max}. Il dettaglio, formati compresi, è in <a href="/help/artisti/foto-video-audio">foto, video e audio</a>.</p>
`,
    },

    {
      slug: "gestire-richieste",
      title: "Come gestire le richieste di booking",
      excerpt:
        "Cosa fare quando arriva una proposta: accettare, rifiutare, fare una controproposta. E chi dà la conferma finale.",
      updatedAt: UPDATED,
      related: ["chat-e-offerte", "booking/stati-richiesta", "booking/dopo-la-conferma"],
      content: `
<h2>Dove arrivano</h2>
<p>Le trovi in <strong>/dashboard/leads</strong>, divise in tre schede: <strong>Nuove</strong>, <strong>In trattativa</strong>, <strong>Confermate</strong>. Per ogni nuova richiesta ricevi anche un'email di riepilogo.</p>
<p>Le richieste di booking arrivano <strong>su ogni piano, senza limiti</strong>: non blocchiamo mai un organizzatore che ti sta cercando.</p>

<h2>Le tue due possibilità su una richiesta nuova</h2>

<h3>Accettare la trattativa</h3>
<p>Al primo click su <strong>"Accetta proposta"</strong> si apre un campo facoltativo per una <strong>nota o controproposta</strong>, dove puoi scrivere per esempio "disponibile ma alle 22, non alle 21" o "il cachet per quella distanza sarebbe più alto". Con il secondo click confermi.</p>
<p>Accettare vuol dire <strong>"parliamone"</strong>, non ancora "è fatta": la richiesta passa in trattativa, si apre la chat con l'organizzatore e la data resta libera.</p>

<h3>Rifiutare</h3>
<p>Con un click su <strong>"Rifiuta"</strong> la richiesta si chiude e l'organizzatore riceve un'email di avviso. Non devi dare una motivazione, ma rispondere in fretta gli fa un vero favore: così può cercare altrove finché è in tempo.</p>

<h2>La conferma finale non è tua</h2>
<p>Qui nascono spesso aspettative sbagliate. Dopo l'accordo in chat <strong>è l'organizzatore a premere "Conferma data"</strong>, e finché non lo fa la richiesta resta in trattativa, anche se vi siete già detti tutto.</p>
<p>Se avete chiuso l'accordo e la conferma non arriva, ricordaglielo in chat. Nel frattempo la tua scheda mostra <em>"In attesa della conferma definitiva dell'organizzatore"</em>.</p>

<h2>La scorciatoia: accettare un'offerta</h2>
<p>Se l'organizzatore ti manda in chat un'<strong>offerta</strong> con data, fascia oraria e budget e tu la accetti, la data è <strong>confermata immediatamente</strong>, senza altri passaggi. È la strada più rapida e anche la più chiara. Vedi <a href="/help/artisti/chat-e-offerte">chat e offerte</a>.</p>

<h2>Non ci sono scadenze automatiche</h2>
<p>Una richiesta non scade da sola: resta aperta finché rispondi o finché l'organizzatore la annulla. Aspettare però non conviene. Gli organizzatori scrivono a più artisti insieme, e la data la chiude quasi sempre chi risponde entro <strong>24-48 ore</strong>.</p>

<h2>Tieni il calendario aggiornato</h2>
<p>Il calendario in <strong>/dashboard/calendario</strong> è pubblico: segnando le date occupate eviti richieste impossibili e fate prima tutti e due. Le date confermate tramite N'arte si bloccano in automatico.</p>

<h2>Se hai il piano ${PLAN_LABELS.free}</h2>
<p>Ricevi tutte le richieste e tutte le email, e puoi accettarle o rifiutarle. <strong>Per rispondere in chat</strong> serve invece ${PLAN_LABELS.pro}: il limite riguarda la chat, non le richieste.</p>
`,
    },

    {
      slug: "foto-video-audio",
      title: "Foto, video e tracce audio: limiti e formati",
      excerpt:
        "Quante ne puoi caricare per piano, quali formati accettiamo, quanto possono pesare e perché un video resta in elaborazione.",
      updatedAt: UPDATED,
      related: ["ottimizza-profilo", "video-promo", "tier-pro-max"],
      content: `
<h2>Quanto puoi caricare</h2>
<table>
  <thead>
    <tr><th>Contenuto</th><th>${PLAN_LABELS.free}</th><th>${PLAN_LABELS.pro}</th><th>${PLAN_LABELS.max}</th></tr>
  </thead>
  <tbody>
    <tr><td>Foto in galleria</td><td>${ENTITLEMENTS.free.galleryMax}</td><td>${ENTITLEMENTS.pro.galleryMax}</td><td>${ENTITLEMENTS.max.galleryMax}</td></tr>
    <tr><td>Video</td><td>${ENTITLEMENTS.free.videoMax}</td><td>${ENTITLEMENTS.pro.videoMax}</td><td>${ENTITLEMENTS.max.videoMax}</td></tr>
    <tr><td>Tracce audio</td><td>—</td><td>${ENTITLEMENTS.pro.audioMax}</td><td>${ENTITLEMENTS.max.audioMax}</td></tr>
  </tbody>
</table>

<h2>Foto</h2>
<p>Si caricano dal blocco <strong>Galleria foto</strong> del profilo, da computer o da telefono. Prima dell'invio vengono compresse in automatico nel browser, quindi non serve ridimensionarle: carica pure il file originale.</p>
<p>Le foto diventano pubbliche <strong>solo dopo che hai salvato il blocco</strong>.</p>

<h2>Video</h2>
<p>Si caricano dal blocco <strong>Galleria video</strong>. Massimo <strong>${MAX_VIDEO_PER_ARTIST} video</strong> per profilo sui piani a pagamento, ${ENTITLEMENTS.free.videoMax} con ${PLAN_LABELS.free}.</p>
<ul>
  <li><strong>Peso massimo</strong>: fino a ${MB(MAX_VIDEO_BYTES_BUNNY)} per file.</li>
  <li><strong>Formati</strong>: MP4 e WebM sempre; a seconda della configurazione anche MOV (i video girati con iPhone), MKV, M4V, MPEG e AVI.</li>
  <li>Dopo il caricamento puoi <strong>rinominare il titolo</strong>, ma non sostituire il file: per cambiarlo, elimina il video e ricaricalo.</li>
</ul>

<h3>Perché il video resta "in elaborazione"</h3>
<p>Appena caricato, un video non è ancora pronto: viene convertito nei formati che ne permettono la riproduzione fluida su qualsiasi dispositivo e connessione. Di solito servono alcuni minuti, di più se il file è lungo e pesante. Intanto il resto del profilo funziona normalmente e puoi chiudere la pagina e tornare più tardi.</p>
<p>Se dopo diverse ore un video è ancora in elaborazione, <a href="/contatti">segnalacelo</a>.</p>

<h3>Ho un link YouTube, posso incollarlo?</h3>
<p>Non più: ora i video si caricano come file. I link inseriti in passato <strong>restano visibili</strong> sul profilo pubblico e continuano a funzionare, ma i nuovi video vanno caricati direttamente. Anche il risultato ci guadagna: niente pubblicità prima della tua performance e niente video di altri suggeriti alla fine.</p>

<h2>Tracce audio</h2>
<p>Incluse nei piani ${PLAN_LABELS.pro} e ${PLAN_LABELS.max}: <strong>${ENTITLEMENTS.pro.audioMax} traccia</strong> per profilo. Formati MP3, WAV e M4A, fino a <strong>25 MB</strong>.</p>
<p>Avendo una sola traccia, sceglila con cura: un estratto live che rappresenti quello che succede quando suoni funziona meglio del brano più curato in studio.</p>

<h2>Se cambio piano perdo i contenuti?</h2>
<p><strong>No.</strong> Se passi a un piano inferiore, i contenuti in eccesso spariscono dal profilo pubblico ma restano nel tuo editor, contrassegnati, e tornano visibili appena risali di piano. Non cancelliamo nulla.</p>
`,
    },

    {
      slug: "profili-multipli",
      title: "Gestire più profili artista",
      excerpt:
        "Un solo account, più progetti: come funzionano i profili multipli, quanti ne puoi avere e cosa succede se cambi piano.",
      updatedAt: UPDATED,
      related: ["tier-pro-max", "pagamenti/abbonamento-artista", "ottimizza-profilo"],
      content: `
<h2>A cosa servono</h2>
<p>Molti musicisti portano avanti più progetti: il duo acustico, la tribute band, il set da dj. Ognuno ha generi e cachet suoi, e metterli tutti in un solo profilo confonde chi cerca. Con i profili multipli li tieni separati, mantenendo <strong>un solo account e un solo accesso</strong>.</p>

<h2>Quanti se ne possono avere</h2>
<ul>
  <li><strong>${PLAN_LABELS.free}</strong> — ${ENTITLEMENTS.free.artistProfilesMax} profilo</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — fino a ${ENTITLEMENTS.pro.artistProfilesMax} profili</li>
  <li><strong>${PLAN_LABELS.max}</strong> — fino a ${ENTITLEMENTS.max.artistProfilesMax} profili</li>
</ul>
<p><strong>L'abbonamento è dell'account, non del singolo profilo.</strong> Paghi una volta e ogni profilo che crei eredita i vantaggi del piano, senza abbonamenti separati per progetto.</p>

<h2>Come si crea un profilo nuovo</h2>
<p>Lo crei da <strong>/dashboard/profili</strong> indicando nome d'arte e città. Il profilo nasce subito con i vantaggi del tuo piano, ma resta <strong>in revisione</strong> finché il team non lo approva, e solo allora diventa visibile agli organizzatori. Il controllo di qualità è lo stesso della prima candidatura.</p>
<p>Gli stati possibili sono <strong>Pubblicato</strong>, <strong>In revisione</strong> e <strong>Non approvato</strong>.</p>

<h2>Passare da un profilo all'altro</h2>
<p>In alto nella dashboard c'è un selettore. Il profilo attivo determina <strong>tutto</strong> quello che vedi: calendario, richieste, chat, recensioni e statistiche sono separati per ciascun profilo. Se non trovi una richiesta che aspettavi, controlla di essere sul profilo giusto.</p>

<h2>Cosa succede se scendo di piano</h2>
<p>I profili oltre il nuovo limite vengono <strong>sospesi, non cancellati</strong>: spariscono dal sito ma restano intatti nella tua area, e tornano online da soli appena risali di piano.</p>
<p>A essere sospesi sono i profili creati più di recente: <strong>il profilo principale non viene mai toccato</strong>.</p>
`,
    },

    {
      slug: "chat-e-offerte",
      title: "Chat e offerte: come si chiude una data",
      excerpt:
        "Come funziona la conversazione con l'organizzatore, cosa sono le offerte tracciate e perché la chat richiede un piano a pagamento.",
      updatedAt: UPDATED,
      related: ["gestire-richieste", "tier-pro-max", "booking/dopo-la-conferma"],
      content: `
<h2>Quando si apre la chat</h2>
<p>La conversazione si apre quando accetti una richiesta di booking, ma puoi anche avviarla tu dal pulsante <strong>"Apri chat con l'organizzatore"</strong>.</p>
<p>C'è <strong>una chat per ogni organizzatore</strong>, non una per richiesta: se lo stesso locale ti scrive per tre date diverse, la conversazione resta una sola e ci trovi tutto lo storico.</p>

<h2>Cosa puoi mandare</h2>
<ul>
  <li><strong>Messaggi</strong> fino a 2.000 caratteri.</li>
  <li><strong>Foto</strong> e <strong>documenti</strong> (PDF, Word, Excel, testo, ZIP), fino a <strong>25 MB</strong> per file.</li>
  <li><strong>Messaggi vocali</strong>, registrati direttamente dalla chat.</li>
  <li><strong>Offerte strutturate</strong>, che spieghiamo qui sotto.</li>
</ul>

<h2>Le offerte</h2>
<p>Un'offerta è una proposta formale, diversa da un semplice messaggio: contiene <strong>data</strong>, <strong>fascia oraria</strong> e <strong>budget</strong>, più una descrizione facoltativa. Chi la riceve può accettarla o rifiutarla con un pulsante.</p>
<p>Gli stati sono quattro: <strong>In sospeso</strong>, <strong>Accettata</strong>, <strong>Rifiutata</strong> e <strong>Sostituita</strong>. L'ultimo merita due parole: quando qualcuno manda una nuova offerta, quella ancora in sospeso viene sostituita in automatico. Così non ci sono mai due proposte valide nello stesso momento e non rischi di accettare quella vecchia.</p>

<h3>Accettare un'offerta conferma la data</h3>
<p>È il passaggio più importante. Quando accetti un'offerta <strong>la data è confermata</strong>: si blocca sul tuo calendario, compare in quello dell'organizzatore e partono le email a entrambi, senza altri passaggi.</p>
<p>Per questo accetta solo quando sei d'accordo su tutto. Se un dettaglio non ti convince, rifiuta e manda tu una controproposta, che sarà a sua volta un'offerta da accettare o rifiutare.</p>

<h2>Perché non riesco a scrivere?</h2>
<p>La chat è inclusa nei piani <strong>${PLAN_LABELS.pro}</strong> e <strong>${PLAN_LABELS.max}</strong>. Con ${PLAN_LABELS.free} ricevi le richieste e le email e vedi la conversazione, ma per rispondere serve un piano a pagamento.</p>
<p>L'abbiamo deciso apposta: le <strong>richieste di booking non sono mai limitate</strong>, su nessun piano, perché bloccarle penalizzerebbe l'organizzatore che ti sta cercando. Il limite arriva un passo dopo, sulla trattativa.</p>
<p>L'organizzatore invece non ha limitazioni: può sempre scrivere e fare offerte.</p>

<h2>Notifiche</h2>
<p>Ricevi un'email quando arriva un messaggio che non hai ancora letto (al massimo una ogni mezz'ora, per non riempirti la casella) e <strong>sempre</strong> quando arriva un'offerta. Per riservatezza l'email non riporta mai il testo del messaggio: per leggerlo devi entrare in piattaforma.</p>

<h2>Restano tracciati?</h2>
<p>Sì, e conviene a entrambi: se nasce un disaccordo su cosa era stato pattuito, la conversazione è lì da rileggere. Per questo è meglio concordare i dettagli in chat anziché a voce o su WhatsApp.</p>
`,
    },

    {
      slug: "recensioni-ricevute",
      title: "Le recensioni sul tuo profilo",
      excerpt:
        "Chi può recensirti, quando compare la valutazione, come influisce sul profilo pubblico e cosa fare con una recensione ingiusta.",
      updatedAt: UPDATED,
      related: ["tier-pro-max", "badge-e-visibilita", "policy/contestazioni"],
      content: `
<h2>Chi può recensirti</h2>
<p>Solo un <strong>organizzatore con cui hai fatto una data confermata su N'arte</strong>, e solo <strong>dopo che la data è passata</strong>. Si lascia una recensione per evento, una volta sola.</p>
<p>Il contrario non è previsto: gli artisti non recensiscono gli organizzatori.</p>
<p>In questo modo restano fuori in partenza le recensioni di chi non ti ha mai visto suonare: senza una data confermata in piattaforma non si può recensire.</p>

<h2>Cosa contiene</h2>
<p>Un voto da <strong>1 a 5 stelle</strong> e un commento scritto obbligatorio. Sul tuo profilo pubblico compaiono la media, il numero di recensioni e i singoli commenti con il nome dell'organizzatore.</p>

<h2>Servono un piano ${PLAN_LABELS.pro} o ${PLAN_LABELS.max}</h2>
<p>Le recensioni <strong>si raccolgono sempre</strong>, anche con ${PLAN_LABELS.free}, quindi non se ne perde nessuna. Per <strong>leggerle e mostrarle</strong> sul profilo pubblico, però, serve un piano a pagamento.</p>
<p>Se hai ${PLAN_LABELS.free} e qualcuno ti ha recensito, in dashboard vedi quante recensioni ti aspettano, senza il contenuto. Passando a ${PLAN_LABELS.pro} compaiono tutte insieme, comprese quelle ricevute prima.</p>

<h2>Dove le trovi</h2>
<p>In <strong>/dashboard/feedback</strong>, con il totale, la media dei voti e l'ultima ricevuta.</p>

<h2>Una recensione ingiusta</h2>
<p>Non puoi cancellarla da solo. Se chi viene recensito potesse farlo, le recensioni perderebbero valore, a cominciare dalle tue.</p>
<p>Se una recensione è offensiva, falsa o parla di fatti estranei alla serata, <a href="/segnalazioni?tipo=recensione">segnalala</a> spiegando cosa contesti. Il team può <strong>nasconderla</strong>: a quel punto non compare più e <strong>non pesa sulla media</strong>. Vedi <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>

<h2>Come farne arrivare di buone</h2>
<p>Le recensioni non partono in automatico: è l'organizzatore a decidere se scriverle. Un messaggio di ringraziamento in chat il giorno dopo la serata, con l'invito a lasciare una valutazione, funziona meglio di qualsiasi promemoria automatico.</p>
`,
    },

    {
      slug: "statistiche-profilo",
      title: "Le statistiche del profilo",
      excerpt:
        "Cosa misuriamo, come leggere i numeri e perché le visite degli organizzatori sono quelle che pesano di più.",
      updatedAt: UPDATED,
      related: ["tier-pro-max", "badge-e-visibilita", "ottimizza-profilo"],
      content: `
<h2>Sono incluse nel piano ${PLAN_LABELS.max}</h2>
<p>Le statistiche sono esclusive del piano ${PLAN_LABELS.max} e coprono gli <strong>ultimi ${ENTITLEMENTS.max.statsWindowDays} giorni</strong>. Con gli altri piani la pagina resta visibile e mostra cosa conterrebbe, ma senza i dati.</p>

<h2>Cosa trovi in /dashboard/statistiche</h2>
<ul>
  <li><strong>Visite al profilo</strong> — quanti visitatori distinti hanno aperto la tua pagina.</li>
  <li><strong>Da organizzatori</strong> — quante di quelle visite arrivano da locali e organizzatori registrati.</li>
  <li><strong>Richieste ricevute</strong>, divise per canale di arrivo.</li>
  <li><strong>Salvataggi</strong> — quante volte sei stato messo tra i preferiti da utenti registrati.</li>
  <li><strong>Andamento delle visite</strong> giorno per giorno.</li>
</ul>

<h2>Il numero da guardare</h2>
<p>Più del totale delle visite conta la quota che arriva da <strong>organizzatori registrati</strong>. Cento visite di curiosi non portano una serata, cinque visite di locali che stanno programmando la stagione sì. Per questo nel grafico sono evidenziate a parte.</p>

<h2>Come leggere i numeri</h2>
<ul>
  <li>Si contano i <strong>visitatori distinti al giorno</strong>, non le aperture di pagina: se la stessa persona torna tre volte nello stesso pomeriggio, conta una volta sola.</li>
  <li>Le <strong>tue visite al tuo profilo non vengono contate</strong>.</li>
  <li>I <strong>salvataggi</strong> contano solo gli utenti registrati.</li>
  <li>I dati si aggiornano in tempo reale.</li>
</ul>

<h2>Privacy</h2>
<p>Per queste statistiche non raccogliamo indirizzi IP e non usiamo cookie di tracciamento. L'indirizzo di chi visita viene trasformato in un codice non riconducibile alla persona, che serve solo a non contare due volte la stessa visita nello stesso giorno. Non sappiamo <em>chi</em> ha visto il tuo profilo, solo <em>quanti</em>.</p>

<h2>Cosa farci</h2>
<p>Osserva cosa succede <strong>dopo</strong> una modifica: se aggiungi un video e nelle due settimane successive salgono le visite da organizzatori, hai la tua risposta. È il modo più affidabile per capire cosa funziona sul tuo profilo.</p>
`,
    },

    {
      slug: "badge-e-visibilita",
      title: "Badge e posizione nei risultati",
      excerpt:
        "Cosa significano Artista Pro e TOP Artist, come si ottengono e cosa determina l'ordine in cui compari nel roster.",
      updatedAt: UPDATED,
      related: ["tier-pro-max", "ottimizza-profilo", "statistiche-profilo"],
      content: `
<h2>Artista Pro</h2>
<p>È il badge incluso nei piani <strong>${PLAN_LABELS.pro}</strong> e <strong>${PLAN_LABELS.max}</strong> e compare sul profilo pubblico <strong>in automatico</strong>: non devi richiederlo né aspettare un'approvazione.</p>
<p>Per evitare equivoci: il badge <strong>indica che l'abbonamento Pro o Max è attivo</strong>. Non certifica un documento d'identità e non esprime un giudizio artistico.</p>

<h2>TOP Artist</h2>
<p>Esclusiva del piano <strong>${PLAN_LABELS.max}</strong>. Oltre all'etichetta sul profilo, dà accesso alla fascia in evidenza in cima alla pagina <a href="/artisti">/artisti</a>.</p>

<h2>L'ordine nel roster</h2>
<p>La pagina degli artisti non segue un ordine casuale né alfabetico: l'ordine dipende dal piano.</p>
<ol>
  <li><strong>${PLAN_LABELS.max}</strong> — in evidenza, in cima</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — in posizione prioritaria</li>
  <li><strong>${PLAN_LABELS.free}</strong> — posizione standard</li>
</ol>
<p>Lo diciamo apertamente: <strong>il piano influisce sulla visibilità</strong>, perché è così che la piattaforma si sostiene.</p>

<h2>Cosa conta comunque, su ogni piano</h2>
<p>L'ordine però non è tutto. Quando un organizzatore filtra per categoria e genere (per esempio "jazz") o cerca per testo un nome o una città, vede prima di tutto <strong>chi corrisponde a quella ricerca</strong>. Non c'è un filtro dedicato alla città: la si trova con la ricerca per testo. Ed è qui che il profilo fa la differenza:</p>
<ul>
  <li><strong>Generi e strumenti precisi</strong> ti fanno comparire nelle ricerche giuste.</li>
  <li><strong>La città</strong> scritta nel profilo conta: molti la cercano per testo, per contenere i costi di trasferta.</li>
  <li><strong>Una copertina forte</strong> decide se la scheda viene aperta o scorsa.</li>
  <li><strong>Un video</strong> è spesso ciò che convince a mandarti una richiesta.</li>
</ul>
<p>Un profilo ${PLAN_LABELS.free} completo e curato ottiene più di un profilo ${PLAN_LABELS.max} lasciato vuoto: la posizione porta il visitatore fino alla scheda, ma la richiesta arriva solo se la scheda convince.</p>

<h2>Come si toglie il badge</h2>
<p>Se l'abbonamento finisce, il badge sparisce e la posizione torna standard. Profilo, contenuti e recensioni restano.</p>
`,
    },

    {
      slug: "tier-pro-max",
      title: "Differenze tra i piani Free, Pro e Max",
      excerpt:
        "Cosa include ciascun piano, quanto costa, come si cambia e cosa succede ai contenuti se scendi di livello.",
      updatedAt: UPDATED,
      related: [
        "pagamenti/abbonamento-artista",
        "profili-multipli",
        "badge-e-visibilita",
      ],
      content: `
<h2>Il listino</h2>
<ul>
  <li><strong>${PLAN_LABELS.free}</strong> — gratuito, non scade.</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — ${formatPrice(PLAN_PRICES_CENTS.pro.month)} al mese oppure ${formatPrice(PLAN_PRICES_CENTS.pro.year)} all'anno.</li>
  <li><strong>${PLAN_LABELS.max}</strong> — ${formatPrice(PLAN_PRICES_CENTS.max.month)} al mese oppure ${formatPrice(PLAN_PRICES_CENTS.max.year)} all'anno.</li>
</ul>
<p>Il confronto completo e sempre aggiornato è su <a href="/prezzi">/prezzi</a>.</p>

<h2>Cosa include ogni piano</h2>
<table>
  <thead>
    <tr><th></th><th>${PLAN_LABELS.free}</th><th>${PLAN_LABELS.pro}</th><th>${PLAN_LABELS.max}</th></tr>
  </thead>
  <tbody>
${PLAN_TABLE_ROWS}
  </tbody>
</table>
<p>Qui trovi le differenze principali; l'elenco completo è su <a href="/prezzi">/prezzi</a>.</p>

<h2>Le richieste non sono mai limitate</h2>
<p>Non lo sono su nessun piano, nemmeno su quello gratuito: bloccare una richiesta vorrebbe dire penalizzare l'organizzatore che ti sta cercando, senza vantaggi per nessuno. <strong>Il limite riguarda la chat</strong>: con ${PLAN_LABELS.free} ricevi la richiesta e l'email, mentre per scrivere in chat serve ${PLAN_LABELS.pro} o ${PLAN_LABELS.max}.</p>

<h2>Cosa giustifica il salto a ${PLAN_LABELS.max}</h2>
<p>Soprattutto le <strong>statistiche</strong>, l'etichetta <strong>TOP Artist</strong> con la fascia in evidenza e i <strong>${ENTITLEMENTS.max.artistProfilesMax} profili</strong>. In più hai le consulenze senza limite mensile (in base agli slot disponibili), la segnalazione del tuo profilo ad almeno due strutture al mese, curata dal team (è un impegno di mezzi: N'arte non tratta per te e non garantisce ingaggi), e, con l'abbonamento annuale, uno <strong>shooting fotografico</strong> incluso una tantum.</p>

<h2>Domande frequenti</h2>
<h3>C'è un periodo di prova?</h3>
<p><strong>No.</strong> Non c'è una prova a tempo, ma puoi usare il piano ${PLAN_LABELS.free}, che è gratuito e non scade, per tutto il tempo che vuoi.</p>

<h3>L'abbonamento vale per un artista o per l'account?</h3>
<p>Per l'<strong>account</strong>: tutti i profili che crei ereditano i vantaggi del piano e non paghi due volte.</p>

<h3>Posso cambiare piano quando voglio?</h3>
<p>Sì, in qualunque momento da <strong>/dashboard/abbonamento</strong>. Vedi <a href="/help/pagamenti/abbonamento-artista">l'abbonamento artista</a>.</p>

<h3>Se disdico perdo tutto?</h3>
<p>No. Il profilo resta online e le richieste continuano ad arrivare. Perdi le funzioni del piano (chat, recensioni visibili, badge e posizione prioritaria), mentre i contenuti oltre il limite <strong>non vengono cancellati</strong>: smettono solo di essere pubblici.</p>
`,
    },

    {
      slug: "video-promo",
      title: "Come registrare un video live efficace",
      excerpt:
        "Il video è ciò che trasforma una visita in una richiesta. Linee guida pratiche su audio, inquadratura, durata e cosa evitare.",
      updatedAt: UPDATED,
      related: ["foto-video-audio", "ottimizza-profilo", "badge-e-visibilita"],
      content: `
<h2>Perché è il contenuto più importante</h2>
<p>Un organizzatore che deve affidarti una serata vuole sapere soprattutto una cosa: <em>com'è quando suoni dal vivo</em>. La biografia e le foto non bastano a dirlo, il video sì.</p>

<h2>L'audio conta più del video</h2>
<p>È l'errore più comune: si cura l'immagine e si trascura il suono. Eppure un video girato col telefono ma con un buon audio funziona, mentre uno ripreso bene con l'audio saturo viene chiuso dopo dieci secondi.</p>
<ul>
  <li>Non mettere il telefono <strong>davanti alle casse</strong>: il microfono va in saturazione e resta solo un rumore indistinto.</li>
  <li>Meglio da <strong>metà sala</strong>, un po' di lato rispetto all'impianto.</li>
  <li>Se puoi, chiedi al fonico una <strong>registrazione dal banco</strong> e sincronizzala con le immagini: non costa nulla ed è il miglioramento più grande che puoi ottenere.</li>
</ul>

<h2>Inquadratura</h2>
<ul>
  <li><strong>Orizzontale</strong>, non verticale.</li>
  <li>Telefono <strong>appoggiato o su treppiede</strong>: le riprese a mano libera stancano dopo pochi secondi.</li>
  <li>Inquadra <strong>tutta la formazione</strong>: se siete una band, il primo piano del solo cantante non racconta il gruppo.</li>
  <li>Un po' di <strong>pubblico nell'inquadratura</strong> aiuta, perché mostra che la serata funzionava.</li>
</ul>

<h2>Durata e scelta del brano</h2>
<ul>
  <li>Tra <strong>uno e tre minuti</strong>: chi guarda decide nei primi quindici secondi.</li>
  <li>Parti da un <strong>momento forte</strong>, senza accordature, presentazioni o tempi morti.</li>
  <li>Scegli il pezzo che <strong>rappresenta la tua serata tipo</strong>, anche se non è il più difficile tecnicamente.</li>
  <li>Se hai ${MAX_VIDEO_PER_ARTIST} video, differenziali: un brano energico, uno più intimo, uno in un contesto diverso.</li>
</ul>

<h2>Cosa evitare</h2>
<ul>
  <li>Video con <strong>loghi o watermark</strong> di app di editing.</li>
  <li><strong>Montaggi rapidissimi</strong> a tempo di musica: nascondono proprio come suoni, cioè quello che chi guarda vuole vedere.</li>
  <li>Riprese fatte <strong>solo in prova</strong>: senza pubblico l'energia non arriva.</li>
  <li>Registrazioni <strong>di anni fa</strong>, con una formazione diversa da quella di oggi.</li>
</ul>

<h2>Aspetti pratici</h2>
<p>Puoi caricare file fino a ${MB(MAX_VIDEO_BYTES_BUNNY)}, anche direttamente dal telefono. Dopo il caricamento il video resta in elaborazione per qualche minuto prima di comparire online, ed è normale. I dettagli sono in <a href="/help/artisti/foto-video-audio">foto, video e audio</a>.</p>

<h2>Attenzione ai diritti</h2>
<p>Quando carichi un video dichiari di avere il diritto di usarlo, sia per le riprese sia per l'eventuale montaggio e per la musica. Se l'ha girato un professionista, mettiti d'accordo con lui prima. Vedi <a href="/help/policy/contenuti-e-diritti">contenuti e diritti</a>.</p>
`,
    },

    {
      slug: "compensi-fatturazione",
      title: "Il tuo cachet: chi lo decide e come si dichiara",
      excerpt:
        "La fascia di prezzo sul profilo, chi stabilisce il compenso e perché N'arte non trattiene percentuali.",
      updatedAt: UPDATED,
      related: [
        "pagamenti/modalita-pagamento",
        "pagamenti/fattura-artista",
        "booking/contratto-modello",
      ],
      content: `
<h2>Il cachet lo decidi tu</h2>
<p>N'arte non stabilisce tariffe, non impone minimi e non suggerisce quanto chiedere. Il compenso lo concordi direttamente con l'organizzatore, serata per serata.</p>

<h2>N'arte non prende percentuali</h2>
<p><strong>Sul tuo cachet non tratteniamo nulla.</strong> Il denaro dell'ingaggio non passa dalla piattaforma, che quindi non lo incassa e non lo anticipa: quello che concordi è quello che ricevi.</p>
<p>L'unica somma che N'arte incassa è l'<a href="/help/pagamenti/abbonamento-artista">abbonamento</a>, facoltativo e indipendente dal numero di date che fai.</p>

<h2>La fascia di prezzo sul profilo</h2>
<p>Nel blocco "Informazioni di booking" puoi indicare una <strong>fascia</strong> invece di una cifra precisa. Le opzioni vanno da "0 — 100 €" a "1.000 € e oltre".</p>
<p>La vedono solo gli <strong>organizzatori</strong>, non gli altri visitatori.</p>

<h3>Conviene dichiararla?</h3>
<p>Quasi sempre sì. La fascia non ti vincola, perché il compenso resta da trattare, ma <strong>filtra le richieste</strong>: non perdi tempo con chi ha un budget molto lontano dal tuo e ti contatta chi può permetterti. Senza fascia arrivano più richieste, ma anche più richieste inutili.</p>
<p>Se le cifre cambiano molto a seconda della formazione, conviene usare <a href="/help/artisti/profili-multipli">più profili</a>: il duo acustico e la band completa non hanno lo stesso cachet.</p>

<h2>Cosa considerare oltre al compenso</h2>
<p>Perché sulla cifra non restino equivoci, prima di accettare verifica:</p>
<ul>
  <li>Se il compenso è <strong>per il gruppo o a persona</strong>.</li>
  <li>Chi paga <strong>viaggio e trasferta</strong>.</li>
  <li>Chi fornisce l'<strong>impianto</strong> e chi il service.</li>
  <li><strong>Quanto dura</strong> il set e quanti set sono previsti.</li>
  <li><strong>Quando</strong> viene pagato il compenso.</li>
</ul>
<p>La lista completa da concordare è in <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>Fatture e adempimenti fiscali</h2>
<p>Riguardano te e l'organizzatore: N'arte non è parte del contratto e non emette documenti per l'esibizione. Per la tua posizione fiscale <strong>rivolgiti al tuo commercialista</strong> (vedi <a href="/help/pagamenti/fattura-artista">chi emette la fattura</a>).</p>

<h2>Compenso concordato – promemoria</h2>
<p>Sulle date confermate puoi annotare il <strong>compenso pattuito</strong>, con la conferma di entrambe le parti. È un'annotazione fra voi: N'arte non è parte dell'accordo e non gestisce pagamenti, che avvengono fuori dalla piattaforma. Serve però a lasciare una traccia condivisa di quanto avevate concordato. Vedi <a href="/help/organizzatori/prezzo-definitivo">compenso concordato – promemoria</a>.</p>
`,
    },
  ],
};
