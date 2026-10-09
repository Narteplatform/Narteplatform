import type { HelpCategory } from "@/lib/help/types";
import { PLAN_LABELS, PLAN_PRICES_CENTS, formatPrice } from "@/lib/billing/plans";

const UPDATED = "2026-10-09";

export const PAGAMENTI: HelpCategory = {
  slug: "pagamenti",
  title: "Pagamenti e fatturazione",
  description:
    "Come viene pagato il compenso di una serata, chi si occupa di cosa e l'unica somma che N'arte incassa.",
  icon: "credit-card",
  audience: "all",
  articles: [
    {
      slug: "modalita-pagamento",
      title: "Come viene pagato il compenso",
      excerpt:
        "Il denaro dell'ingaggio non passa da N'arte: cosa significa in pratica per artisti e organizzatori.",
      updatedAt: UPDATED,
      related: ["acconto-saldo", "fattura-artista", "abbonamento-artista"],
      content: `
<h2>Il principio</h2>
<p><strong>Il compenso di una serata si concorda e si regola direttamente fra artista e organizzatore.</strong> N'arte non lo incassa, non lo anticipa, non lo custodisce e non ne trattiene alcuna percentuale.</p>

<h2>Cosa significa in pratica</h2>
<p>In concreto:</p>
<ul>
  <li><strong>Il denaro non passa mai dalla piattaforma.</strong> Non c'è un portafoglio, né un saldo da prelevare o tempi di accredito.</li>
  <li><strong>Il modo di pagare lo scegliete voi</strong>: bonifico, contanti la sera stessa o quello che preferite. N'arte non impone né esclude nulla.</li>
  <li><strong>Non tratteniamo commissioni.</strong> Quello che avete pattuito passa di mano per intero.</li>
  <li><strong>N'arte non è parte del contratto</strong> fra voi due, quindi non può garantire il pagamento né obbligare qualcuno a effettuarlo.</li>
</ul>

<h2>Perché è organizzato così</h2>
<p>Intermediare i pagamenti vorrebbe dire custodire denaro altrui, gestire rimborsi e contestazioni economiche e applicare commissioni per sostenere il servizio. Abbiamo scelto di non farlo: N'arte mette in contatto e si ferma lì. Per l'artista il vantaggio è che il cachet resta intero.</p>

<h2>Cosa fa comunque la piattaforma</h2>
<p>Non gestisce il denaro, ma tiene traccia di quello che avete deciso:</p>
<ul>
  <li>La <strong>chat</strong> (disponibile con gli artisti Pro o Max) conserva quello che vi siete scritti, e potete consultarla entrambi.</li>
  <li>Il <a href="/help/organizzatori/prezzo-definitivo"><strong>compenso concordato – promemoria</strong></a> annota il compenso pattuito con la conferma di entrambe le parti. Non è un pagamento e N'arte non ne è parte. Una proposta non ancora confermata si può ritirare; un importo confermato da entrambi, invece, non si cancella da soli: si può solo proporre un nuovo importo, che l'altra parte deve confermare.</li>
</ul>

<h2>Cosa concordare prima</h2>
<p>Prima della serata mettetevi d'accordo almeno su <strong>cifra</strong>, <strong>quando</strong> viene pagata, <strong>come</strong>, se è per il gruppo o a persona e se il rimborso viaggio è compreso. La lista completa è in <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>E se non vengo pagato?</h2>
<p>Siccome non siamo parte dell'accordo, non possiamo intervenire sul pagamento né recuperare somme per conto di nessuno. Possiamo però <strong>leggere la conversazione</strong> e valutare il comportamento di chi usa la piattaforma, fino a limitarne l'account. Anche per questo conviene trattare in chat e non altrove: vedi <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>

<h2>L'unica somma che incassiamo</h2>
<p>L'<a href="/help/pagamenti/abbonamento-artista">abbonamento degli artisti</a>, che è facoltativo. Nient'altro.</p>
`,
    },

    {
      slug: "fattura-artista",
      title: "Chi emette la fattura?",
      excerpt:
        "Gli adempimenti fiscali di una serata riguardano artista e organizzatore. Cosa possiamo dirti e a chi rivolgerti.",
      updatedAt: UPDATED,
      related: ["modalita-pagamento", "siae", "booking/contratto-modello"],
      content: `
<h2>La risposta breve</h2>
<p>La questione riguarda <strong>l'artista e l'organizzatore</strong>. <strong>N'arte non è parte del contratto</strong> di esibizione, non incassa il compenso e <strong>non emette alcun documento fiscale per la serata</strong>.</p>
<p>L'unico documento che riceverai da noi è la ricevuta dell'<a href="/help/pagamenti/abbonamento-artista">abbonamento</a>, se hai un piano a pagamento.</p>

<h2>Perché non entriamo nel merito</h2>
<p>Il modo corretto di inquadrare un compenso dipende dalla tua posizione fiscale, dal tuo regime, dalla natura dell'esibizione e da altri elementi che cambiano da persona a persona e nel tempo.</p>
<p>Indicazioni generiche su questo tema sarebbero facili da dare ma rischiose: potresti seguire un consiglio pensato per un caso diverso dal tuo. <strong>Rivolgiti al tuo commercialista</strong> o a un consulente fiscale, che è l'unico in grado di darti una risposta valida per la tua situazione.</p>

<h2>Cosa conviene fare in ogni caso</h2>
<ul>
  <li><strong>Parlarne prima della serata</strong>, non dopo. Il momento giusto è quando concordate il compenso.</li>
  <li><strong>Mettere per iscritto</strong> in chat cosa avete stabilito su questo punto, insieme al resto: vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</li>
  <li><strong>Chiarire se la cifra pattuita è al lordo o al netto</strong> di eventuali trattenute. È l'equivoco più frequente, e basta una domanda per evitarlo.</li>
  <li><strong>Scambiarsi in anticipo i dati</strong> che servono per l'eventuale documento, così la sera non si perde tempo.</li>
</ul>

<h2>Per gli organizzatori</h2>
<p>Se hai bisogno di un documento per la tua contabilità, chiedilo <strong>prima di confermare</strong> la data: l'artista potrebbe non essere in grado di emetterlo nella forma che ti serve, e conviene saperlo per tempo anziché la sera stessa.</p>

<h2>E la SIAE?</h2>
<p>È una questione diversa dalla fattura e va gestita a parte: vedi <a href="/help/pagamenti/siae">chi si occupa della SIAE</a>.</p>
`,
    },

    {
      slug: "siae",
      title: "Chi si occupa della SIAE?",
      excerpt:
        "Gli adempimenti sui diritti d'autore per un evento con musica dal vivo: di chi sono, quando cambia e cosa concordare prima.",
      updatedAt: UPDATED,
      related: ["fattura-artista", "booking/contratto-modello", "organizzatori/guida-rider-tecnico"],
      content: `
<h2>Prima di tutto: non è N'arte</h2>
<p><strong>N'arte non si occupa degli adempimenti SIAE</strong> e non li gestisce per conto di nessuno. Non siamo noi a organizzare la tua serata: mettiamo in contatto artista e organizzatore, e gli obblighi legati all'evento restano a carico di chi lo organizza e di chi si esibisce.</p>
<p>Fanno eccezione gli eventi organizzati direttamente da N'arte, dove l'organizzatore siamo noi, come per qualunque altro promotore.</p>

<h2>Di che si tratta</h2>
<p>Quando in un evento si esegue musica tutelata, sono dovuti i diritti d'autore. In pratica servono due cose: il <strong>permesso</strong> prima dell'evento e il <strong>borderò</strong>, cioè l'elenco dei brani eseguiti, che permette di ripartire i compensi fra gli autori.</p>

<h2>Il caso normale: se ne occupa l'organizzatore</h2>
<p>Di solito è <strong>chi organizza l'evento</strong> (il locale, il festival, chi apre le porte al pubblico) a occuparsi del permesso e del relativo pagamento, perché è chi ha il rapporto con lo spazio e con il pubblico.</p>
<p>Molti locali che programmano musica dal vivo con regolarità hanno già un accordo attivo e per la singola serata non devono fare nulla di particolare.</p>
<p>All'<strong>artista</strong> in genere si chiede di fornire la <strong>scaletta dei brani eseguiti</strong>, con titoli e autori. È poco, ma senza questo elenco i compensi non arrivano a chi ha scritto i pezzi.</p>

<h2>Quando invece se ne occupa l'artista</h2>
<p>In alcune situazioni l'onere è di chi suona, oppure va concordato caso per caso:</p>
<ul>
  <li><strong>Serate autoprodotte</strong>, in cui è l'artista a organizzare e a incassare gli ingressi: in quel caso l'organizzatore è lui.</li>
  <li><strong>Spazi che affittano la sala</strong> senza figurare come organizzatori dell'evento.</li>
  <li><strong>Eventi in luoghi non convenzionali</strong>, come una piazza o uno spazio privato aperto al pubblico, dove non c'è un accordo già in essere.</li>
</ul>
<p>In questi casi stabilite esplicitamente chi se ne occupa, senza darlo per scontato.</p>

<h2>Un consiglio pratico</h2>
<p><strong>Parlatene quando confermate la data</strong>, non la settimana prima. Basta una domanda: <em>"della SIAE chi se ne occupa?"</em>. Se nessuno dei due ha una risposta pronta, conviene chiarirlo per iscritto.</p>
<p>Aggiungetelo alla lista degli accordi: vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>Per i casi specifici</h2>
<p>Regole, importi ed esenzioni dipendono dal tipo di evento, dal luogo, dalla capienza e dal repertorio (brani di altri o composizioni proprie). Per il tuo caso concreto rivolgiti direttamente alla SIAE o all'ente di gestione collettiva di riferimento, oppure a un consulente: <strong>noi non possiamo darti una risposta valida per la tua situazione</strong>.</p>
`,
    },

    {
      slug: "acconto-saldo",
      title: "Acconto e saldo: mettersi d'accordo prima",
      excerpt:
        "Come strutturare il pagamento di una serata in modo che entrambe le parti siano tranquille.",
      updatedAt: UPDATED,
      related: ["modalita-pagamento", "booking/contratto-modello", "organizzatori/annullare-data"],
      content: `
<h2>Premessa</h2>
<p>N'arte non gestisce acconti, non trattiene caparre e non fa da garante: <strong>il denaro non passa dalla piattaforma</strong>. Quelle che seguono sono buone pratiche fra le parti, non regole della piattaforma né consulenza legale.</p>

<h2>Perché se ne parla</h2>
<p>Le due parti hanno preoccupazioni opposte, ed entrambe legittime. L'artista teme di tenere libera una data, dire no ad altre proposte e restare senza serata all'ultimo momento. L'organizzatore teme di pagare in anticipo qualcuno che poi non si presenta.</p>
<p>Nessuna soluzione elimina entrambi i rischi, ma si possono distribuire in modo che nessuno dei due ne porti tutto il peso.</p>

<h2>Le formule più diffuse</h2>
<ul>
  <li><strong>Saldo unico</strong> a fine serata: è la formula più comune per le date ravvicinate e per chi ha già lavorato insieme.</li>
  <li><strong>Acconto e saldo</strong>: una quota alla conferma e il resto la sera. Conviene quando la data è lontana o l'importo è alto.</li>
  <li><strong>Pagamento a giorni</strong>, tipico dei locali con procedure amministrative. Si può accettare purché il termine sia <strong>scritto e definito</strong>: "a fine mese" va bene, "appena posso" no.</li>
</ul>
<p>Nessuna è più corretta delle altre: l'importante è che sia concordata.</p>

<h2>Quando ha senso un acconto</h2>
<ul>
  <li>La data è <strong>lontana nel tempo</strong> e l'artista deve tenerla bloccata.</li>
  <li>L'artista sostiene <strong>costi in anticipo</strong>: viaggio, alloggio, service, musicisti aggiuntivi.</li>
  <li>Si tratta di una <strong>formazione numerosa</strong>, dove l'impegno economico è alto.</li>
  <li>Le parti <strong>non si conoscono</strong> e non hanno lavorato insieme prima.</li>
</ul>

<h2>Cosa mettere nero su bianco</h2>
<p>Se prevedete un acconto, scrivete in chat:</p>
<ul>
  <li><strong>Quanto</strong> — importo o percentuale.</li>
  <li><strong>Entro quando</strong> viene versato.</li>
  <li><strong>Cosa succede se la data salta</strong>, e per colpa di chi: l'acconto si restituisce, si trattiene o si sposta sulla nuova data?</li>
  <li><strong>Quando</strong> e <strong>come</strong> viene pagato il saldo.</li>
</ul>
<p>Il terzo punto evita le discussioni peggiori, eppure quasi nessuno lo mette per iscritto.</p>

<h2>Il modo più semplice di tutelarsi</h2>
<p>Più dell'acconto, conta <strong>scrivere tutto in chat</strong>: la conversazione resta tracciata, consultabile da entrambi e non si può modificare a posteriori. Annotate anche il <a href="/help/organizzatori/prezzo-definitivo">compenso concordato – promemoria</a>, che richiede la conferma di entrambe le parti.</p>
<p>Un messaggio di riepilogo dopo la conferma vale più di qualunque accordo a voce.</p>

<h2>Se la data salta</h2>
<p>Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>. N'arte non applica penali e non trattiene somme: quello che avete concordato vale fra voi.</p>
`,
    },

    {
      slug: "abbonamento-artista",
      title: "L'abbonamento artista: pagamento, fatture e disdetta",
      excerpt:
        "L'unica somma che N'arte incassa: come si sottoscrive, dove si trovano le fatture, come si cambia piano e come si disdice.",
      updatedAt: UPDATED,
      related: ["artisti/tier-pro-max", "modalita-pagamento", "artisti/profili-multipli"],
      content: `
<h2>L'unica cosa che paghi a N'arte</h2>
<p>L'abbonamento artista è facoltativo e <strong>indipendente dalle date che fai</strong>: non è una commissione sui tuoi ingaggi, ed è l'unica somma che la piattaforma incassa.</p>
<p>Per il pubblico, gli utenti registrati e gli organizzatori <strong>non c'è alcun abbonamento</strong>: è tutto gratuito.</p>

<h2>Il listino</h2>
<ul>
  <li><strong>${PLAN_LABELS.free}</strong> — gratuito, non scade, non richiede carta.</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — ${formatPrice(PLAN_PRICES_CENTS.pro.month)} al mese o ${formatPrice(PLAN_PRICES_CENTS.pro.year)} all'anno.</li>
  <li><strong>${PLAN_LABELS.max}</strong> — ${formatPrice(PLAN_PRICES_CENTS.max.month)} al mese o ${formatPrice(PLAN_PRICES_CENTS.max.year)} all'anno.</li>
</ul>
<p>Cosa include ciascun piano è spiegato in <a href="/help/artisti/tier-pro-max">differenze tra i piani</a> e su <a href="/prezzi">/prezzi</a>.</p>

<h2>L'abbonamento è dell'account</h2>
<p>Vale per l'account e non per il singolo profilo artista: se gestisci più progetti <strong>paghi una volta sola</strong> e ogni profilo eredita i vantaggi del piano. Vedi <a href="/help/artisti/profili-multipli">gestire più profili artista</a>.</p>

<h2>Come si sottoscrive</h2>
<p>Da <strong>/dashboard/abbonamento</strong> scegli piano e periodicità, poi vieni portato sulla pagina di pagamento sicura di <strong>Stripe</strong>, dove puoi inserire anche un eventuale codice promozionale.</p>
<p>I dati della carta <strong>non passano mai dai nostri sistemi</strong>: li gestisce direttamente Stripe e noi non li vediamo.</p>
<p>Dopo il pagamento l'attivazione richiede qualche secondo. Se la pagina mostra ancora il vecchio piano, ricaricala dopo un momento e non ripetere il pagamento.</p>

<h2>Non c'è un periodo di prova</h2>
<p>Non esiste una prova a tempo. Puoi però usare il piano ${PLAN_LABELS.free}, gratuito e senza scadenza, per tutto il tempo che vuoi e passare a pagamento solo quando ti serve.</p>

<h2>Cambiare piano, carta o disdire</h2>
<p>Si fa tutto dallo stesso posto: il pulsante <strong>"Gestisci fatturazione"</strong> in /dashboard/abbonamento, che apre il portale Stripe. Da lì puoi:</p>
<ul>
  <li><strong>Cambiare piano</strong>, in su o in giù, e passare da mensile ad annuale.</li>
  <li><strong>Aggiornare la carta</strong>.</li>
  <li><strong>Scaricare fatture e ricevute</strong>.</li>
  <li><strong>Disdire</strong>.</li>
</ul>
<p>Se hai già un abbonamento attivo, il cambio di piano si fa <strong>solo da qui</strong>: un nuovo pagamento verrebbe rifiutato.</p>

<h2>Dove sono le fatture</h2>
<p>Nel portale Stripe, sotto "Gestisci fatturazione", dove trovi lo storico completo e i documenti da scaricare.</p>
<p>Tieni presente che <strong>non riceverai un'email da N'arte</strong> a ogni rinnovo: le comunicazioni di pagamento arrivano da Stripe e lo stato del piano è sempre visibile nella tua area.</p>

<h2>Cosa succede quando disdici</h2>
<p>L'abbonamento <strong>resta attivo fino alla fine del periodo già pagato</strong>, quindi non perdi i giorni versati; la data di scadenza è indicata nella tua area.</p>
<p>Dopo, il profilo torna al piano ${PLAN_LABELS.free}: <strong>resta online</strong> e le richieste continuano ad arrivare, ma perdi chat, recensioni visibili, badge e posizione prioritaria.</p>
<p><strong>Nessun contenuto viene cancellato.</strong> Foto, video e profili in eccesso smettono di essere pubblici ma restano nella tua area, e ricompaiono se risali di piano.</p>

<h2>Se un pagamento non va a buon fine</h2>
<p>Mentre Stripe riprova l'addebito il piano <strong>resta attivo</strong>. Nella tua area compare un avviso: aggiorna la carta dal portale per non perdere le funzioni.</p>

<h2>Il badge "Omaggio"</h2>
<p>Se vedi questa etichetta, il piano ti è stato assegnato dal team N'arte: <strong>non ha scadenza e non prevede alcun addebito</strong>. Non devi fare nulla.</p>

<h2>Ho diritto al ripensamento?</h2>
<p>I termini d'uso richiamano il diritto di recesso previsto dal Codice del consumo per chi sottoscrive in qualità di consumatore. Per una richiesta concreta <a href="/contatti">scrivici</a> e consulta anche i <a href="/termini">termini d'uso</a>.</p>
`,
    },
  ],
};
