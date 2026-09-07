import type { HelpCategory } from "@/lib/help/types";
import { PLAN_LABELS, PLAN_PRICES_CENTS, formatPrice } from "@/lib/billing/plans";

const UPDATED = "2026-09-07";

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
<h2>Il principio, in una riga</h2>
<p><strong>Il compenso di una serata si concorda e si regola direttamente fra artista e organizzatore.</strong> N'arte non lo incassa, non lo anticipa, non lo trattiene e non trattiene alcuna percentuale.</p>

<h2>Cosa comporta davvero</h2>
<p>Non è una formula: cambia concretamente come funzionano le cose.</p>
<ul>
  <li><strong>Il denaro non transita mai dalla piattaforma.</strong> Non c'è un portafoglio, non c'è un saldo da prelevare, non ci sono tempi di accredito.</li>
  <li><strong>Il modo di pagare lo scegliete voi</strong>: bonifico, contanti la sera stessa, quello che concordate. N'arte non impone né esclude nulla.</li>
  <li><strong>Non tratteniamo commissioni.</strong> Quello che avete pattuito è quello che passa di mano, per intero.</li>
  <li><strong>N'arte non è parte del contratto</strong> fra voi due e non può garantire il pagamento né obbligare nessuno a effettuarlo.</li>
</ul>

<h2>Perché è organizzato così</h2>
<p>Perché intermediare i pagamenti significherebbe trattenere denaro altrui, gestire rimborsi e contestazioni economiche e applicare commissioni per sostenere il servizio. Abbiamo scelto di non farlo: N'arte mette in contatto e si ferma lì. Il vantaggio, per l'artista, è che il cachet resta intero.</p>

<h2>Cosa fa comunque la piattaforma</h2>
<p>Non gestisce il denaro, ma lascia una traccia di ciò che avete deciso:</p>
<ul>
  <li>La <strong>chat</strong> conserva tutta la trattativa, consultabile da entrambi.</li>
  <li>Il <a href="/help/organizzatori/prezzo-definitivo"><strong>prezzo definitivo</strong></a> registra il compenso pattuito con la conferma di entrambe le parti. Non è un pagamento: è una traccia condivisa che nessuno può modificare da solo.</li>
</ul>

<h2>Cosa concordare prima</h2>
<p>Prima della serata mettetevi d'accordo almeno su <strong>cifra</strong>, <strong>quando</strong> viene pagata, <strong>come</strong>, se è per il gruppo o a persona, e se il rimborso viaggio è compreso. La lista completa è in <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>E se non vengo pagato?</h2>
<p>Essendo estranei all'accordo, non possiamo intervenire sul pagamento né recuperare somme per conto di nessuno. Quello che possiamo fare è <strong>leggere la conversazione</strong> e valutare il comportamento di chi usa la piattaforma, fino a limitarne l'account. È il motivo per cui conviene trattare in chat e non altrove: vedi <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>

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
<p>Preferiamo essere schietti: la forma corretta con cui inquadrare un compenso dipende dalla tua posizione fiscale, dal tuo regime, dalla natura dell'esibizione e da altri elementi che cambiano da persona a persona e nel tempo.</p>
<p>Dare indicazioni generiche su questo argomento sarebbe facile e potenzialmente dannoso: rischieresti di seguire un consiglio scritto per un caso che non è il tuo. <strong>Rivolgiti al tuo commercialista</strong> o a un consulente fiscale: è l'unico modo di avere una risposta valida per la tua situazione.</p>

<h2>Cosa conviene fare in ogni caso</h2>
<ul>
  <li><strong>Parlarne prima della serata</strong>, non dopo. Il momento giusto è quando concordate il compenso.</li>
  <li><strong>Mettere per iscritto</strong> in chat cosa avete stabilito su questo punto, insieme al resto: vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</li>
  <li><strong>Chiarire se la cifra pattuita è al lordo o al netto</strong> di eventuali trattenute. È l'equivoco più frequente in assoluto, e si risolve con una domanda.</li>
  <li><strong>Scambiarsi in anticipo i dati</strong> che servono per emettere l'eventuale documento, così la sera non si perde tempo.</li>
