import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-09-07";

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
<p>Ogni richiesta di booking attraversa stati definiti. Conoscerli evita il dubbio più comune: <em>"e adesso tocca a me o all'altro?"</em>.</p>

<h3>In attesa</h3>
<p>La richiesta è stata inviata e l'artista non ha ancora risposto. <strong>Tocca all'artista.</strong></p>
<p>L'organizzatore può annullare in qualsiasi momento.</p>

<h3>In trattativa</h3>
<p>L'artista ha accettato di discuterne — non ha ancora confermato. Si è aperta la chat e si concordano data, orari, compenso e dettagli tecnici.</p>
<p><strong>Tocca all'organizzatore</strong> dare la conferma finale quando siete d'accordo. È il punto in cui più spesso ci si blocca: l'artista pensa sia fatta, l'organizzatore aspetta senza sapere di dover premere un pulsante.</p>

<h3>Confermata</h3>
<p>Data e condizioni sono approvate da entrambi. La data è bloccata sul calendario dell'artista, sono partite le email a entrambi ed è comparsa nel calendario dell'organizzatore. <strong>È un impegno reale.</strong></p>

<h3>Rifiutata</h3>
<p>L'artista ha dichiarato di non essere disponibile o l'accordo non è stato trovato. La richiesta è chiusa; l'organizzatore riceve un'email.</p>

<h3>Annullata</h3>
<p>La richiesta è stata ritirata prima della conferma, oppure una data confermata è stata annullata dal team a seguito di una segnalazione. Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</p>

<h2>Le etichette sono diverse nelle due aree</h2>
<p>Lo stesso stato viene chiamato in modo diverso a seconda di chi guarda, perché l'informazione utile è diversa. Non è un errore:</p>
<table>
  <thead>
    <tr><th>Stato</th><th>L'artista vede</th><th>L'organizzatore vede</th></tr>
  </thead>
  <tbody>
    <tr><td>In attesa</td><td>Nuova richiesta</td><td>In attesa di conferma dell'artista</td></tr>
    <tr><td>In trattativa</td><td>In attesa della conferma definitiva dell'organizzatore</td><td>In trattativa</td></tr>
    <tr><td>Confermata</td><td>Confermata</td><td>Confermata</td></tr>
  </tbody>
</table>

<h2>Chi può fare cosa</h2>
<ul>
  <li><strong>L'artista</strong> accetta o rifiuta una richiesta in attesa, e può accettare le offerte in chat. <strong>Non può confermare</strong> la data.</li>
  <li><strong>L'organizzatore</strong> conferma la data, annulla la richiesta prima della conferma, e può inviare offerte.</li>
  <li><strong>Il team N'arte</strong> può annullare una data già confermata, ma solo indicando una motivazione, e su segnalazione.</li>
</ul>

<h2>La scorciatoia dell'offerta</h2>
<p>C'è un percorso che salta i passaggi: se una delle due parti manda un'<strong>offerta</strong> in chat — data, fascia oraria e budget insieme — e l'altra la accetta, la richiesta risulta <strong>confermata all'istante</strong>. Nessuna conferma successiva.</p>

<h2>Due date lo stesso giorno</h2>
<p>Non è possibile: un artista non può avere <strong>due date confermate nella stessa giornata</strong>. La piattaforma lo impedisce, evitando doppie prenotazioni.</p>
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
<p>Da <strong>/dashboard/calendario</strong>, nell'area artista. È pubblico: gli organizzatori lo vedono sulla tua scheda prima ancora di scriverti.</p>

<h2>I giorni sono liberi finché non dici il contrario</h2>
<p>È il punto da capire per primo. <strong>Ogni giorno futuro è considerato disponibile</strong>, e appare in verde. Non devi segnare le date in cui sei libero: devi segnare quelle in cui <strong>non</strong> lo sei.</p>
<p>Un calendario mai toccato dice quindi "sono sempre disponibile". Se non è vero, va aggiornato.</p>

<h2>La legenda</h2>
<ul>
  <li><strong>Disponibile</strong> — verde. È lo stato di partenza.</li>
  <li><strong>Occupato</strong> — rosso. L'hai segnato tu o è una data confermata.</li>
  <li><strong>Storico</strong> — rosso scuro. Le date passate, che restano in archivio.</li>
  <li><strong>Slot specifici impostati</strong> — bordo azzurro: quel giorno ha fasce orarie sue.</li>
