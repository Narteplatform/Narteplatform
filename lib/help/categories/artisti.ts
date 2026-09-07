import type { HelpCategory } from "@/lib/help/types";
import {
  ENTITLEMENTS,
  PLAN_LABELS,
  PLAN_PRICES_CENTS,
  formatPrice,
} from "@/lib/billing/plans";
import {
  MAX_VIDEO_BYTES_BUNNY,
  MAX_VIDEO_PER_ARTIST,
} from "@/lib/upload/video-limits";

const UPDATED = "2026-09-07";

/** Megabyte leggibili a partire dai byte della fonte unica. */
const MB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

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
        "Cosa preparare, come si compila il modulo, quanto si attende e cosa succede davvero dopo l'invio.",
      updatedAt: UPDATED,
      related: ["ottimizza-profilo", "tier-pro-max", "iniziare/come-creare-account"],
      content: `
<h2>Prima di iniziare</h2>
<p>La candidatura richiede pochi minuti. Conviene però avere già sottomano:</p>
<ul>
  <li><strong>Nome e cognome</strong> e un <strong>indirizzo email</strong> che controlli davvero: è lì che arriverà la risposta.</li>
  <li><strong>Nome d'arte</strong>, anche provvisorio: si cambia in seguito dalla dashboard.</li>
  <li><strong>Generi musicali</strong>, da 1 a un massimo di 3. Sono il filtro principale con cui ti cercano: meglio due etichette precise che cinque generiche.</li>
  <li><strong>Strumenti</strong> che porti sul palco (facoltativo, massimo 3).</li>
  <li><strong>Una biografia</strong> che racconti il progetto: da quanto suoni, che tipo di serate fai, cosa ti distingue.</li>
  <li><strong>Almeno un link attivo</strong> fra Instagram, Spotify e sito.</li>
  <li>Un <strong>video di riferimento</strong>, facoltativo ma molto utile: una performance vale più di tre paragrafi.</li>
</ul>

<h2>Cosa succede quando invii</h2>
<p>Qui c'è il punto che sorprende più spesso, quindi lo diciamo chiaramente: <strong>la candidatura non crea un account.</strong> Non riceverai credenziali e non potrai accedere subito.</p>
<ol>
  <li>La candidatura viene registrata ed entra in stato <strong>in attesa</strong>.</li>
  <li>Ricevi un'email di conferma di avvenuta ricezione.</li>
  <li>Il team la legge e decide.</li>
  <li><strong>Solo se viene approvata</strong> vengono creati il tuo account e il tuo profilo artista. Ricevi allora un'email con un link per impostare la password e accedere a <a href="/login">/login</a>.</li>
</ol>

<h2>Quanto si attende</h2>
<p>Indicativamente <strong>2-5 giorni lavorativi</strong>. La valutazione è fatta a mano da una persona, non da un automatismo: nei periodi di molte candidature può servire qualche giorno in più.</p>

<h2>Se la candidatura non viene accolta</h2>
<p>Può succedere se mancano informazioni essenziali, se i link non funzionano o se il progetto non rientra negli standard editoriali del roster.</p>
<p><strong>Al momento il rifiuto non genera un'email automatica</strong>: se sono passate più di due settimane e non hai ricevuto nulla, <a href="/contatti">scrivici</a> indicando il nome d'arte con cui ti sei candidato e ti diciamo a che punto siamo. Puoi ricandidarti dopo aver sistemato i punti deboli.</p>

<h2>Serve un account a testa se siamo una band?</h2>
<p>No. Una band si candida come <strong>un solo progetto</strong>, con un nome d'arte e un referente. I nomi dei componenti si aggiungono poi nel profilo, nel campo formazione.</p>

<h2>Quanto costa</h2>
<p>La candidatura è gratuita e il profilo ${PLAN_LABELS.free} non scade. I piani a pagamento sono facoltativi e servono a sbloccare chat, recensioni e visibilità: vedi <a href="/help/artisti/tier-pro-max">le differenze tra i piani</a>.</p>
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
<p>Tutto si gestisce da <strong>/dashboard/profilo-artista</strong>. L'editor è diviso in blocchi che si aprono e si salvano singolarmente: puoi compilare una sezione oggi e un'altra domani. Ogni salvataggio aggiorna subito la tua pagina pubblica.</p>
<p>In fondo alla barra laterale trovi l'indicatore <strong>"Profilo completo"</strong> su sette voci, che ti dice cosa manca ancora.</p>

<h2>Le sette voci che contano</h2>
<p>Sono quelle che l'indicatore misura, e non a caso: sono ciò che un organizzatore guarda prima di scrivere.</p>
<ol>
  <li><strong>Foto di copertina</strong> — verticale, formato 3:4. È la prima immagine che compare in elenco. Evita screenshot dai social, foto sgranate o con loghi sopra.</li>
  <li><strong>Biografia</strong> — serve almeno qualche riga vera. Racconta chi sei, che tipo di live porti, quanto dura di solito il tuo set.</li>
  <li><strong>Galleria</strong> — almeno 3 foto, possibilmente diverse tra loro: un primo piano, una del palco, una del pubblico.</li>
  <li><strong>Almeno un video</strong> — vale più di tutto il resto messo insieme. Vedi <a href="/help/artisti/video-promo">come registrare un video efficace</a>.</li>
  <li><strong>Almeno un genere</strong> — da 1 a 3, è il filtro con cui ti trovano.</li>
  <li><strong>Fascia di prezzo</strong> — dichiararla non ti penalizza, ti fa arrivare richieste sensate.</li>
  <li><strong>Lingue</strong> — italiano, dialetto, inglese, francese, spagnolo.</li>
</ol>

<h2>Il blocco "Informazioni di booking"</h2>
<p>È la sezione che gli organizzatori leggono davvero prima di decidere. Tutti i campi sono facoltativi, ma ognuno toglie una domanda dalla trattativa:</p>
<ul>
  <li><strong>Durata minima e massima del set</strong>, da 30 a 180 minuti.</li>
  <li><strong>Cosa aspettarsi dal live</strong> — stile, atmosfera, i momenti migliori del set.</li>
  <li><strong>Storia del progetto</strong> in versione estesa.</li>
  <li><strong>Formazione</strong> — nome e ruolo di chi sale sul palco.</li>
  <li><strong>Scaletta di esempio</strong>.</li>
  <li><strong>Influenze musicali</strong>, separate da virgola.</li>
  <li><strong>Requisiti tecnici</strong> — impianto, palco, alimentazione. Compilarlo evita la sorpresa la sera stessa.</li>
</ul>

<h2>Strumenti e percorso artistico</h2>
<p>Gli <strong>strumenti</strong> che indichi determinano la tipologia con cui compari nei filtri: cantante, chitarrista, batterista, dj. Indica quelli che porti davvero sul palco.</p>
<p>Il <strong>percorso artistico</strong> — cover artist, tribute band o progetto inedito — è incluso nei piani ${PLAN_LABELS.pro} e ${PLAN_LABELS.max}. Aiuta gli organizzatori a capire subito che tipo di serata proponi.</p>

<h2>Social</h2>
<p>Puoi collegare Instagram, Facebook, TikTok, YouTube, Spotify e il tuo sito. Compaiono sulla pagina pubblica: sono la prova più immediata che il progetto è vivo.</p>

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
<p>Le trovi in <strong>/dashboard/leads</strong>, divise in tre schede: <strong>Nuove</strong>, <strong>In trattativa</strong>, <strong>Confermate</strong>. Per ogni nuova richiesta ricevi anche un'email con il riepilogo.</p>
<p>Le richieste di booking arrivano <strong>su ogni piano, senza limiti</strong>: non blocchiamo mai un organizzatore che ti sta cercando.</p>

<h2>Le tue due possibilità su una richiesta nuova</h2>

<h3>Accettare la trattativa</h3>
<p>Il primo click su <strong>"Accetta proposta"</strong> apre un campo facoltativo per una <strong>nota o controproposta</strong>: è il posto giusto per scrivere "disponibile ma alle 22, non alle 21" o "il cachet per quella distanza sarebbe più alto". Il secondo click conferma.</p>
<p>Accettare significa <strong>"parliamone"</strong>, non "è fatta": la richiesta passa in trattativa, si apre la chat con l'organizzatore e la data non è ancora bloccata.</p>

<h3>Rifiutare</h3>
<p>Un click su <strong>"Rifiuta"</strong> e la richiesta si chiude. L'organizzatore riceve un'email che lo avvisa. Non serve motivazione, ma un rifiuto rapido è un favore reale: gli permette di cercare altrove mentre è ancora in tempo.</p>

<h2>La conferma finale non è tua</h2>
<p>È il punto che genera più attese sbagliate. Dopo l'accordo in chat, <strong>è l'organizzatore a premere "Conferma data"</strong>. Finché non lo fa, la richiesta resta in trattativa anche se vi siete detti tutto.</p>
<p>Se avete concluso e la conferma non arriva, sollecitalo in chat. Nel frattempo, sul tuo lato la scheda mostra <em>"In attesa della conferma definitiva dell'organizzatore"</em>.</p>

<h2>La scorciatoia: accettare un'offerta</h2>
<p>Se l'organizzatore ti manda un'<strong>offerta</strong> in chat — data, fascia oraria e budget insieme — e tu la accetti, la data è <strong>confermata immediatamente</strong>, senza passaggi ulteriori. È la via più rapida e la più chiara. Vedi <a href="/help/artisti/chat-e-offerte">chat e offerte</a>.</p>

<h2>Non ci sono scadenze automatiche</h2>
<p>Una richiesta non scade da sola: resta lì finché tu rispondi o l'organizzatore la annulla. Questo però non vuol dire che convenga aspettare: gli organizzatori scrivono a più artisti in parallelo e chi risponde entro <strong>24-48 ore</strong> è quasi sempre chi chiude la data.</p>

<h2>Tieni il calendario aggiornato</h2>
<p>Il calendario in <strong>/dashboard/calendario</strong> è pubblico. Segnare le date occupate evita richieste impossibili e fa risparmiare tempo a entrambi. Le date confermate tramite N'arte si bloccano da sole.</p>

<h2>Se hai il piano ${PLAN_LABELS.free}</h2>
<p>Ricevi tutte le richieste e tutte le email, e puoi accettarle o rifiutarle. <strong>Per rispondere in chat</strong> serve invece ${PLAN_LABELS.pro}: è lì che scatta il limite, non sulle richieste.</p>
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
<p>Si caricano dal blocco <strong>Galleria foto</strong> del profilo, da computer o da telefono. Vengono compresse automaticamente nel browser prima dell'invio, quindi non serve ridimensionarle a mano: carica pure il file originale.</p>
<p>Le foto diventano pubbliche <strong>solo dopo aver salvato il blocco</strong>.</p>

<h2>Video</h2>
<p>Si caricano dal blocco <strong>Galleria video</strong>. Massimo <strong>${MAX_VIDEO_PER_ARTIST} video</strong> per profilo sui piani a pagamento, ${ENTITLEMENTS.free.videoMax} con ${PLAN_LABELS.free}.</p>
<ul>
  <li><strong>Peso massimo</strong>: fino a ${MB(MAX_VIDEO_BYTES_BUNNY)} per file.</li>
  <li><strong>Formati</strong>: MP4 e WebM sempre; a seconda della configurazione anche MOV (i video girati con iPhone), MKV, M4V, MPEG e AVI.</li>
  <li>Dopo il caricamento puoi <strong>rinominare il titolo</strong>, ma non sostituire il file: per cambiarlo, elimina il video e ricaricalo.</li>
</ul>

<h3>Perché il video resta "in elaborazione"</h3>
<p>Un video caricato non è subito pronto: viene convertito nei formati che permettono la riproduzione fluida su ogni dispositivo e connessione. È normale che ci voglia qualche minuto, e più il file è lungo e pesante più il tempo cresce. Nel frattempo il resto del profilo funziona: puoi chiudere la pagina e tornare dopo.</p>
<p>Se dopo diverse ore un video è ancora in elaborazione, <a href="/contatti">segnalacelo</a>.</p>

<h3>Ho un link YouTube, posso incollarlo?</h3>
<p>Non più: oggi i video si caricano come file. I link inseriti in passato <strong>restano visibili</strong> sul profilo pubblico e continuano a funzionare, ma per i nuovi video serve il caricamento diretto. Il risultato è migliore: nessuna pubblicità prima della tua performance e nessun rimando a video di altri alla fine.</p>

<h2>Tracce audio</h2>
<p>Incluse nei piani ${PLAN_LABELS.pro} e ${PLAN_LABELS.max}: <strong>${ENTITLEMENTS.pro.audioMax} traccia</strong> per profilo. Formati MP3, WAV e M4A, fino a <strong>25 MB</strong>.</p>
<p>Con una traccia sola, scegli con criterio: meglio l'estratto live che rappresenta davvero cosa succede quando suoni, che il brano prodotto meglio in studio.</p>

<h2>Se cambio piano perdo i contenuti?</h2>
<p><strong>No, mai.</strong> Passando a un piano inferiore i contenuti in eccesso smettono di comparire sul profilo pubblico ma restano nel tuo editor, contrassegnati. Tornano visibili nel momento in cui risali di piano. Non cancelliamo nulla.</p>
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
<p>Molti musicisti hanno più progetti: il duo acustico, la tribute band, il set da dj. Sono proposte diverse, con generi e cachet diversi, e schiacciarle in un profilo solo confonde chi cerca. I profili multipli permettono di tenerli separati restando con <strong>un solo account e un solo accesso</strong>.</p>

<h2>Quanti se ne possono avere</h2>
<ul>
  <li><strong>${PLAN_LABELS.free}</strong> — ${ENTITLEMENTS.free.artistProfilesMax} profilo</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — fino a ${ENTITLEMENTS.pro.artistProfilesMax} profili</li>
  <li><strong>${PLAN_LABELS.max}</strong> — fino a ${ENTITLEMENTS.max.artistProfilesMax} profili</li>
</ul>
<p><strong>L'abbonamento è dell'account, non del singolo profilo.</strong> Paghi una volta e ogni profilo che crei eredita i vantaggi del piano: non esiste un abbonamento per progetto.</p>

<h2>Come si crea un profilo nuovo</h2>
<p>Da <strong>/dashboard/profili</strong>, con nome d'arte e città. Il profilo nasce subito e ha già i vantaggi del tuo piano, ma resta <strong>in revisione</strong> finché il team non lo approva: solo allora è visibile agli organizzatori. È lo stesso controllo di qualità della prima candidatura.</p>
<p>Gli stati possibili sono <strong>Pubblicato</strong>, <strong>In revisione</strong> e <strong>Non approvato</strong>.</p>

<h2>Passare da un profilo all'altro</h2>
<p>C'è un selettore in alto nella dashboard. Il profilo attivo determina <strong>tutto</strong> quello che vedi: calendario, richieste, chat, recensioni e statistiche sono separati per profilo. Se non trovi una richiesta che aspettavi, controlla di essere sul profilo giusto.</p>

<h2>Cosa succede se scendo di piano</h2>
<p>I profili che eccedono il nuovo limite vengono <strong>sospesi, non cancellati</strong>. Spariscono dal sito ma restano interi nella tua area, e tornano online da soli appena risali di piano.</p>
<p>Vengono sospesi i profili creati più di recente: <strong>il profilo principale non viene mai toccato</strong>.</p>
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
<p>La conversazione nasce quando accetti una richiesta di booking, oppure puoi aprirla manualmente dal pulsante <strong>"Apri chat con l'organizzatore"</strong>.</p>
<p>La chat è <strong>una per ogni organizzatore</strong>, non una per richiesta: se lo stesso locale ti scrive per tre date diverse, la conversazione resta una sola e ci ritrovi tutto lo storico. È più comodo di quanto sembri.</p>

<h2>Cosa puoi mandare</h2>
<ul>
  <li><strong>Messaggi</strong> fino a 2.000 caratteri.</li>
  <li><strong>Foto</strong> e <strong>documenti</strong> (PDF, Word, Excel, testo, ZIP), fino a <strong>25 MB</strong> per file.</li>
  <li><strong>Messaggi vocali</strong>, registrati direttamente dalla chat.</li>
  <li><strong>Offerte strutturate</strong>, che sono la parte interessante.</li>
</ul>

<h2>Le offerte</h2>
<p>Un'offerta non è un messaggio: è una proposta formale con tre valori — <strong>data</strong>, <strong>fascia oraria</strong> e <strong>budget</strong> — più una descrizione facoltativa. Chi la riceve la accetta o la rifiuta con un pulsante.</p>
<p>Gli stati sono quattro: <strong>In sospeso</strong>, <strong>Accettata</strong>, <strong>Rifiutata</strong> e <strong>Sostituita</strong>. Quest'ultimo è utile da conoscere: quando qualcuno manda una nuova offerta, quella ancora in sospeso viene automaticamente sostituita. Non restano mai due proposte valide contemporaneamente, e non si rischia di accettare la versione vecchia.</p>

<h3>Accettare un'offerta conferma la data</h3>
<p>È il passaggio più importante. Nel momento in cui accetti un'offerta, <strong>la data è confermata</strong>: viene bloccata sul tuo calendario, l'organizzatore la vede nel suo, e partono le email a entrambi. Non c'è un ulteriore passaggio.</p>
<p>Quindi accetta solo quando sei davvero d'accordo su tutto. Se un dettaglio non ti torna, rifiuta e manda tu una controproposta: sarà a sua volta un'offerta che l'altro può accettare.</p>

<h2>Perché non riesco a scrivere?</h2>
<p>La chat è inclusa nei piani <strong>${PLAN_LABELS.pro}</strong> e <strong>${PLAN_LABELS.max}</strong>. Con ${PLAN_LABELS.free} ricevi le richieste, le email e vedi la conversazione, ma per rispondere serve un piano a pagamento.</p>
<p>È una scelta deliberata: le <strong>richieste di booking non sono mai limitate</strong>, su nessun piano, perché bloccarle punirebbe l'organizzatore che ti sta cercando. Il limite scatta un passo dopo, sulla trattativa.</p>
<p>L'organizzatore non ha mai limitazioni: può sempre scrivere e fare offerte.</p>

<h2>Notifiche</h2>
<p>Ricevi un'email quando arriva un messaggio che non hai ancora letto — non più di una ogni mezz'ora, per non intasarti la casella — e <strong>sempre</strong> quando arriva un'offerta. Per motivi di riservatezza il testo del messaggio non viene mai riportato nell'email: per leggerlo devi entrare in piattaforma.</p>

<h2>Restano tracciati?</h2>
<p>Sì, e conviene a entrambi. Se nasce un disaccordo su cosa era stato pattuito, la conversazione è lì. È anche il motivo per cui è meglio concordare i dettagli in chat piuttosto che a voce o su WhatsApp.</p>
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
<p>Solo un <strong>organizzatore con cui hai fatto una data confermata su N'arte</strong>, e solo <strong>dopo che la data è passata</strong>. Una recensione per evento, non ripetibile.</p>
<p>Non esiste il verso opposto: gli artisti non recensiscono gli organizzatori.</p>
<p>Questo esclude alla radice le recensioni di chi non ti ha mai visto suonare: se non c'è una data confermata in piattaforma, non c'è recensione possibile.</p>

<h2>Cosa contiene</h2>
<p>Un voto da <strong>1 a 5 stelle</strong> e un commento scritto obbligatorio. Sul tuo profilo pubblico compaiono la media, il numero di recensioni e i singoli commenti con il nome dell'organizzatore.</p>

<h2>Servono un piano ${PLAN_LABELS.pro} o ${PLAN_LABELS.max}</h2>
<p>Le recensioni <strong>si raccolgono sempre</strong>, anche con ${PLAN_LABELS.free}: nulla va perso. Ma per <strong>leggerle e mostrarle</strong> sul profilo pubblico serve un piano a pagamento.</p>
<p>Se hai ${PLAN_LABELS.free} e qualcuno ti ha recensito, in dashboard vedi quante recensioni sono in attesa senza il contenuto. Passando a ${PLAN_LABELS.pro} compaiono tutte insieme, comprese quelle ricevute prima.</p>

<h2>Dove le trovi</h2>
<p>In <strong>/dashboard/feedback</strong>, con il totale, la media dei voti e l'ultima ricevuta.</p>

<h2>Una recensione ingiusta</h2>
<p>Non puoi cancellarla da solo, e non è un difetto: recensioni modificabili dal recensito non varrebbero nulla, per te per primo.</p>
<p>Se una recensione è offensiva, falsa o riguarda fatti estranei alla serata, <a href="/contatti">scrivi al team</a> spiegando cosa contesti. Il team può <strong>nasconderla</strong>: una recensione nascosta non compare più e <strong>non pesa sulla media</strong>. Vedi <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>

<h2>Come farne arrivare di buone</h2>
<p>Le recensioni non partono da sole: è l'organizzatore che decide di scriverle. Un messaggio di ringraziamento in chat il giorno dopo la serata, con un invito a lasciare una valutazione, funziona meglio di qualunque automatismo.</p>
`,
    },

    {
      slug: "statistiche-profilo",
      title: "Le statistiche del profilo",
      excerpt:
        "Cosa misuriamo, come leggere i numeri e perché le visite degli organizzatori contano più di tutte le altre.",
      updatedAt: UPDATED,
      related: ["tier-pro-max", "badge-e-visibilita", "ottimizza-profilo"],
      content: `
<h2>Sono incluse nel piano ${PLAN_LABELS.max}</h2>
<p>Le statistiche sono un'esclusiva del piano ${PLAN_LABELS.max} e coprono gli <strong>ultimi ${ENTITLEMENTS.max.statsWindowDays} giorni</strong>. Con gli altri piani la pagina resta visibile ma mostra cosa conterrebbe, non i dati.</p>

<h2>Cosa trovi in /dashboard/statistiche</h2>
<ul>
  <li><strong>Visite al profilo</strong> — quanti visitatori distinti hanno aperto la tua pagina.</li>
  <li><strong>Da organizzatori</strong> — quante di quelle visite arrivano da locali e organizzatori registrati.</li>
  <li><strong>Richieste ricevute</strong>, divise per canale di arrivo.</li>
  <li><strong>Salvataggi</strong> — quante volte sei stato messo tra i preferiti da utenti registrati.</li>
  <li><strong>Andamento delle visite</strong> giorno per giorno.</li>
</ul>

<h2>Il numero che conta davvero</h2>
<p>Non è il totale delle visite: è la quota che arriva da <strong>organizzatori registrati</strong>. Cento visite di curiosi non portano una serata; cinque visite di locali che stanno programmando la stagione, sì. Nel grafico sono evidenziate a parte proprio per questo.</p>

<h2>Come leggere i numeri senza illudersi</h2>
<ul>
  <li>Si contano <strong>visitatori distinti al giorno</strong>, non le aperture di pagina: se la stessa persona torna tre volte in un pomeriggio, conta una volta.</li>
  <li>Le <strong>tue visite al tuo profilo non vengono contate</strong>.</li>
  <li>I <strong>salvataggi</strong> contano solo gli utenti registrati.</li>
  <li>I dati si aggiornano in tempo reale.</li>
</ul>

<h2>Privacy</h2>
<p>Non raccogliamo indirizzi IP e non usiamo cookie di tracciamento per queste statistiche. L'indirizzo di chi visita viene trasformato in un codice non riconducibile alla persona, che serve solo a non contare due volte la stessa visita nello stesso giorno. Non sappiamo <em>chi</em> ha visto il tuo profilo, solo <em>quanti</em>.</p>

<h2>Cosa farci</h2>
<p>Guarda cosa succede <strong>dopo</strong> una modifica: se aggiungi un video e nelle due settimane successive le visite da organizzatori salgono, hai la risposta. È il modo più affidabile di capire cosa funziona sul tuo profilo.</p>
`,
    },

    {
      slug: "badge-e-visibilita",
      title: "Badge e posizione nei risultati",
      excerpt:
        "Cosa significano Verificato N'arte e TOP Artist, come si ottengono e cosa determina l'ordine in cui compari nel roster.",
      updatedAt: UPDATED,
      related: ["tier-pro-max", "ottimizza-profilo", "statistiche-profilo"],
      content: `
<h2>Verificato N'arte</h2>
<p>È il badge incluso nei piani <strong>${PLAN_LABELS.pro}</strong> e <strong>${PLAN_LABELS.max}</strong>. Compare sul profilo pubblico <strong>in automatico</strong>: non va richiesto, non c'è una pratica da avviare e non c'è un'approvazione da attendere.</p>
<p>Diciamo con chiarezza cosa attesta, per non lasciare intendere altro: <strong>attesta che dietro il profilo c'è un abbonamento attivo</strong>, quindi qualcuno che sta investendo sul proprio progetto. Non è la verifica di un documento d'identità né un giudizio artistico.</p>

<h2>TOP Artist</h2>
<p>Esclusiva del piano <strong>${PLAN_LABELS.max}</strong>. Oltre all'etichetta sul profilo, dà accesso alla fascia in evidenza in cima alla pagina <a href="/artisti">/artisti</a>.</p>

<h2>L'ordine nel roster</h2>
<p>La pagina degli artisti non è in ordine casuale né alfabetico. L'ordine dipende dal piano:</p>
<ol>
  <li><strong>${PLAN_LABELS.max}</strong> — in evidenza, in cima</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — in posizione prioritaria</li>
  <li><strong>${PLAN_LABELS.free}</strong> — posizione standard</li>
</ol>
<p>Preferiamo dirlo apertamente: <strong>il piano influisce sulla visibilità</strong>. Non è un algoritmo misterioso, è il modo in cui la piattaforma si sostiene.</p>

<h2>Cosa conta comunque, su ogni piano</h2>
<p>L'ordine non è tutto. Un organizzatore che filtra per "sassofonista" e "jazz" a Napoli vede prima di tutto <strong>chi corrisponde a quei filtri</strong>. Ed è lì che il profilo fa la differenza:</p>
<ul>
  <li><strong>Generi e strumenti precisi</strong> ti fanno comparire nelle ricerche giuste.</li>
  <li><strong>La città</strong> pesa: molti cercano vicino per contenere i costi di trasferta.</li>
  <li><strong>Una copertina forte</strong> decide se la scheda viene aperta o scorsa.</li>
  <li><strong>Un video</strong> decide se dalla scheda nasce una richiesta.</li>
</ul>
<p>Un profilo ${PLAN_LABELS.free} completo e curato batte un profilo ${PLAN_LABELS.max} vuoto. La posizione porta il visitatore sulla scheda; è la scheda che porta la richiesta.</p>

<h2>Come si toglie il badge</h2>
<p>Se l'abbonamento finisce, il badge sparisce e la posizione torna standard. Il profilo, i contenuti e le recensioni restano.</p>
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
<p>Il confronto completo, sempre aggiornato, è su <a href="/prezzi">/prezzi</a>.</p>

<h2>Cosa cambia davvero</h2>
<table>
  <thead>
    <tr><th></th><th>${PLAN_LABELS.free}</th><th>${PLAN_LABELS.pro}</th><th>${PLAN_LABELS.max}</th></tr>
  </thead>
  <tbody>
    <tr><td>Profilo pubblico e calendario</td><td>sì</td><td>sì</td><td>sì</td></tr>
    <tr><td>Richieste di booking</td><td>illimitate</td><td>illimitate</td><td>illimitate</td></tr>
    <tr><td>Foto in galleria</td><td>${ENTITLEMENTS.free.galleryMax}</td><td>${ENTITLEMENTS.pro.galleryMax}</td><td>${ENTITLEMENTS.max.galleryMax}</td></tr>
    <tr><td>Video</td><td>${ENTITLEMENTS.free.videoMax}</td><td>${ENTITLEMENTS.pro.videoMax}</td><td>${ENTITLEMENTS.max.videoMax}</td></tr>
    <tr><td>Tracce audio</td><td>—</td><td>${ENTITLEMENTS.pro.audioMax}</td><td>${ENTITLEMENTS.max.audioMax}</td></tr>
    <tr><td>Chat con gli organizzatori</td><td>—</td><td>sì</td><td>sì</td></tr>
    <tr><td>Recensioni visibili</td><td>—</td><td>sì</td><td>sì</td></tr>
    <tr><td>Verificato N'arte</td><td>—</td><td>sì</td><td>sì</td></tr>
    <tr><td>TOP Artist in evidenza</td><td>—</td><td>—</td><td>sì</td></tr>
    <tr><td>Profili artista</td><td>${ENTITLEMENTS.free.artistProfilesMax}</td><td>${ENTITLEMENTS.pro.artistProfilesMax}</td><td>${ENTITLEMENTS.max.artistProfilesMax}</td></tr>
    <tr><td>Statistiche</td><td>—</td><td>—</td><td>ultimo anno</td></tr>
    <tr><td>Consulenza professionale</td><td>—</td><td>1 al mese</td><td>illimitata</td></tr>
  </tbody>
</table>

<h2>Le richieste non sono mai limitate</h2>
<p>Su nessun piano, nemmeno quello gratuito. Bloccare una richiesta significherebbe punire l'organizzatore che ti sta cercando, e non ha senso per nessuno. <strong>Il limite scatta sulla chat</strong>: con ${PLAN_LABELS.free} ricevi la richiesta e l'email, per negoziare serve ${PLAN_LABELS.pro}.</p>

<h2>Cosa giustifica il salto a ${PLAN_LABELS.max}</h2>
<p>Tre cose: le <strong>statistiche</strong>, l'etichetta <strong>TOP Artist</strong> con la fascia in evidenza, e i <strong>${ENTITLEMENTS.max.artistProfilesMax} profili</strong>. Si aggiungono la consulenza illimitata, la candidatura a due eventi N'arte al mese curata dal team e — sull'abbonamento annuale — uno <strong>shooting fotografico</strong> incluso una tantum.</p>

<h2>Domande frequenti</h2>
<h3>C'è un periodo di prova?</h3>
<p><strong>No.</strong> Non esiste una prova gratuita a tempo. Esiste però il piano ${PLAN_LABELS.free}, che è gratuito e non scade: puoi restarci quanto vuoi.</p>

<h3>L'abbonamento vale per un artista o per l'account?</h3>
<p>Per l'<strong>account</strong>. Tutti i profili che crei ereditano i vantaggi del piano, senza pagare due volte.</p>

<h3>Posso cambiare piano quando voglio?</h3>
<p>Sì, in qualunque momento da <strong>/dashboard/abbonamento</strong>. Vedi <a href="/help/pagamenti/abbonamento-artista">l'abbonamento artista</a>.</p>

<h3>Se disdico perdo tutto?</h3>
<p>No. Il profilo resta online e le richieste continuano ad arrivare. Perdi le funzioni del piano: chat, recensioni visibili, badge e posizione prioritaria. I contenuti oltre il limite <strong>non vengono cancellati</strong>, smettono solo di essere pubblici.</p>
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
<p>Un organizzatore che deve affidarti una serata vuole sapere una cosa sola: <em>com'è quando suoni davvero</em>. La biografia non lo dice, le foto nemmeno. Il video sì.</p>

<h2>L'audio conta più del video</h2>
<p>È l'errore più comune: si cura l'immagine e si trascura il suono. Ma un video girato col telefono con un buon audio funziona; un video ripreso bene con l'audio saturo viene chiuso dopo dieci secondi.</p>
<ul>
  <li>Non piazzare il telefono <strong>davanti alle casse</strong>: il microfono satura e resta un rumore indistinto.</li>
  <li>Meglio da <strong>metà sala</strong>, leggermente di lato rispetto all'impianto.</li>
  <li>Se puoi, chiedi al fonico una <strong>registrazione dal banco</strong> e sincronizzala con le immagini. È il salto di qualità più grande a costo zero.</li>
</ul>

<h2>Inquadratura</h2>
<ul>
  <li><strong>Orizzontale</strong>, non verticale.</li>
  <li>Telefono <strong>appoggiato o su treppiede</strong>: le riprese a mano libera stancano in pochi secondi.</li>
  <li>Inquadra <strong>tutta la formazione</strong>. Se siete una band, un primo piano del solo cantante non racconta il gruppo.</li>
  <li>Un po' di <strong>pubblico nell'inquadratura</strong> aiuta: dimostra che la serata funzionava.</li>
</ul>

<h2>Durata e scelta del brano</h2>
<ul>
  <li>Tra <strong>uno e tre minuti</strong>. Chi guarda decide nei primi quindici secondi.</li>
  <li>Parti da un <strong>momento forte</strong>: niente accordatura, niente presentazioni, niente attesa.</li>
  <li>Scegli il pezzo che <strong>rappresenta la serata tipo</strong>, non quello tecnicamente più difficile.</li>
  <li>Se hai ${MAX_VIDEO_PER_ARTIST} video, differenziali: un brano energico, uno più intimo, uno che mostri un contesto diverso.</li>
</ul>

<h2>Cosa evitare</h2>
<ul>
  <li>Video con <strong>loghi o watermark</strong> di app di editing.</li>
  <li><strong>Montaggi rapidissimi</strong> a ritmo di musica: nascondono come suoni, ed è esattamente ciò che si vuole vedere.</li>
  <li>Riprese <strong>solo in prova</strong>: senza pubblico l'energia non si legge.</li>
  <li>Registrazioni <strong>di anni fa</strong> con una formazione diversa da quella attuale.</li>
</ul>

<h2>Aspetti pratici</h2>
<p>Puoi caricare file fino a ${MB(MAX_VIDEO_BYTES_BUNNY)}, anche direttamente dal telefono. Dopo il caricamento il video viene elaborato per qualche minuto prima di comparire online: è normale. Dettagli in <a href="/help/artisti/foto-video-audio">foto, video e audio</a>.</p>

<h2>Attenzione ai diritti</h2>
<p>Caricando un video dichiari di avere il diritto di usarlo: vale per le riprese, per l'eventuale montaggio e per la musica. Se il video è stato girato da un professionista, accordati con lui prima. Vedi <a href="/help/policy/contenuti-e-diritti">contenuti e diritti</a>.</p>
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
<p>N'arte non stabilisce tariffe, non impone minimi e non suggerisce quanto dovresti chiedere. Il compenso lo concordi direttamente con l'organizzatore, serata per serata.</p>

<h2>N'arte non prende percentuali</h2>
<p><strong>Sul tuo cachet non tratteniamo nulla.</strong> Il denaro dell'ingaggio non passa dalla piattaforma: non lo incassiamo, non lo anticipiamo, non lo tratteniamo. Quello che concordi è quello che ricevi.</p>
<p>L'unica somma che N'arte incassa è l'<a href="/help/pagamenti/abbonamento-artista">abbonamento</a>, che è facoltativo e indipendente da quante date fai.</p>

<h2>La fascia di prezzo sul profilo</h2>
<p>Nel blocco "Informazioni di booking" puoi indicare una <strong>fascia</strong> anziché una cifra secca. Le opzioni vanno da "0 — 100 €" a "1.000 € e oltre".</p>
<p>La fascia è visibile <strong>agli organizzatori</strong>, non a tutti i visitatori.</p>

<h3>Conviene dichiararla?</h3>
<p>Sì, quasi sempre. Una fascia non ti vincola — resta una trattativa — ma <strong>filtra le richieste</strong>: eviti di perdere tempo con chi ha un budget lontanissimo dal tuo, e vieni contattato da chi può permetterti. Un profilo senza fascia riceve più richieste, ma anche più richieste inutili.</p>
<p>Se ti muovi su cifre molto diverse a seconda della formazione, è il caso di usare <a href="/help/artisti/profili-multipli">più profili</a>: il duo acustico e la band completa non hanno lo stesso cachet.</p>

<h2>Cosa considerare oltre al compenso</h2>
<p>Il numero che vi scambiate dovrebbe essere netto di equivoci. Prima di dire sì, verifica:</p>
<ul>
  <li>Se il compenso è <strong>per il gruppo o a persona</strong>.</li>
  <li>Chi paga <strong>viaggio e trasferta</strong>.</li>
  <li>Chi fornisce l'<strong>impianto</strong> e chi il service.</li>
  <li><strong>Quanto dura</strong> il set e quanti set sono previsti.</li>
  <li><strong>Quando</strong> viene pagato il compenso.</li>
</ul>
<p>La lista completa da concordare è in <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>Fatture e adempimenti fiscali</h2>
<p>Riguardano te e l'organizzatore: N'arte non è parte del contratto e non emette documenti per l'esibizione. Per la tua posizione fiscale <strong>rivolgiti al tuo commercialista</strong> — vedi <a href="/help/pagamenti/fattura-artista">chi emette la fattura</a>.</p>

<h2>Il prezzo definitivo in piattaforma</h2>
<p>Sulle date confermate puoi registrare il <strong>compenso realmente pattuito</strong>, con la conferma di entrambe le parti. Non serve a farti pagare — quello avviene fuori — ma lascia una traccia condivisa di quanto era stato concordato. Vedi <a href="/help/organizzatori/prezzo-definitivo">il prezzo definitivo</a>.</p>
`,
    },
  ],
};