</ul>

<h2>Per gli organizzatori</h2>
<p>Se hai bisogno di un documento per la tua contabilità, chiedilo <strong>prima di confermare</strong> la data: un artista potrebbe non essere in condizione di emetterlo nella forma che ti serve, ed è meglio scoprirlo per tempo che la sera stessa.</p>

<h2>E la SIAE?</h2>
<p>È una cosa diversa dalla fattura e va gestita a parte: vedi <a href="/help/pagamenti/siae">chi si occupa della SIAE</a>.</p>
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
<p><strong>N'arte non si occupa degli adempimenti SIAE</strong> e non li gestisce per conto di nessuno. Non organizziamo noi la tua serata: mettiamo in contatto artista e organizzatore, e gli obblighi legati all'evento restano di chi lo organizza e di chi vi si esibisce.</p>
<p>Fanno eccezione gli eventi che N'arte organizza direttamente, dove il ruolo di organizzatore è nostro come per qualunque altro promotore.</p>

<h2>Di che si tratta</h2>
<p>Quando in un evento viene eseguita musica tutelata, sono dovuti i diritti d'autore. In pratica servono due cose: il <strong>permesso</strong> prima dell'evento e il <strong>borderò</strong>, cioè l'elenco dei brani eseguiti, che permette di ripartire i compensi fra gli autori.</p>

<h2>Il caso normale: se ne occupa l'organizzatore</h2>
<p>Nella prassi più diffusa è <strong>chi organizza l'evento</strong> — il locale, il festival, chi apre le porte al pubblico — a occuparsi del permesso e del relativo pagamento. È la parte che ha il rapporto con lo spazio e con il pubblico.</p>
<p>Molti locali che programmano musica dal vivo con continuità hanno già un accordo in essere e non devono fare nulla di specifico per la singola serata.</p>
<p>All'<strong>artista</strong> in genere si chiede di fornire la <strong>scaletta dei brani eseguiti</strong>, con titoli e autori. È un contributo piccolo ma necessario: senza, i compensi non arrivano a chi ha scritto i pezzi.</p>

<h2>Quando invece se ne occupa l'artista</h2>
<p>Ci sono situazioni in cui l'onere è di chi suona, o va concordato caso per caso:</p>
<ul>
  <li><strong>Serate autoprodotte</strong>, in cui è l'artista a organizzare e a incassare gli ingressi: lì l'organizzatore è lui.</li>
  <li><strong>Spazi che affittano la sala</strong> senza figurare come organizzatori dell'evento.</li>
  <li><strong>Eventi in luoghi non convenzionali</strong> — una piazza, uno spazio privato aperto al pubblico — dove non esiste un accordo preesistente.</li>
</ul>
<p>In questi casi va stabilito esplicitamente chi se ne occupa: non darlo per scontato.</p>

<h2>La regola pratica</h2>
<p><strong>Chiedetevelo quando confermate la data</strong>, non la settimana prima. Una domanda sola: <em>"della SIAE chi se ne occupa?"</em>. Se la risposta non è immediata da entrambe le parti, è esattamente il caso in cui conviene chiarirlo per iscritto.</p>
<p>Mettetelo nella lista degli accordi: vedi <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>Per i casi specifici</h2>
<p>Le regole, gli importi e le esenzioni dipendono dal tipo di evento, dal luogo, dalla capienza e dalla natura del repertorio — brani di altri o composizioni proprie. Per il tuo caso concreto rivolgiti direttamente alla SIAE o al collecting di riferimento, oppure a un consulente: <strong>noi non possiamo darti una risposta valida per la tua situazione</strong>.</p>
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
<p>N'arte non gestisce acconti, non trattiene caparre e non fa da garante: <strong>il denaro non passa dalla piattaforma</strong>. Quanto segue sono buone pratiche fra le parti, non regole della piattaforma né consulenza legale.</p>