</ul>

<h2>Segnare un giorno occupato</h2>
<p>Clicca il giorno e usa <strong>"Segna come occupato"</strong>. Il pulsante è reversibile con "Rendi disponibile".</p>

<h2>Gli slot orari</h2>
<p>Nella scheda del giorno puoi aggiungere <strong>fasce orarie specifiche</strong>, con etichetta facoltativa, ora di inizio e di fine (per esempio 21:00-23:30).</p>
<p>Servono a comunicare le tue finestre reali: se la domenica suoni solo nel pomeriggio, dirlo evita richieste per la sera.</p>
<p>Oggi gli slot si impostano <strong>giorno per giorno</strong>: non c'è un modo di definire una regola ricorrente valida per tutte le domeniche. Per coprire più giorni si usa la modifica in massa.</p>

<h2>La modifica in massa</h2>
<p>È lo strumento più utile e il meno notato. Scegli un intervallo di date, imposti <strong>disponibile</strong> o <strong>occupato</strong> e applichi in un colpo solo.</p>
<p>Serve per le vacanze, un tour, un periodo di studio. Puoi anche applicare gli slot su tutto l'intervallo; se non ne selezioni nessuno, viene impostato soltanto lo stato del giorno.</p>

<h2>Le date confermate si bloccano da sole</h2>
<p>Quando una richiesta viene confermata, la data viene <strong>segnata occupata in automatico</strong>: non devi ricordartene. Se la conferma decade, la data torna libera.</p>

<h2>Buone abitudini</h2>
<ul>
  <li>Aggiornalo <strong>una volta a settimana</strong>: bastano due minuti.</li>
  <li>Blocca in anticipo tour, vacanze e impegni fissi.</li>
  <li>Ricorda che è pubblico: un calendario curato dà l'impressione di un progetto seguito.</li>
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
<p>Diciamolo subito perché è la domanda più frequente: <strong>non esiste un timer</strong>. Una richiesta in attesa non si annulla dopo tre giorni, non scade dopo una settimana e non viene chiusa automaticamente. Resta lì finché l'artista risponde o l'organizzatore la annulla.</p>
<p>Lo stesso vale per una trattativa aperta: se nessuno agisce, resta aperta indefinitamente.</p>

<h2>I tempi realistici</h2>
<ul>
  <li><strong>Risposta dell'artista a una nuova richiesta</strong>: di norma 24-72 ore.</li>
  <li><strong>Trattativa in chat</strong>: da poche ore a qualche giorno, secondo i dettagli da chiarire.</li>
  <li><strong>Conferma finale dell'organizzatore</strong>: variabile, spesso legata a decisioni interne del locale.</li>
</ul>

<h2>Per gli artisti: perché rispondere in fretta</h2>
<p>Chi organizza scrive quasi sempre a più artisti in parallelo, e la data la prende chi risponde per primo con un sì credibile. Rispondere entro <strong>24-48 ore</strong> non è cortesia, è la differenza fra prendere la serata e non prenderla.</p>
<p>E se la data non ti interessa, <strong>rifiuta subito</strong>: è più utile di un sì tiepido dopo dieci giorni.</p>

<h2>Per gli organizzatori: quando l'artista non risponde</h2>
<p>Dopo <strong>4-5 giorni</strong> senza riscontro, hai tre strade:</p>
<ol>
  <li><strong>Sollecitare</strong>, se è il profilo che vuoi davvero.</li>
  <li><strong>Annullare la richiesta</strong> e scriverne un'altra. Non è scortese: libera anche l'artista.</li>
  <li><strong>Scrivere a più artisti</strong> in parallelo, cosa del tutto normale per una data vicina.</li>
</ol>
<p>Una precisazione utile: un artista con il piano gratuito <strong>riceve la richiesta e l'email</strong> e può accettarla o rifiutarla, ma non può rispondere in chat. Se non ti risponde <em>in chat</em>, non è detto che ti stia ignorando.</p>

<h2>Quando è l'organizzatore a sparire</h2>
<p>Capita che una trattativa resti ferma perché la conferma non arriva mai. La conferma spetta all'organizzatore: se non la dà, la data resta sospesa. Sollecita in chat e, se non ottieni risposta, considera libera quella data.</p>

<h2>Controlla le email</h2>
<p>Ogni passaggio importante genera un'email. Se ti sembra che non arrivi nulla, controlla spam e promozioni: vedi <a href="/help/account/notifiche-email">quali email invia N'arte</a>.</p>

