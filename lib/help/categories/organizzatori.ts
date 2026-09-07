import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-09-07";

export const ORGANIZZATORI: HelpCategory = {
  slug: "organizzatori",
  title: "Per organizzatori",
  description:
    "Cercare artisti, inviare richieste, condurre la trattativa e gestire le date confermate. Per locali, festival, brand e privati.",
  icon: "users",
  audience: "organizer",
  articles: [
    {
      slug: "trovare-artista",
      title: "Come trovare l'artista giusto",
      excerpt:
        "Usare i filtri del roster, leggere una scheda e capire in fretta se un artista è adatto alla tua serata.",
      updatedAt: UPDATED,
      related: ["richiedere-booking", "guida-rider-tecnico", "iniziare/cos-e-narte"],
      content: `
<h2>Si parte da /artisti</h2>
<p>La pagina <a href="/artisti">/artisti</a> raccoglie tutto il roster approvato. Puoi combinare tre filtri:</p>
<ul>
  <li><strong>Tipologia</strong> — cantante, chitarrista, batterista, dj, sassofonista e così via, in base agli strumenti che l'artista dichiara di portare sul palco.</li>
  <li><strong>Generi musicali</strong> — pop, rock, jazz, elettronica, cantautorato.</li>
  <li><strong>Ricerca testuale</strong> — per nome d'arte o città.</li>
</ul>
<p>Il contatore si aggiorna mentre filtri, e si azzera tutto da "Reset filtri".</p>

<h2>Serve l'accesso per vedere la scheda completa</h2>
<p>Senza account vedi l'elenco, i generi e la categoria, ma non la scheda: biografia, galleria, tracce audio, video, formazione, requisiti tecnici e calendario sono riservati agli utenti registrati.</p>
<p>L'<a href="/register">iscrizione è gratuita</a> e richiede meno di un minuto. Se non hai ancora un account, puoi anche crearlo direttamente mentre invii la prima richiesta.</p>

<h2>Cosa guardare nella scheda</h2>
<ol>
  <li><strong>Il video, per primo.</strong> Vale più di tutto il resto: in un minuto capisci se l'energia è quella che cerchi.</li>
  <li><strong>La formazione</strong> — quante persone salgono sul palco. Cambia lo spazio necessario, il service e il compenso.</li>
  <li><strong>La durata del set</strong> — minima e massima dichiarate. Se ti serve coprire quattro ore e l'artista fa set da 60 minuti, meglio saperlo prima.</li>
  <li><strong>I requisiti tecnici</strong> — cosa serve come impianto, palco, alimentazione. Vedi <a href="/help/organizzatori/guida-rider-tecnico">la guida al rider tecnico</a>.</li>
  <li><strong>La fascia di prezzo</strong> — visibile agli organizzatori. È indicativa, non un listino.</li>
  <li><strong>Il calendario</strong> — le date già occupate, così eviti di chiedere l'impossibile.</li>
  <li><strong>Le recensioni</strong> — lasciate da altri organizzatori dopo date reali svolte tramite N'arte.</li>
</ol>

<h2>Un consiglio pratico</h2>
<p>Non fermarti al primo. Apri tre o quattro schede e confronta: profili molto simili nella descrizione possono essere lontanissimi dal vivo. E scrivi a più di un artista se la data è vicina — è normale e non è scorretto, purché tu risponda a tutti quando hai deciso.</p>

<h2>Se non sai da dove partire</h2>
<p>Se hai un'idea di serata ma non un nome, <a href="/contatti">scrivici</a> descrivendo evento, spazio, pubblico atteso e budget: il team può indirizzarti sui profili adatti. Puoi anche guardare i <a href="/format">format N'arte</a>, che sono serate già strutturate.</p>
`,
    },

    {
      slug: "richiedere-booking",
      title: "Come inviare una richiesta di booking",
      excerpt:
        "Cosa contiene il modulo, come scrivere un messaggio a cui gli artisti rispondono, e cosa succede subito dopo l'invio.",
      updatedAt: UPDATED,
      related: ["gestire-trattativa", "booking/stati-richiesta", "strutture-multiple"],
      content: `
<h2>Da dove si invia</h2>
<p>Dal calendario che trovi sulla scheda dell'artista: scegli la data e compili il modulo. Se non hai un account puoi crearlo lì, contestualmente all'invio, senza passare dalla registrazione.</p>
<p>Se il tuo account è registrato come "utente", <strong>diventa organizzatore in automatico</strong> con la prima richiesta: non devi fare nulla.</p>
<p>Un account artista non può inviare richieste ad altri artisti.</p>

<h2>Cosa contiene il modulo</h2>
<ul>
  <li><strong>Data dell'evento</strong> — obbligatoria. Le date che l'artista ha segnato occupate sono già evidenti sul calendario.</li>
  <li><strong>Fascia oraria</strong> — mattina, pomeriggio, sera o notte.</li>
  <li><strong>Budget</strong> — si sceglie una fascia, non una cifra esatta. Serve a capire subito se siete nello stesso ordine di grandezza.</li>
  <li><strong>Struttura</strong> — se ne hai già salvate, la selezioni; altrimenti indichi nome e città del locale.</li>
  <li><strong>Messaggio</strong> — obbligatorio, <strong>almeno 20 caratteri</strong>.</li>
</ul>

<h2>Il messaggio è la parte che decide</h2>
<p>Gli artisti ricevono richieste generiche di continuo e rispondono prima a quelle concrete. Un buon messaggio dice in poche righe:</p>
<ul>
  <li><strong>Che serata è</strong> — concerto, aperitivo, matrimonio, festa privata, festival.</li>
  <li><strong>Dove e in che spazio</strong> — interno o esterno, sala o piazza, capienza indicativa.</li>
  <li><strong>Quanto pubblico</strong> ti aspetti.</li>
  <li><strong>Quanto deve durare</strong> il set e a che ora si suona.</li>
  <li><strong>Cosa metti a disposizione</strong> — impianto, service, palco, backline.</li>
</ul>
<p>Cinque righe così valgono più di venti di presentazioni.</p>

<h2>Cosa succede dopo l'invio</h2>
<ol>
  <li>L'artista riceve un'email con il riepilogo della richiesta.</li>
  <li>La richiesta compare in <strong>/organizzatore/richieste</strong>, scheda "In attesa".</li>
  <li>L'artista <strong>accetta</strong> la trattativa (anche con una controproposta) oppure <strong>rifiuta</strong>. In entrambi i casi ti arriva un'email.</li>
  <li>Se accetta si apre la <strong>chat</strong>: lì si concordano i dettagli.</li>
  <li>Quando siete d'accordo, <strong>la conferma finale la dai tu</strong>.</li>
</ol>

<h2>Quanto si aspetta una risposta</h2>
<p>Di norma 24-72 ore. <strong>Non esiste una scadenza automatica</strong>: una richiesta resta aperta finché l'artista risponde o tu la annulli. Se dopo qualche giorno non hai riscontro, puoi annullarla e scrivere a un altro artista — o sollecitare, se quello è il profilo che vuoi davvero.</p>

<h2>Puoi scrivere a più artisti?</h2>
<p>Sì, e per una data vicina è la cosa sensata. L'unico accorgimento è chiudere le richieste che non ti servono più: un annullamento è più rispettoso di un silenzio.</p>
`,
    },

    {
      slug: "gestire-trattativa",
      title: "Come gestire la trattativa in chat",
      excerpt:
        "Offerte tracciate, controproposte e conferma finale: come si arriva a una data confermata senza equivoci.",
      updatedAt: UPDATED,
      related: ["prezzo-definitivo", "booking/dopo-la-conferma", "richiedere-booking"],
      content: `
<h2>Una chat per artista</h2>
<p>La conversazione la trovi in <strong>/organizzatore/chat</strong>. È <strong>una per ogni artista</strong>, non una per richiesta: se lo stesso artista lavora con te più volte, lo storico resta in un unico posto.</p>
<p>Come organizzatore <strong>non hai alcuna limitazione</strong>: puoi sempre scrivere e fare offerte. Se un artista non risponde in chat, può darsi che abbia il piano gratuito, che riceve i messaggi ma non consente di rispondere: in quel caso l'email che riceve resta il canale valido.</p>

<h2>Messaggi e allegati</h2>
<p>Puoi mandare messaggi fino a 2.000 caratteri, foto, documenti (PDF, Word, Excel, testo, ZIP) fino a <strong>25 MB</strong> e note vocali. È il posto giusto per la piantina del locale, la scheda tecnica o l'accordo che avete scritto.</p>

<h2>Le offerte</h2>
<p>Oltre ai messaggi liberi puoi inviare un'<strong>offerta</strong>: una proposta formale con <strong>data</strong>, <strong>fascia oraria</strong> e <strong>budget</strong>, più una descrizione facoltativa. L'artista la accetta o la rifiuta con un pulsante.</p>
<p>Gli stati sono <strong>In sospeso</strong>, <strong>Accettata</strong>, <strong>Rifiutata</strong> e <strong>Sostituita</strong>. Se mandi una nuova offerta, quella precedente ancora in sospeso viene sostituita in automatico: non restano mai due proposte valide insieme.</p>

<h3>Attenzione: un'offerta accettata conferma la data</h3>
<p>Se l'artista accetta la tua offerta, <strong>la data è confermata all'istante</strong>: viene bloccata sul suo calendario, compare fra le tue date confermate e partono le email. Non c'è un ulteriore passaggio di conferma.</p>
<p>Quindi manda un'offerta solo quando i termini sono quelli definitivi. Per sondare il terreno, usa un messaggio normale.</p>

<h2>L'altra strada: il pulsante "Conferma data"</h2>
<p>Se la trattativa è nata da una richiesta e l'artista ha accettato, la richiesta è <strong>in trattativa</strong>. Quando siete d'accordo vai in <strong>/organizzatore/richieste</strong>, apri la richiesta e premi <strong>"Conferma data"</strong>.</p>
<p>È un passaggio che spetta <strong>solo a te</strong>: l'artista non può confermare al posto tuo. Se avete concluso e non confermi, per lui la data resta in sospeso.</p>

<h2>Cosa cambia alla conferma</h2>
<ul>
  <li>La data viene <strong>bloccata sul calendario</strong> dell'artista: nessun altro può prenotarlo in quel giorno.</li>
  <li>Entrambi ricevete un'email di conferma.</li>
  <li>L'evento compare nel tuo <a href="/help/organizzatori/calendario-organizzatore">calendario</a>.</li>
  <li>Si sblocca il box del <a href="/help/organizzatori/prezzo-definitivo">prezzo definitivo</a>.</li>
  <li>Dopo la data potrai <a href="/help/organizzatori/lasciare-recensione">lasciare una recensione</a>.</li>
</ul>

<h2>Annullare</h2>
<p>Puoi annullare una richiesta finché è in attesa o in trattativa, con il pulsante <strong>"Annulla richiesta"</strong>. Per una data <em>già confermata</em> il percorso è diverso: vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</p>

<h2>Perché conviene tenere tutto in chat</h2>
<p>Spostare la trattativa su WhatsApp o al telefono sembra più rapido, ma se nasce un disaccordo su cosa era stato pattuito non resta nulla di consultabile. In chat resta tutto, e in caso di contestazione è la prima cosa che il team guarda.</p>
`,
    },

    {
      slug: "strutture-multiple",
      title: "Gestire le tue strutture",
      excerpt:
        "Cos'è una struttura, perché conviene registrarla e come gestirne più di una dallo stesso account.",
      updatedAt: UPDATED,
      related: ["profilo-organizzatore", "richiedere-booking", "calendario-organizzatore"],
      content: `
<h2>Cos'è una struttura</h2>
<p>È il luogo in cui organizzi: un club, un pub, un teatro, un festival, una sala, una location per eventi privati. La registri una volta e la riusi per tutte le richieste.</p>
<p>Le gestisci da <strong>/organizzatore/strutture</strong>. <strong>Non c'è limite</strong> al numero di strutture che puoi registrare.</p>

<h2>Perché conviene registrarla</h2>
<ul>
  <li><strong>Compili una volta sola.</strong> Nelle richieste selezioni la struttura invece di riscrivere nome e città ogni volta.</li>
  <li><strong>L'artista capisce dove suonerà.</strong> Vede il luogo con foto, capienza e indirizzo: una richiesta con una struttura vera dietro riceve più risposte di una con un nome generico.</li>
  <li><strong>Filtri il calendario</strong> per struttura, se ne gestisci più d'una.</li>
</ul>

<h2>Cosa puoi compilare</h2>
<p>L'unico campo obbligatorio è il <strong>nome</strong>. Tutto il resto è facoltativo, ma ogni campo compilato è una domanda in meno:</p>
<ul>
  <li><strong>Tipo</strong> — club, pub, festival, teatro, locale, privato o altro.</li>
  <li><strong>Indirizzo, città, regione e CAP</strong> — servono all'artista per valutare la trasferta.</li>
  <li><strong>Capienza</strong> — cambia la scelta della formazione e dell'impianto.</li>
  <li><strong>Descrizione</strong> — che tipo di serate fate, che pubblico avete.</li>
  <li><strong>Copertina</strong> (formato 16:9) e <strong>galleria</strong> fino a 6 foto. Le foto del palco e della sala sono le più utili.</li>
  <li><strong>Sito, Instagram, telefono ed email</strong> della struttura.</li>
</ul>

<h2>Più strutture sullo stesso account</h2>
<p>Se gestisci più locali o più rassegne, tienili separati anziché unirli: ogni struttura ha il suo indirizzo, la sua capienza e le sue foto. Quando invii una richiesta scegli a quale si riferisce, e il calendario si filtra di conseguenza.</p>

<h2>Modificare o eliminare</h2>
<p>Da <strong>/organizzatore/strutture</strong>, aprendo la struttura. La modifica è immediata. L'eliminazione si fa dalla stessa scheda: valutala con attenzione se la struttura è collegata a date già confermate.</p>

<h2>È obbligatoria?</h2>
<p>No. Puoi inviare richieste indicando semplicemente nome e città del locale. Ma se organizzi con continuità, registrarla è il primo passo che ti fa risparmiare tempo davvero.</p>
`,
    },

    {
      slug: "annullare-data",
      title: "Annullare una data confermata",
      excerpt:
        "Come si annulla, cosa comporta, quali sono le buone pratiche e perché N'arte non impone penali.",
      updatedAt: UPDATED,
      related: [
        "gestire-trattativa",
        "booking/contratto-modello",
        "policy/contestazioni",
      ],
      content: `
<h2>Prima della conferma</h2>
<p>Finché la richiesta è <strong>in attesa</strong> o <strong>in trattativa</strong>, la chiudi tu con il pulsante <strong>"Annulla richiesta"</strong> in <a href="/organizzatore/richieste">/organizzatore/richieste</a>. L'artista riceve un'email e la data resta libera. Nessuna conseguenza per nessuno.</p>

<h2>Dopo la conferma</h2>
<p>Una data <strong>confermata</strong> non si annulla con un click, e non è una svista: quella data è bloccata sul calendario dell'artista, che ha rifiutato altre proposte per tenerla libera.</p>
<p>Se devi annullare:</p>
<ol>
  <li><strong>Scrivilo subito in chat</strong> all'artista, spiegando cosa è successo. È la cosa che conta di più, e va fatta prima di tutto il resto.</li>
  <li><strong>Accordatevi</strong> su come chiudere: spostare la data, sostituire l'artista, riconoscere un rimborso spese se aveva già sostenuto costi.</li>
  <li><strong><a href="/contatti">Scrivi al team</a></strong> indicando artista e data: l'annullamento in piattaforma viene eseguito dal team, con una motivazione registrata, e libera la data sul calendario.</li>
</ol>

<h2>N'arte non impone penali</h2>
<p>Non applichiamo penali, non tratteniamo caparre e non addebitiamo nulla in caso di annullamento: <strong>il denaro dell'ingaggio non passa mai dalla piattaforma</strong>, quindi non c'è niente che possiamo trattenere.</p>
<p>Se voi due avevate concordato un acconto o una penale, quell'accordo vale fra voi ed è una questione vostra. Ragione in più per <a href="/help/booking/contratto-modello">metterlo per iscritto prima</a>.</p>

<h2>Le buone pratiche</h2>
<ul>
  <li><strong>Avvisa il prima possibile.</strong> Un mese prima è un contrattempo; tre giorni prima è un danno concreto, perché quella sera l'artista non lavorerà più.</li>
  <li><strong>Dai una ragione vera.</strong> Un locale chiuso, un evento rinviato, un imprevisto: si capiscono. Il silenzio no.</li>
  <li><strong>Proponi un'alternativa</strong>, se puoi. Spostare la data è quasi sempre meglio che annullarla.</li>
  <li><strong>Riconosci le spese già sostenute.</strong> Se l'artista aveva prenotato un viaggio o ingaggiato un service, non è un dettaglio.</li>
</ul>

<h2>Ha conseguenze sul mio account?</h2>
<p>Un annullamento isolato e comunicato bene non ha alcuna conseguenza: capita, ed è normale. Diverso è un <strong>comportamento ripetuto</strong>: annullare sistematicamente date confermate danneggia gli artisti e la credibilità della piattaforma, e il team può intervenire fino a limitare l'account. Vedi il <a href="/help/policy/codice-condotta">codice di condotta</a>.</p>

<h2>E se è l'artista ad annullare?</h2>
<p>Vale lo stesso principio, a parti invertite. Se un artista si tira indietro su una data confermata e non trovate un accordo, <a href="/contatti">segnalacelo</a>: il team interviene sulla data e valuta il comportamento.</p>
`,
    },

    {
      slug: "guida-rider-tecnico",
      title: "Cos'è il rider tecnico e perché chiederlo",
      excerpt:
        "Cosa serve davvero sul palco a seconda della formazione, cosa chiedere prima della serata e come evitare sorprese all'ultimo minuto.",
      updatedAt: UPDATED,
      related: ["trovare-artista", "booking/contratto-modello", "richiedere-booking"],
      content: `
<h2>Cos'è</h2>
<p>Il <strong>rider tecnico</strong> è l'elenco di ciò che serve all'artista per esibirsi: impianto audio, microfoni, monitor, prese di corrente, spazio sul palco. Il <strong>rider ospitalità</strong> riguarda invece camerino, pasti e viaggio.</p>
<p>Non è una pretesa: è il modo per assicurarsi che la sera funzioni. La maggior parte dei problemi dell'ultimo minuto nasce da un rider mai scambiato.</p>

<h2>Dove trovarlo su N'arte</h2>
<p>Molti artisti compilano il campo <strong>requisiti tecnici</strong> nella scheda. Se è vuoto o generico, chiedilo in chat: è una domanda normale e nessuno se la prende.</p>

<h2>Cosa serve, indicativamente</h2>
<p>Un'idea di massima per capire se lo spazio è adatto, prima ancora di scrivere.</p>

<h3>Solista o duo acustico</h3>
<p>Impianto di piccole dimensioni, 2-4 canali, un paio di microfoni, uno o due monitor, un paio di prese. Bastano pochi metri quadri. È la formazione che sta praticamente ovunque.</p>

<h3>Trio</h3>
<p>Impianto un po' più capiente, 6-8 canali, monitor separati, spazio per gli strumenti. Se c'è una batteria, servono anche i microfoni per riprenderla.</p>

<h3>Band da quattro elementi in su</h3>
<p>Impianto adeguato alla sala, banco da almeno 12 canali, più monitor, alimentazione sufficiente e uno spazio che regga tutti con gli strumenti. Per gli spazi più grandi serve quasi sempre un <strong>fonico</strong>.</p>

<h3>Dj set</h3>
<p>Console (chiedi quale: i modelli non sono intercambiabili), impianto dimensionato alla sala, tavolo stabile all'altezza giusta.</p>

<h2>Le domande da fare prima</h2>
<ul>
  <li>Quante <strong>persone</strong> salgono sul palco?</li>
  <li>Che <strong>impianto</strong> serve e chi lo fornisce: tu, l'artista o un service esterno?</li>
  <li>Serve un <strong>fonico</strong>? Lo porta l'artista?</li>
  <li>Quanti <strong>microfoni</strong> e quanti <strong>monitor</strong>?</li>
  <li>Quanta <strong>corrente</strong> e quante prese, e dove sono?</li>
  <li>Quanto tempo serve per <strong>montaggio e prove</strong>? A che ora devono arrivare?</li>
  <li>C'è un <strong>limite di volume</strong> o un orario oltre il quale non si può suonare?</li>
  <li>Serve un <strong>camerino</strong> o uno spazio dove lasciare le custodie?</li>
</ul>

<h2>Il consiglio che fa la differenza</h2>
<p>Scambiate il rider <strong>quando confermate la data</strong>, non la settimana prima. Se emerge che il tuo spazio non regge quella formazione, a un mese di distanza si trova una soluzione; a tre giorni si annulla.</p>
<p>Vale anche per il limite di volume: se il locale ha un vincolo, dillo subito. Ci sono formazioni che si adattano senza problemi e altre per cui è un ostacolo insormontabile.</p>
`,
    },

    {
      slug: "calendario-organizzatore",
      title: "Il calendario delle date confermate",
      excerpt:
        "Cosa mostra il calendario dell'organizzatore, come si popola e perché non ci sono le richieste ancora in trattativa.",
      updatedAt: UPDATED,
      related: ["gestire-trattativa", "strutture-multiple", "booking/dopo-la-conferma"],
      content: `
<h2>Cosa mostra</h2>
<p>Il calendario in <strong>/organizzatore/calendario</strong> mostra <strong>solo le date confermate</strong>. Trovi una vista mensile e l'elenco dei prossimi eventi.</p>
<p>Le richieste in attesa o in trattativa <strong>non compaiono</strong>, ed è voluto: finché una data non è confermata non è un impegno, e mescolarla alle altre darebbe un'idea sbagliata della tua programmazione. Quelle le segui da <a href="/organizzatore/richieste">/organizzatore/richieste</a>.</p>

<h2>Come si popola</h2>
<p>Da solo. Una data compare qui nel momento in cui viene confermata, che sia con il pulsante "Conferma data" o perché l'artista ha accettato una tua offerta in chat. Nello stesso istante la data viene bloccata sul calendario dell'artista.</p>

<h2>Se gestisci più strutture</h2>
<p>C'è un selettore che filtra il calendario per struttura: comodo se hai due locali con programmazioni distinte. Vedi <a href="/help/organizzatori/strutture-multiple">gestire le tue strutture</a>.</p>

<h2>È un calendario in sola lettura</h2>
<p>Non puoi aggiungere manualmente una data né modificarne una esistente: il calendario riflette lo stato delle richieste, non è un'agenda indipendente. Le disponibilità sono invece gestite dagli artisti sul proprio calendario.</p>
<p>Per togliere una data confermata serve un annullamento: vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>.</p>

<h2>Dopo la serata</h2>
<p>Le date passate restano in archivio e sono la base per le <a href="/help/organizzatori/lasciare-recensione">recensioni</a>: puoi valutare un artista solo dopo che la data è trascorsa.</p>
`,
    },

    {
      slug: "lasciare-recensione",
      title: "Lasciare una recensione all'artista",
      excerpt:
        "Quando si sblocca, cosa scrivere perché sia utile e cosa succede alla recensione una volta pubblicata.",
      updatedAt: UPDATED,
      related: [
        "calendario-organizzatore",
        "artisti/recensioni-ricevute",
        "policy/codice-condotta",
      ],
      content: `
<h2>Quando puoi recensire</h2>
<p>Servono due condizioni: la data dev'essere stata <strong>confermata su N'arte</strong> e dev'essere <strong>già passata</strong>. Prima non è possibile, e non per un limite tecnico: una valutazione scritta prima della serata non varrebbe nulla.</p>
<p>Le date recensibili compaiono in <strong>/organizzatore/feedback</strong>, nella sezione "Da recensire". Puoi lasciare <strong>una sola recensione per evento</strong>.</p>

<h2>Cosa contiene</h2>
<p>Un voto da <strong>1 a 5 stelle</strong> e un commento scritto obbligatorio.</p>

<h2>Dove finisce</h2>
<p>Sul <strong>profilo pubblico dell'artista</strong>, con il tuo nome, insieme alla media e al numero di recensioni. È visibile a tutti gli altri organizzatori.</p>

<h2>Come scriverne una utile</h2>
<p>Le recensioni generiche non aiutano nessuno. Quelle che servono davvero rispondono alle domande che si fa il prossimo organizzatore:</p>
<ul>
  <li><strong>È arrivato in orario</strong> ed era pronto quando doveva?</li>
  <li><strong>Come ha reagito il pubblico?</strong> È il dato che conta più di tutti.</li>
  <li><strong>Era adatto al contesto</strong> — volume, repertorio, durata?</li>
  <li><strong>Com'è stato lavorarci</strong> prima e durante: comunicazione, flessibilità, professionalità.</li>
  <li>Ci sono stati <strong>imprevisti</strong>, e come sono stati gestiti?</li>
</ul>
<p>Tre righe concrete valgono più di un paragrafo di complimenti.</p>

<h2>Se la serata è andata male</h2>
<p>Una recensione negativa è legittima, e il sistema serve anche a quello. Due accortezze:</p>
<ul>
  <li><strong>Attieniti ai fatti</strong>: cosa è successo, non giudizi sulla persona.</li>
  <li><strong>Parlane prima con l'artista</strong>, in chat. A volte c'è una spiegazione, o rimedia.</li>
</ul>
<p>Le recensioni offensive o riferite a fatti estranei alla serata possono essere <strong>nascoste dal team</strong>. Vedi il <a href="/help/policy/codice-condotta">codice di condotta</a>.</p>

<h2>Posso modificarla o cancellarla?</h2>
<p>Non dalla tua area. Se hai commesso un errore o vuoi ritirarla, <a href="/contatti">scrivi al team</a>.</p>

<h2>L'artista può rispondere?</h2>
<p>L'artista vede tutte le recensioni ricevute. Se ritiene che una sia ingiusta può segnalarla al team, che valuta se nasconderla: una recensione nascosta non compare più e non pesa sulla media.</p>
`,
    },

    {
      slug: "prezzo-definitivo",
      title: "Il prezzo definitivo di una data",
      excerpt:
        "A cosa serve registrare il compenso pattuito, come funziona la doppia conferma e perché non è un pagamento.",
      updatedAt: UPDATED,
      related: [
        "gestire-trattativa",
        "pagamenti/modalita-pagamento",
        "booking/contratto-modello",
      ],
      content: `
<h2>Cos'è</h2>
<p>Sulle date <strong>confermate</strong> compare un riquadro in cui registrare il <strong>compenso realmente pattuito</strong>. È visibile a entrambe le parti, artista e organizzatore.</p>
<p>Serve perché il budget indicato nella richiesta iniziale è quasi sempre una fascia indicativa, e durante la trattativa cambia. Il prezzo definitivo mette per iscritto il numero su cui vi siete accordati.</p>

<h2>Come funziona la doppia conferma</h2>
<ol>
  <li>Una delle due parti preme <strong>"Inserisci prezzo"</strong> e scrive la cifra concordata.</li>
  <li>L'altra vede la proposta e preme <strong>"Conferma"</strong>.</li>
  <li>Da quel momento il prezzo risulta <strong>confermato da entrambi</strong>.</li>
</ol>
<p><strong>Non puoi confermare la tua stessa proposta</strong>: serve per forza l'assenso dell'altro. È tutto il senso della funzione.</p>
<p>Il valore si può modificare o azzerare in seguito, se cambiano gli accordi.</p>

<h2>Cosa NON è</h2>
<p>Va detto chiaramente per evitare fraintendimenti: <strong>non è un pagamento</strong>. Registrare il prezzo non trasferisce denaro, non attiva un addebito e non costituisce una garanzia.</p>
<p>Il compenso viene pagato direttamente dall'organizzatore all'artista, fuori dalla piattaforma, nei modi che avete concordato. N'arte non incassa e non intermedia nulla: vedi <a href="/help/pagamenti/modalita-pagamento">come viene pagato il compenso</a>.</p>

<h2>Perché usarlo comunque</h2>
<p>Perché è una <strong>traccia condivisa e datata</strong> di quanto era stato pattuito, che nessuna delle due parti può modificare da sola. Se mesi dopo nasce un disaccordo sulla cifra, è lì. Costa dieci secondi e toglie di mezzo la discussione più sgradevole che ci sia.</p>
<p>Vale la pena compilarlo insieme al resto degli accordi: vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>
`,
    },

    {
      slug: "profilo-organizzatore",
      title: "Il tuo profilo di organizzatore",
      excerpt:
        "Cosa vedono gli artisti quando ricevono una tua richiesta, e perché un profilo completo fa arrivare più risposte.",
      updatedAt: UPDATED,
      related: ["strutture-multiple", "richiedere-booking", "account/preferiti"],
      content: `
<h2>Dove si compila</h2>
<p>In <strong>/organizzatore/profilo</strong>. Il sottotitolo della pagina dice esattamente a cosa serve: sono le informazioni che gli artisti vedono quando ricevono una tua richiesta.</p>

<h2>I campi</h2>
<ul>
  <li><strong>Foto profilo</strong> — il logo del locale o la tua foto.</li>
  <li><strong>Nome visualizzato</strong> — obbligatorio. Il nome con cui ti riconoscono.</li>
  <li><strong>Tipo di organizzatore</strong> — brand oppure persona. Cambia solo l'etichetta della descrizione, ma aiuta l'artista a inquadrarti.</li>
  <li><strong>Bio</strong> — che serate organizzi, da quanto, con che pubblico.</li>
  <li><strong>Telefono</strong>, <strong>sito</strong> e <strong>Instagram</strong>.</li>
</ul>

<h2>Perché conviene compilarlo</h2>
<p>Un artista che riceve una richiesta da un profilo vuoto, senza foto né descrizione, non sa se dall'altra parte c'è un locale serio o qualcuno che scrive a caso. Nel dubbio risponde prima a chi si è presentato.</p>
<p>Bastano una foto, tre righe di descrizione e un link a Instagram per cambiare completamente l'impressione. È il ritorno più alto per il tempo speso di tutta la piattaforma.</p>

<h2>L'indicatore "Profilo completo"</h2>
<p>In fondo alla barra laterale c'è un contatore su cinque voci: <strong>foto profilo</strong>, <strong>bio</strong>, <strong>telefono</strong>, <strong>sito o Instagram</strong> e <strong>almeno una struttura</strong>. Sono le cinque cose che rendono credibile una richiesta.</p>

<h2>Cosa gli artisti non vedono</h2>
<p>Vedono il tuo profilo e i dati della struttura che colleghi alla richiesta. Le informazioni del tuo account restano riservate secondo quanto descritto nell'<a href="/privacy">informativa privacy</a>.</p>

<h2>E le strutture?</h2>
<p>Sono una cosa diversa dal profilo: il profilo sei tu, le strutture sono i luoghi. Vedi <a href="/help/organizzatori/strutture-multiple">gestire le tue strutture</a>.</p>
`,
    },
  ],
};