<h2>Perché se ne parla</h2>
<p>Le due parti hanno preoccupazioni opposte e legittime. L'artista teme di tenere libera una data, rifiutare altre proposte e ritrovarsi senza serata all'ultimo. L'organizzatore teme di pagare in anticipo qualcuno che poi non si presenta.</p>
<p>Non esiste una soluzione che elimini entrambi i rischi. Esiste però un modo di distribuirli in modo che nessuno dei due porti tutto il peso.</p>

<h2>Le formule più diffuse</h2>
<ul>
  <li><strong>Saldo unico</strong> alla fine della serata. È la formula più comune per le date ravvicinate e per chi ha già lavorato insieme.</li>
  <li><strong>Acconto e saldo</strong>: una quota alla conferma, il resto la sera. Ha senso quando la data è lontana o l'importo rilevante.</li>
  <li><strong>Pagamento a giorni</strong>, tipico dei locali con procedure amministrative. È accettabile purché il termine sia <strong>scritto e definito</strong>: "a fine mese" va bene, "appena posso" no.</li>
</ul>
<p>Nessuna è più corretta delle altre. Quella sbagliata è solo quella non concordata.</p>

<h2>Quando ha senso un acconto</h2>
<ul>
  <li>La data è <strong>lontana nel tempo</strong> e l'artista deve tenerla bloccata.</li>
  <li>L'artista sostiene <strong>costi in anticipo</strong>: viaggio, alloggio, service, musicisti aggiuntivi.</li>
  <li>Si tratta di una <strong>formazione numerosa</strong>, dove l'impegno economico è alto.</li>
  <li>Le parti <strong>non si conoscono</strong> e non hanno storico.</li>
</ul>

<h2>Cosa mettere nero su bianco</h2>
<p>Se prevedete un acconto, scrivete in chat:</p>
<ul>
  <li><strong>Quanto</strong> — importo o percentuale.</li>
  <li><strong>Entro quando</strong> viene versato.</li>
  <li><strong>Cosa succede se salta la data</strong>, e per colpa di chi: si restituisce, si trattiene, si sposta sulla nuova data?</li>
  <li><strong>Quando</strong> e <strong>come</strong> viene pagato il saldo.</li>
</ul>
<p>È il terzo punto quello che evita le discussioni peggiori, ed è anche quello che quasi nessuno scrive.</p>

<h2>Il modo più semplice di tutelarsi</h2>
<p>Non è l'acconto: è <strong>scrivere tutto in chat</strong>. La conversazione resta tracciata, consultabile da entrambi e non modificabile a posteriori. Registrate anche il <a href="/help/organizzatori/prezzo-definitivo">prezzo definitivo</a>, che richiede la conferma di entrambe le parti.</p>
<p>Un messaggio riepilogativo dopo la conferma vale più di qualunque accordo verbale.</p>

<h2>Se la data salta</h2>
<p>Vedi <a href="/help/organizzatori/annullare-data">annullare una data confermata</a>. N'arte non applica penali e non trattiene somme: quello che avete concordato fra voi vale fra voi.</p>
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
<p>L'abbonamento artista è facoltativo e <strong>indipendente dalle date che fai</strong>: non è una commissione sui tuoi ingaggi. È l'unica somma che la piattaforma incassa.</p>
<p>Per il pubblico, gli utenti registrati e gli organizzatori <strong>non esiste alcun abbonamento</strong>: è tutto gratuito.</p>

<h2>Il listino</h2>
<ul>
  <li><strong>${PLAN_LABELS.free}</strong> — gratuito, non scade, non richiede carta.</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — ${formatPrice(PLAN_PRICES_CENTS.pro.month)} al mese o ${formatPrice(PLAN_PRICES_CENTS.pro.year)} all'anno.</li>
  <li><strong>${PLAN_LABELS.max}</strong> — ${formatPrice(PLAN_PRICES_CENTS.max.month)} al mese o ${formatPrice(PLAN_PRICES_CENTS.max.year)} all'anno.</li>