<h2>Se qualcosa sembra bloccato</h2>
<p>Una richiesta che non cambia stato pur avendo concluso l'accordo è quasi sempre la conferma mancante dell'organizzatore. Se invece sospetti un problema tecnico, <a href="/contatti">scrivici</a> indicando artista e data.</p>
`,
    },

    {
      slug: "dopo-la-conferma",
      title: "Cosa succede dopo la conferma di una data",
      excerpt:
        "Calendari, email, prezzo definitivo, recensione: la sequenza di ciò che accade quando una data diventa confermata.",
      updatedAt: UPDATED,
      related: [
        "stati-richiesta",
        "organizzatori/prezzo-definitivo",
        "contratto-modello",
      ],
      content: `
<h2>Nell'istante della conferma</h2>
<p>Quando una data viene confermata — dal pulsante "Conferma data" o dall'accettazione di un'offerta in chat — succedono quattro cose contemporaneamente:</p>
<ol>
  <li>La data è <strong>bloccata sul calendario dell'artista</strong>. Nessun altro può prenotarlo quel giorno.</li>
  <li>Compare nel <strong>calendario dell'organizzatore</strong>, fra le date confermate.</li>
  <li>Parte un'<strong>email di conferma a entrambi</strong>, con artista, data e riepilogo.</li>
  <li>Si sblocca il riquadro del <strong>prezzo definitivo</strong> sulla richiesta.</li>
</ol>

<h2>Subito dopo: le cose da fare</h2>
<p>La conferma dice <em>quando</em> e <em>chi</em>. Tutto il resto va concordato, ed è il momento giusto per farlo, non la settimana prima.</p>
<ul>
  <li><strong>Registrate il prezzo definitivo</strong> con la doppia conferma: vedi <a href="/help/organizzatori/prezzo-definitivo">il prezzo definitivo</a>.</li>
  <li><strong>Scambiatevi il rider tecnico</strong>: vedi <a href="/help/organizzatori/guida-rider-tecnico">cos'è il rider tecnico</a>.</li>
  <li><strong>Mettete per iscritto il resto</strong> — orari di arrivo, durata, chi porta cosa, come si paga: vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto</a>.</li>
</ul>
<p>Fatelo <strong>in chat</strong>: resta tracciato ed è consultabile da entrambi.</p>

<h2>Nei giorni precedenti</h2>
<p>Un promemoria: <strong>la piattaforma non invia avvisi automatici prima dell'evento</strong>. Nessuno vi scriverà "domani suoni": segnatevi la data nella vostra agenda.</p>
<p>Una conferma reciproca 48 ore prima — orario di arrivo, referente sul posto, numero di telefono — è la buona abitudine che risolve il 90% degli imprevisti.</p>

<h2>Dopo la serata</h2>
<p>La data passa nello storico. Da quel momento l'organizzatore può <a href="/help/organizzatori/lasciare-recensione">lasciare una recensione</a>, una sola per evento, che compare sul profilo pubblico dell'artista.</p>
<p>Anche qui: <strong>nessuna email automatica invita a recensire</strong>. Se sei un artista e vuoi una recensione, un messaggio di ringraziamento in chat il giorno dopo funziona meglio di qualunque automatismo.</p>

<h2>Il pagamento</h2>
<p>Avviene <strong>fuori dalla piattaforma</strong>, direttamente fra le parti, nei modi che avete concordato. N'arte non incassa, non anticipa e non trattiene nulla: vedi <a href="/help/pagamenti/modalita-pagamento">come viene pagato il compenso</a>.</p>

<h2>Se la data salta</h2>
<p>Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</p>
`,
    },

    {
      slug: "differenze-lead-booking",
      title: "Che differenza c'è tra un contatto e una richiesta di booking",
      excerpt:
        "Non tutte le richieste seguono lo stesso percorso: da dove arrivano, chi le gestisce e perché alcune non hanno una chat.",
      updatedAt: UPDATED,
      related: ["stati-richiesta", "iniziare/glossario", "organizzatori/richiedere-booking"],
      content: `
<h2>Due percorsi diversi</h2>
<p>Sulla piattaforma convivono due tipi di richiesta. Si assomigliano ma si comportano in modo diverso, e sapere quale hai davanti spiega perché in alcuni casi non trovi una chat.</p>

