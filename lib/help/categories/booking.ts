import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-11-13";

export const BOOKING: HelpCategory = {
  slug: "booking",
  title: "Booking e richieste",
  description:
    "Il percorso completo di una data: stati, calendario, tempi di risposta e cosa concordare prima di suonare.",
  icon: "calendar",
  audience: "all",
  articles: [
    {
      slug: "stati-richiesta",
      title: "Gli stati di una richiesta di booking",
      excerpt:
        "In attesa, in trattativa, confermata, rifiutata, annullata: cosa significano, chi può cambiarli e cosa vedi da ciascun lato.",
      updatedAt: UPDATED,
      related: [
        "dopo-la-conferma",
        "tempi-di-risposta",
        "artisti/gestire-richieste",
      ],
      content: `
<h2>I cinque stati</h2>
<p>Ogni richiesta di booking passa per alcuni stati precisi. Conoscerli toglie il dubbio più comune: <em>"e adesso tocca a me o all'altro?"</em>.</p>

<h3>In attesa</h3>
<p>La richiesta è stata inviata dal calendario del profilo e l'artista non ha ancora risposto. <strong>Tocca all'artista</strong>, che può premere <strong>"Inizia trattativa"</strong> oppure <strong>"Rifiuta"</strong>.</p>
<p>L'organizzatore può annullare in qualsiasi momento.</p>

<h3>In trattativa</h3>
<p>L'artista ha premuto "Inizia trattativa": vuol dire <em>"parliamone"</em>, non ancora <em>"è fatta"</em>. La data resta libera e si concordano data, orari, compenso e dettagli tecnici. Come si tratta dipende dal piano dell'artista:</p>
<ul>
  <li><strong>Artista Pro o Max</strong>: si apre la <strong>chat</strong> fra artista e organizzatore (prima di questo momento l'organizzatore non può scrivere in chat). Quando siete d'accordo, uno dei due manda un'<strong>offerta</strong> con data, fascia oraria e compenso, e l'altro la accetta.</li>
  <li><strong>Artista Free</strong>: la chat non c'è e lo stato si chiama <strong>"In trattativa via email"</strong>. Ciascuno vede l'indirizzo email dell'altro e vi scrivete direttamente. Quando vi siete accordati, l'organizzatore usa <strong>"Registra l'accordo"</strong> sulla pagina della richiesta e l'artista lo conferma dal pannello Richieste.</li>
</ul>

<h3>Confermata</h3>
<p>Data, fascia e compenso sono stati approvati da tutti e due: chi ha proposto e chi ha accettato. Il giorno viene bloccato sul calendario dell'artista, compare nel calendario dell'organizzatore e partono le email a entrambi. <strong>A questo punto è un impegno vero e proprio.</strong></p>

<h3>Rifiutata</h3>
<p>L'artista ha fatto sapere di non essere disponibile, oppure non avete trovato un accordo. La richiesta si chiude e l'organizzatore riceve un'email.</p>

<h3>Annullata</h3>
<p>La richiesta è stata ritirata prima della conferma, oppure il team ha annullato una data già confermata. Una data confermata si annulla solo scrivendo al team: vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</p>

<h2>Cosa vedete nelle due aree</h2>
<p>Lo stesso stato ha un'etichetta diversa a seconda di chi lo guarda, perché a ciascuno serve un'informazione diversa:</p>
<table>
  <thead>
    <tr><th>Stato</th><th>L'artista vede</th><th>L'organizzatore vede</th></tr>
  </thead>
  <tbody>
    <tr><td>In attesa</td><td>Nuova richiesta</td><td>In attesa: l'artista deve avviare la trattativa</td></tr>
    <tr><td>In trattativa</td><td>In trattativa in chat, oppure In trattativa via email</td><td>In trattativa in chat, oppure In trattativa via email</td></tr>
    <tr><td>Confermata</td><td>Confermata</td><td>Confermata</td></tr>
  </tbody>
</table>
<p>Nelle richieste meno recenti l'organizzatore può trovare anche <em>"Offerta accettata dall'artista: conferma tu la data"</em>: è un'offerta accettata prima del nuovo flusso, e la data si conferma dal widget dell'offerta.</p>

<h2>Chi può fare cosa</h2>
<ul>
  <li><strong>L'artista</strong> inizia la trattativa o rifiuta una richiesta in attesa. In chat propone e accetta offerte; con il piano Free conferma (o segnala che non corrisponde) l'accordo registrato dall'organizzatore.</li>
  <li><strong>L'organizzatore</strong> annulla la richiesta prima della conferma. In chat propone e accetta offerte; con un artista Free registra l'accordo raggiunto via email.</li>
  <li><strong>Il team N'arte</strong> annulla una data già confermata, su richiesta delle parti o dopo una segnalazione, indicando una motivazione.</li>
</ul>

<h2>Serve sempre una doppia conferma</h2>
<p>Una data non si conferma mai con un solo click. In chat la conferma arriva quando una parte propone un'offerta e l'altra la accetta, <strong>chiunque dei due abbia proposto</strong>. Via email l'organizzatore registra l'accordo e l'artista lo conferma. In entrambi i casi la data viene bloccata <strong>al compenso indicato</strong>.</p>
<p>Il compenso resta un accordo fra voi: N'arte non intermedia pagamenti e non è parte del contratto.</p>

<h2>Due date lo stesso giorno</h2>
<p>Un artista non può avere <strong>due date confermate nella stessa giornata</strong>: la piattaforma lo impedisce, così non si rischiano doppie prenotazioni.</p>
`,
    },

    {
      slug: "calendario-disponibilita",
      title: "Il calendario delle disponibilità dell'artista",
      excerpt:
        "Come funziona il calendario, perché i giorni sono liberi per default, come si gestiscono gli slot orari e la modifica in massa.",
      updatedAt: UPDATED,
      related: ["dopo-la-conferma", "stati-richiesta", "artisti/gestire-richieste"],
      content: `
<h2>Dove si gestisce</h2>
<p>Da <strong>/dashboard/calendario</strong>, nell'area artista. Il calendario è pubblico: gli organizzatori lo vedono sulla tua scheda prima ancora di scriverti.</p>

<h2>I giorni sono liberi finché non dici il contrario</h2>
<p>Partiamo da qui: <strong>ogni giorno futuro è considerato disponibile</strong> e appare in verde. Quindi non devi segnare le date in cui sei libero, ma quelle in cui <strong>non</strong> lo sei.</p>
<p>Un calendario mai toccato dice "sono sempre disponibile": se non è così, va aggiornato.</p>

<h2>La legenda</h2>
<ul>
  <li><strong>Disponibile</strong> — verde. È lo stato di partenza.</li>
  <li><strong>Occupato</strong> — rosso. L'hai segnato tu o è una data confermata.</li>
  <li><strong>Storico</strong> — rosso scuro. Le date passate, che restano in archivio.</li>
  <li><strong>Slot specifici impostati</strong> — bordo azzurro: quel giorno ha fasce orarie sue.</li>
</ul>

<h2>Segnare un giorno occupato</h2>
<p>Clicca il giorno e usa <strong>"Segna come occupato"</strong>. Per tornare indietro c'è "Rendi disponibile".</p>

<h2>Gli slot orari</h2>
<p>Nella scheda del giorno puoi aggiungere <strong>fasce orarie specifiche</strong>, con etichetta facoltativa, ora di inizio e di fine (per esempio 21:00-23:30).</p>
<p>Servono a far sapere quando suoni davvero: se la domenica sei libero solo il pomeriggio, indicarlo ti evita richieste per la sera.</p>
<p>Per ora gli slot si impostano <strong>giorno per giorno</strong> e non si può creare una regola ricorrente, per esempio valida per tutte le domeniche. Per coprire più giorni insieme c'è la modifica in massa.</p>

<h2>La modifica in massa</h2>
<p>È lo strumento più comodo, e anche quello che passa più inosservato. Scegli un intervallo di date, imposti <strong>disponibile</strong> o <strong>occupato</strong> e applichi tutto in una volta.</p>
<p>Torna utile per vacanze, tour o periodi di studio. Puoi applicare anche gli slot a tutto l'intervallo; se non ne scegli nessuno, cambia solo lo stato dei giorni.</p>

<h2>Le date confermate si bloccano da sole</h2>
<p>Quando una richiesta viene confermata, il giorno viene <strong>segnato come occupato in automatico</strong>, senza che tu debba ricordartene. Se la conferma decade, torna libero.</p>

<h2>Buone abitudini</h2>
<ul>
  <li>Aggiornalo <strong>una volta a settimana</strong>: bastano due minuti.</li>
  <li>Blocca in anticipo tour, vacanze e impegni fissi.</li>
  <li>Ricorda che è pubblico: un calendario aggiornato fa capire che dietro c'è un progetto seguito.</li>
</ul>
`,
    },

    {
      slug: "tempi-di-risposta",
      title: "Quanto si aspetta una risposta",
      excerpt:
        "Non esistono scadenze automatiche sulle richieste. Cosa aspettarsi realisticamente e cosa fare quando non arriva risposta.",
      updatedAt: UPDATED,
      related: ["stati-richiesta", "artisti/gestire-richieste", "account/notifiche-email"],
      content: `
<h2>Nessuna richiesta scade da sola</h2>
<p>È la domanda che ci fanno più spesso: <strong>non esiste un timer</strong>. Una richiesta in attesa non si annulla dopo tre giorni né scade dopo una settimana, e nessuno la chiude in automatico. Resta lì finché l'artista risponde o l'organizzatore la annulla.</p>
<p>Vale anche per le trattative: se nessuno fa niente, restano aperte a tempo indeterminato.</p>

<h2>I tempi realistici</h2>
<ul>
  <li><strong>Risposta dell'artista a una nuova richiesta</strong>: di norma 24-72 ore.</li>
  <li><strong>Trattativa</strong>, in chat o via email: da poche ore a qualche giorno, secondo i dettagli da chiarire.</li>
  <li><strong>Accettazione dell'offerta o conferma dell'accordo registrato</strong>: variabile, spesso legata a decisioni interne del locale o agli altri impegni dell'artista.</li>
</ul>

<h2>Per gli artisti: perché rispondere in fretta</h2>
<p>Chi organizza scrive quasi sempre a più artisti in parallelo, e la data va a chi risponde per primo con un sì credibile. Rispondere entro <strong>24-48 ore</strong> spesso decide se la serata sarà tua o di qualcun altro.</p>
<p>Se la data non ti interessa, <strong>rifiuta subito</strong>: per chi organizza è meglio di un sì tiepido dopo dieci giorni.</p>

<h2>Per gli organizzatori: quando l'artista non risponde</h2>
<p>Dopo <strong>4-5 giorni</strong> senza riscontro, hai tre strade:</p>
<ol>
  <li><strong>Sollecitare</strong>, se è proprio il profilo che vuoi.</li>
  <li><strong>Annullare la richiesta</strong> e scriverne un'altra: così liberi anche l'artista.</li>
  <li><strong>Scrivere a più artisti</strong> insieme, cosa normalissima quando la data è vicina.</li>
</ol>
<p>Tieni presente che con un artista sul piano gratuito <strong>la chat non c'è</strong>: lui riceve la richiesta e l'email, e se inizia la trattativa vi scrivete via email. Quando la richiesta passa "In trattativa via email", controlla la posta: è lì che ti risponde.</p>

<h2>Quando la conferma non arriva</h2>
<p>A volte una trattativa si ferma perché un'offerta resta in sospeso o un accordo registrato non viene mai confermato. Finché manca il secondo sì, la data resta libera. Sollecita in chat o via email e, se nessuno risponde, considera quella data libera.</p>

<h2>Controlla le email</h2>
<p>A ogni passaggio importante parte un'email. Se non ti arriva nulla, guarda nello spam e nelle promozioni: vedi <a href="/help/account/notifiche-email">quali email invia N'arte</a>.</p>

<h2>Se qualcosa sembra bloccato</h2>
<p>Se vi siete accordati ma la richiesta non cambia stato, quasi sempre manca l'ultimo passaggio: l'offerta in chat non è stata ancora accettata, oppure l'accordo registrato dall'organizzatore aspetta la conferma dell'artista. Se invece pensi a un problema tecnico, <a href="/contatti">scrivici</a> indicando artista e data.</p>
`,
    },

    {
      slug: "dopo-la-conferma",
      title: "Cosa succede dopo la conferma di una data",
      excerpt:
        "Calendari, email, compenso concordato – promemoria, recensione: la sequenza di ciò che accade quando una data diventa confermata.",
      updatedAt: UPDATED,
      related: [
        "stati-richiesta",
        "organizzatori/prezzo-definitivo",
        "contratto-modello",
      ],
      content: `
<h2>Nell'istante della conferma</h2>
<p>Quando una data viene confermata, perché un'offerta in chat è stata accettata o perché l'artista ha confermato l'accordo registrato dall'organizzatore, succedono quattro cose insieme:</p>
<ol>
  <li>La data è <strong>bloccata sul calendario dell'artista</strong>, al compenso concordato. Nessun altro può prenotarlo quel giorno.</li>
  <li>Compare nel <strong>calendario dell'organizzatore</strong>, fra le date confermate.</li>
  <li>Parte un'<strong>email di conferma a entrambi</strong>, con artista, data e riepilogo.</li>
  <li>Si sblocca il riquadro <strong>«Compenso concordato – promemoria»</strong> sulla richiesta.</li>
</ol>

<h2>Subito dopo: le cose da fare</h2>
<p>La conferma fissa <em>quando</em>, <em>chi</em> e <em>a quale compenso</em>. Gli altri dettagli conviene concordarli adesso, senza aspettare la settimana prima.</p>
<ul>
  <li><strong>Annotate il compenso concordato</strong> con la doppia conferma: vedi <a href="/help/organizzatori/prezzo-definitivo">compenso concordato – promemoria</a>.</li>
  <li><strong>Scambiatevi il rider tecnico</strong>: vedi <a href="/help/organizzatori/guida-rider-tecnico">cos'è il rider tecnico</a>.</li>
  <li><strong>Mettete per iscritto il resto</strong> (orari di arrivo, durata, chi porta cosa, come si paga): vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto</a>.</li>
</ul>
<p>Scrivetelo <strong>in chat</strong> (o via email, se l'artista ha il piano Free), così resta traccia e potete rileggerlo entrambi.</p>

<h2>Nei giorni precedenti</h2>
<p>La mattina del <strong>giorno prima dell'evento</strong> N'arte manda un <strong>promemoria via email</strong> sia all'artista sia all'organizzatore, con data e riepilogo. È un aiuto, non una garanzia (un'email può finire nello spam): segnatevi comunque la data in agenda.</p>
<p>Sentirsi 48 ore prima per confermare orario di arrivo, referente sul posto e numero di telefono evita il 90% degli imprevisti.</p>

<h2>Dopo la serata</h2>
<p>La data passa nello storico. Da quel momento l'organizzatore può <a href="/help/organizzatori/lasciare-recensione">lasciare una recensione</a>, una sola per evento, che compare sul profilo pubblico dell'artista.</p>
<p>Il giorno dopo la data l'organizzatore riceve <strong>un'email che lo invita a lasciare la recensione</strong>. Scriverla resta una sua scelta: se sei un artista e ci tieni, un messaggio di ringraziamento il giorno dopo aiuta.</p>

<h2>Il pagamento</h2>
<p>Avviene <strong>fuori dalla piattaforma</strong>, direttamente fra voi e nei modi che avete concordato. N'arte non incassa, non anticipa e non trattiene nulla: vedi <a href="/help/pagamenti/modalita-pagamento">come viene pagato il compenso</a>.</p>

<h2>Se la data salta</h2>
<p>Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</p>
`,
    },

    {
      slug: "differenze-lead-booking",
      title: "Che differenza c'è tra un contatto e una richiesta di booking",
      excerpt:
        "Non tutte le richieste seguono lo stesso percorso: da dove arrivano, chi le gestisce e perché alcune non portano a una trattativa.",
      updatedAt: UPDATED,
      related: ["stati-richiesta", "iniziare/glossario", "organizzatori/richiedere-booking"],
      content: `
<h2>Due percorsi diversi</h2>
<p>Sulla piattaforma esistono due tipi di richiesta. Si somigliano, ma funzionano in modo diverso: sapere quale hai davanti ti spiega perché a volte manca la chat.</p>

<h3>La richiesta di booking</h3>
<p>È quella strutturata, che un organizzatore invia dal calendario di un artista. Contiene data, fascia oraria, budget, struttura e messaggio, passa per i <a href="/help/booking/stati-richiesta">cinque stati</a>, apre una trattativa (in chat con gli artisti Pro o Max, via email con il piano Free) e aggiorna i calendari.</p>
<p>È il percorso completo, e quello da preferire.</p>

<h3>Il contatto</h3>
<p>È una richiesta più semplice, che arriva da:</p>
<ul>
  <li>il modulo <a href="/contatti">contatti</a>;</li>
  <li>il modulo di interesse sulle pagine dei <a href="/format">format</a>;</li>
  <li>il modulo per raccontare l'evento presente in home;</li>
  <li>il vecchio modulo di richiesta dai profili artista.</li>
</ul>
<p>Un contatto è solo una segnalazione: <strong>non apre una chat, non blocca date e non ha stati di trattativa</strong>. Lo gestisce il team N'arte, che risponde e, se serve, ti indirizza verso la richiesta di booking.</p>

<h2>Come li riconosci</h2>
<p>Nell'area artista i contatti compaiono in una sezione a parte, intitolata alle <strong>richieste legacy</strong>, con stati propri: <em>Nuova</em>, <em>Contattata</em>, <em>Chiusa</em>. Se una richiesta non ha il pulsante "Inizia trattativa", è un contatto.</p>

<h2>Perché esistono entrambi</h2>
<p>Non tutti arrivano con una data in mente. Chi scrive "vorrei della musica per il locale, non so ancora quando" non può compilare un modulo che chiede una data precisa. Il contatto serve a raccogliere l'interesse, la richiesta a definire l'accordo.</p>

<h2>Cosa conviene fare</h2>
<ul>
  <li><strong>Se hai una data</strong>: usa il calendario sulla scheda dell'artista. È la strada che porta alla conferma della data.</li>
  <li><strong>Se hai solo un'idea</strong>: scrivi dal modulo contatti o da un format, e il team ti aiuta a darle una forma.</li>
  <li><strong>Se sei un artista e ricevi un contatto</strong>: rispondi comunque, sapendo che quella richiesta non muoverà i calendari.</li>
</ul>
`,
    },

    {
      slug: "contratto-modello",
      title: "Cosa mettere per iscritto prima di una data",
      excerpt:
        "La lista dei punti da concordare prima di suonare. Non è un contratto: serve a evitare i malintesi più comuni.",
      updatedAt: UPDATED,
      related: [
        "dopo-la-conferma",
        "organizzatori/guida-rider-tecnico",
        "pagamenti/acconto-saldo",
      ],
      content: `
<h2>Una premessa necessaria</h2>
<p><strong>N'arte non fornisce un modello di contratto e non è parte dell'accordo</strong> fra artista e organizzatore. Quella che segue è una lista di buone pratiche e non ha valore legale: se ti serve un contratto vero e proprio, rivolgiti a un professionista.</p>
<p>Di solito i problemi nascono da un punto che nessuno dei due aveva pensato di chiarire, più che dalla malafede. Questa lista serve a non dimenticarne nessuno.</p>

<h2>Dove scriverlo</h2>
<p><strong>In chat</strong>, sulla piattaforma, se l'artista ha il piano Pro o Max: resta traccia, potete rileggerlo entrambi e nessuno può modificarlo in seguito. Con un artista sul piano Free la trattativa passa per email: conservate i messaggi. In tutti e due i casi, un messaggio di riepilogo dopo la conferma vale più di dieci telefonate.</p>

<h2>La lista</h2>

<h3>Quando e dove</h3>
<ul>
  <li><strong>Data</strong> e <strong>indirizzo esatto</strong> del luogo.</li>
  <li><strong>Ora di arrivo</strong> per montaggio e prove.</li>
  <li><strong>Ora di inizio</strong> e <strong>ora di fine</strong> dell'esibizione.</li>
  <li><strong>Durata e numero dei set</strong>: un set da 90 minuti e tre da 40 fanno due serate diverse.</li>
  <li>Eventuale <strong>orario limite</strong> imposto dal locale o dal comune.</li>
</ul>

<h3>Il compenso</h3>
<ul>
  <li><strong>Cifra concordata</strong>, e se è <strong>per il gruppo o a persona</strong>.</li>
  <li><strong>Quando</strong> viene pagato: la sera stessa, a giorni, a fine mese.</li>
  <li><strong>Come</strong>: contanti, bonifico.</li>
  <li>Se è previsto un <strong>acconto</strong>: vedi <a href="/help/pagamenti/acconto-saldo">acconto e saldo</a>.</li>
  <li><strong>Rimborso viaggio</strong>: incluso o a parte, e in che misura.</li>
  <li>Chi si occupa di eventuali <strong>adempimenti fiscali</strong>: vedi <a href="/help/pagamenti/fattura-artista">chi emette la fattura</a>.</li>
</ul>

<h3>Il tecnico</h3>
<ul>
  <li><strong>Chi porta l'impianto</strong>: il locale, l'artista o un service esterno.</li>
  <li>Se è previsto un <strong>fonico</strong> e chi lo paga.</li>
  <li><strong>Spazio disponibile</strong> sul palco e <strong>alimentazione</strong>.</li>
  <li>Cosa porta l'artista e cosa deve trovare sul posto.</li>
  <li>Il <a href="/help/organizzatori/guida-rider-tecnico">rider tecnico</a> completo.</li>
</ul>

<h3>Il contorno</h3>
<ul>
  <li><strong>Referente sul posto</strong> con nome e numero di telefono.</li>
  <li><strong>Parcheggio</strong> e dove scaricare la strumentazione.</li>
  <li>Se sono previsti <strong>pasti</strong> o consumazioni.</li>
  <li><strong>Camerino</strong> o spazio dove lasciare le custodie.</li>
</ul>

<h3>Gli imprevisti</h3>
<ul>
  <li><strong>Se piove</strong> ed è all'aperto: si sposta, si rinvia o si annulla? Chi decide, ed entro quando?</li>
  <li><strong>Se una parte annulla</strong>: cosa succede. Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</li>
  <li>Chi si occupa degli <strong>adempimenti SIAE</strong> e dei permessi: vedi <a href="/help/pagamenti/siae">chi paga la SIAE</a>.</li>
</ul>

<h3>Foto e video</h3>
<ul>
  <li>Chi può <strong>riprendere</strong> la serata e come si possono usare le riprese.</li>
  <li>Se il locale userà l'<strong>immagine dell'artista</strong> per promuovere l'evento.</li>
  <li>Vedi le <a href="/help/brand/annunciare-una-data">regole per annunciare una data</a>.</li>
</ul>

<h2>Il minimo indispensabile</h2>
<p>Se hai poco tempo, mettiti d'accordo almeno su questi cinque punti: <strong>data e orari</strong>, <strong>durata del set</strong>, <strong>compenso e quando si paga</strong>, <strong>chi porta l'impianto</strong>, <strong>referente sul posto</strong>. Bastano a evitare quasi tutti i malintesi.</p>
`,
    },
  ],
};