</ul>
<p>Cosa include ciascun piano è in <a href="/help/artisti/tier-pro-max">differenze tra i piani</a> e su <a href="/prezzi">/prezzi</a>.</p>

<h2>L'abbonamento è dell'account</h2>
<p>Non del singolo profilo artista. Se gestisci più progetti, <strong>paghi una volta sola</strong> e ogni profilo eredita i vantaggi del piano. Vedi <a href="/help/artisti/profili-multipli">gestire più profili artista</a>.</p>

<h2>Come si sottoscrive</h2>
<p>Da <strong>/dashboard/abbonamento</strong>: scegli piano e periodicità e vieni portato sulla pagina di pagamento sicura di <strong>Stripe</strong>. Se hai un codice promozionale, si inserisce lì.</p>
<p>I dati della carta <strong>non passano mai dai nostri sistemi</strong>: li gestisce direttamente Stripe e noi non li vediamo.</p>
<p>Dopo il pagamento l'attivazione richiede qualche secondo. Se la pagina mostra ancora il piano vecchio, ricaricala fra poco: non pagare di nuovo.</p>

<h2>Non c'è un periodo di prova</h2>
<p>Non esiste una prova gratuita a tempo. C'è però il piano ${PLAN_LABELS.free}, gratuito e senza scadenza: puoi restarci quanto vuoi e passare a pagamento solo quando ha senso per te.</p>

<h2>Cambiare piano, carta o disdire</h2>
<p>Tutto da un unico posto: il pulsante <strong>"Gestisci fatturazione"</strong> in /dashboard/abbonamento, che apre il portale Stripe. Da lì puoi:</p>
<ul>
  <li><strong>Cambiare piano</strong>, in su o in giù, e passare da mensile ad annuale.</li>
  <li><strong>Aggiornare la carta</strong>.</li>
  <li><strong>Scaricare fatture e ricevute</strong>.</li>
  <li><strong>Disdire</strong>.</li>
</ul>
<p>Se hai già un abbonamento attivo, il cambio piano si fa <strong>solo da qui</strong>: non avviare un nuovo pagamento, verrebbe rifiutato.</p>

<h2>Dove sono le fatture</h2>
<p>Nel portale Stripe, sotto "Gestisci fatturazione". Lì trovi lo storico completo e i documenti scaricabili.</p>
<p>Nota: <strong>non riceverai un'email da N'arte</strong> a ogni rinnovo. Le comunicazioni di pagamento arrivano da Stripe, e lo stato del piano è sempre visibile nella tua area.</p>

<h2>Cosa succede quando disdici</h2>
<p>L'abbonamento <strong>resta attivo fino alla fine del periodo già pagato</strong>: non perdi i giorni che hai versato, e la data di scadenza è indicata nella tua area.</p>
<p>Poi il profilo torna al piano ${PLAN_LABELS.free}. Il profilo <strong>resta online</strong> e le richieste continuano ad arrivare. Perdi chat, recensioni visibili, badge e posizione prioritaria.</p>
<p><strong>Nessun contenuto viene cancellato.</strong> Foto, video e profili eccedenti smettono di essere pubblici ma restano nella tua area, e ricompaiono se risali di piano.</p>

<h2>Se un pagamento non va a buon fine</h2>
<p>Il piano <strong>resta attivo</strong> mentre Stripe riprova l'addebito. Nella tua area vedi l'avviso: aggiorna la carta dal portale per non perdere le funzioni.</p>

<h2>Il badge "Omaggio"</h2>
<p>Se vedi questa etichetta, il piano ti è stato assegnato dal team N'arte: <strong>non ha scadenza e non prevede alcun addebito</strong>. Non devi fare nulla.</p>

<h2>Ho diritto al ripensamento?</h2>
<p>I termini d'uso richiamano il diritto di recesso previsto dal Codice del consumo per chi sottoscrive in qualità di consumatore. Per una richiesta concreta <a href="/contatti">scrivici</a>: vedi anche i <a href="/termini">termini d'uso</a>.</p>
`,
    },
  ],
};