<h3>La richiesta di booking</h3>
<p>È quella strutturata, inviata da un organizzatore dal calendario di un artista. Ha data, fascia oraria, budget, struttura e messaggio, attraversa i <a href="/help/booking/stati-richiesta">cinque stati</a>, apre una chat e sincronizza i calendari.</p>
<p>È il percorso completo e quello da preferire.</p>

<h3>Il contatto</h3>
<p>È una richiesta di contatto più semplice, che arriva da:</p>
<ul>
  <li>il modulo <a href="/contatti">contatti</a>;</li>
  <li>il modulo di interesse sulle pagine dei <a href="/format">format</a>;</li>
  <li>il modulo per raccontare l'evento presente in home;</li>
  <li>il vecchio modulo di richiesta dai profili artista.</li>
</ul>
<p>Un contatto è una segnalazione: <strong>non apre una chat, non blocca date e non ha stati di trattativa</strong>. Viene preso in carico dal team N'arte, che risponde e, se serve, indirizza verso il percorso strutturato.</p>

<h2>Come li riconosci</h2>
<p>Nell'area artista i contatti compaiono in una sezione separata, intitolata alle <strong>richieste legacy</strong>, con stati propri: <em>Nuova</em>, <em>Contattata</em>, <em>Chiusa</em>. Se una richiesta non ha il pulsante per aprire la chat, è un contatto.</p>

<h2>Perché esistono entrambi</h2>
<p>Perché non tutti arrivano con una data già in mente. Chi scrive "vorrei della musica per il locale, non so ancora quando" non può compilare un modulo che pretende una data. Il contatto raccoglie l'interesse; la richiesta struttura l'accordo.</p>

<h2>Cosa conviene fare</h2>
<ul>
  <li><strong>Se hai una data</strong>: usa il calendario sulla scheda dell'artista. È il percorso che porta a una conferma reale.</li>
  <li><strong>Se hai solo un'idea</strong>: scrivi dal modulo contatti o da un format, e il team ti aiuta a inquadrarla.</li>
  <li><strong>Se sei un artista e ricevi un contatto</strong>: rispondi comunque, ma sappi che quella richiesta non muoverà i calendari.</li>
</ul>
`,
    },

    {
      slug: "contratto-modello",
      title: "Cosa mettere per iscritto prima di una data",
      excerpt:
        "La lista dei punti da concordare prima di suonare. Non è un contratto, è ciò che evita i malintesi più comuni.",
      updatedAt: UPDATED,
      related: [
        "dopo-la-conferma",
        "organizzatori/guida-rider-tecnico",
        "pagamenti/acconto-saldo",
      ],
      content: `
<h2>Una premessa necessaria</h2>
<p><strong>N'arte non fornisce un modello di contratto e non è parte dell'accordo</strong> fra artista e organizzatore. Quello che segue è una lista di buone pratiche, non un documento legale: se ti serve un contratto vero e proprio, rivolgiti a un professionista.</p>
<p>Detto questo: la maggior parte dei problemi non nasce dalla malafede, ma da un punto che nessuno dei due aveva pensato di chiarire. Questa lista serve a quello.</p>

<h2>Dove scriverlo</h2>
<p><strong>In chat</strong>, sulla piattaforma. Resta tracciato, è consultabile da entrambi e nessuno può modificarlo a posteriori. Un messaggio riepilogativo dopo la conferma vale più di dieci telefonate.</p>

<h2>La lista</h2>

<h3>Quando e dove</h3>
<ul>
  <li><strong>Data</strong> e <strong>indirizzo esatto</strong> del luogo.</li>
  <li><strong>Ora di arrivo</strong> per montaggio e prove.</li>
  <li><strong>Ora di inizio</strong> e <strong>ora di fine</strong> dell'esibizione.</li>
  <li><strong>Durata e numero dei set</strong> — un set da 90 minuti o tre da 40 non sono la stessa serata.</li>
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
  <li><strong>Se piove</strong> ed è all'aperto: si sposta, si rinvia o si annulla? Chi decide, e entro quando?</li>
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
<p>Se hai poco tempo, mettiti d'accordo almeno su questi cinque: <strong>data e orari</strong>, <strong>durata del set</strong>, <strong>compenso e quando si paga</strong>, <strong>chi porta l'impianto</strong>, <strong>referente sul posto</strong>. Coprono quasi tutti i malintesi reali.</p>
`,
    },
  ],
};
