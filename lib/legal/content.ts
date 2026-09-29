/**
 * Documenti legali di N'arte.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️  QUESTI TESTI SONO UNA BOZZA DI LAVORO, NON UN PARERE LEGALE.
 *
 * Sono scritti per dare all'avvocato un punto di partenza concreto invece di
 * una pagina bianca, e per permettere di costruire tutto ciò che ci sta
 * attorno — rotte, navigazione, caselle di consenso, banner — senza aspettare.
 * Vanno revisionati e approvati prima di considerarli vincolanti.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * RAPPORTO CON IUBENDA
 * La configurazione sta in `lib/legal/iubenda.ts`, non qui: questo file
 * contiene testo, quello contiene indirizzi e interruttori. Quando iubenda è
 * attivo, privacy e cookie policy arrivano da lui e queste due bozze restano
 * come storico; i TERMINI invece restano sempre questi, perché il generatore
 * di iubenda non li produce sotto il piano Advanced e non coprirebbe comunque
 * le tre parti che contano per N'arte.
 *
 * `INTEGRAZIONI_NARTE` è l'eccezione che continua a essere mostrata in ogni
 * caso: sono i trattamenti su misura che nessun catalogo standard descrive.
 *
 * IL PRESUPPOSTO CHE REGGE TUTTO IL TESTO
 * N'arte mette in contatto artisti e organizzatori e si ferma lì. Non incassa,
 * non anticipa e non intermedia il compenso dell'esibizione: quello lo
 * concordano e lo regolano direttamente le due parti. L'unica somma che N'arte
 * incassa è l'abbonamento dell'artista. Se questo presupposto cambia, va
 * riscritta la sezione "Il ruolo di N'arte" dei Termini, e con essa la
 * responsabilità su pagamenti e contestazioni.
 */

import { TITOLARE, recapitoPrivacyHtml } from "@/lib/legal/titolare";

export type LegalDoc = {
  slug: "privacy" | "cookie-policy" | "termini";
  title: string;
  /** Sottotitolo mostrato sotto il titolo. */
  standfirst: string;
  /** Data dell'ultima modifica sostanziale, in formato ISO. */
  updatedAt: string;
  /** Corpo in HTML, reso con la classe `.blog-prose` già usata dal blog. */
  body: string;
};

/** Versione dei documenti. È la data dell'ultima modifica, anche minima, ed è
 *  quella che si mostra in pagina e si registra insieme al consenso: serve a
 *  sapere esattamente quale testo l'utente aveva davanti. */
export const LEGAL_VERSION = "2026-09-14";

/**
 * Versione del CONSENSO — deliberatamente separata dalla precedente.
 *
 * È questa, e non `LEGAL_VERSION`, che il gate confronta per decidere se
 * rimettere un utente davanti alla schermata di accettazione. Va alzata solo
 * per modifiche SOSTANZIALI: una finalità nuova, un fornitore in più, una
 * categoria di dati che prima non si trattava. Correggere un refuso o riscrivere
 * un paragrafo più chiaro muove `LEGAL_VERSION` e lascia ferma questa.
 *
 * Senza la distinzione, ogni ritocco redazionale rimetterebbe in coda l'intera
 * base utenti davanti a un modulo bloccante — e un consenso chiesto così spesso
 * smette di essere letto, che è esattamente il contrario dello scopo.
 */
export const LEGAL_CONSENT_VERSION = "2026-08-28";
// ⚠️ Resta ferma di proposito, benché i testi siano cambiati il 14/09/2026: le
// aggiunte sono bozze in attesa della revisione dell'avvocato, e non ha senso
// far accettare a tutti un testo che cambierà ancora. Va alzata UNA volta, al
// momento della pubblicazione della versione validata. Nel frattempo il gate
// funziona lo stesso, perché chi non ha mai accettato nulla ha la colonna
// vuota e viene intercettato comunque.

const INTESTAZIONE_TITOLARE = `
<h2>Chi tratta i tuoi dati</h2>
<p>Il titolare del trattamento è <strong>${TITOLARE.denominazione}</strong>,
partita IVA ${TITOLARE.partitaIva}, con sede in ${TITOLARE.indirizzo},
${TITOLARE.cap} ${TITOLARE.citta} (${TITOLARE.paese}), che gestisce la
piattaforma N&rsquo;arte.</p>
<p>Per qualunque richiesta relativa ai tuoi dati personali — accesso, rettifica,
cancellazione, opposizione, portabilità — puoi raggiungerci alla
${recapitoPrivacyHtml()}.</p>
`;

/**
 * Il sito usa strumenti di misurazione o pubblicitari?
 *
 * NON è una preferenza redazionale: è la stessa condizione che accende davvero
 * i tag in `components/analytics/TrackingScripts.tsx`. Il testo della cookie
 * policy si adegua da solo, così non può capitare ciò che sarebbe capitato
 * altrimenti — valorizzare le variabili su Vercel e lasciare online una pagina
 * legale che giura, nero su bianco, che nessuno traccia niente.
 *
 * Quando i documenti passeranno a iubenda questa pagina rimanderà comunque alla
 * versione generata e mantenuta aggiornata; questo blocco resta la rete di
 * sicurezza per il periodo intermedio, in cui il banner può essere già attivo e
 * i documenti ancora locali.
 */
const TRACCIAMENTO_ATTIVO = Boolean(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID
);

/**
 * Le cinque descrizioni su misura — il pezzo che iubenda non può contenere.
 *
 * Il piano Essentials non consente clausole personalizzate: il suo catalogo
 * copre i trattamenti standard (hosting, email, pagamenti, statistiche) e si
 * ferma lì. Questi cinque invece sono peculiari di N'arte, e sono proprio quelli
 * che una persona ha interesse a conoscere — che il team può leggere le chat,
 * che il nome di un turnista finisce su una pagina pubblica, che inviando una
 * richiesta di booking le si crea un account.
 *
 * Vivono quindi qui, in un blocco a sé, e vengono resi in DUE posti:
 *   - dentro la bozza locale dell'informativa, finché è quella mostrata;
 *   - come sezione autonoma della pagina /privacy quando subentra iubenda,
 *     sotto il documento generato.
 *
 * Il motivo di questa doppiezza: senza, il giorno in cui iubenda si accende
 * queste cinque descrizioni spariscono dal sito senza che nessuno se ne
 * accorga, e l'informativa smette di descrivere metà di ciò che accade.
 */
export const INTEGRAZIONI_NARTE = `
<h2>Alcune cose che vale la pena spiegare per esteso</h2>
<p>Sono i trattamenti particolari di questa piattaforma: non li si trova
descritti in un'informativa generica, ma è giusto che tu sappia che avvengono.</p>

<h3>La chat fra artisti e organizzatori</h3>
<p>I messaggi, gli allegati e le note vocali scambiati in una trattativa sono
conservati sui nostri sistemi. Il team N&rsquo;arte può accedervi per fornire
assistenza, gestire una contestazione fra le parti o verificare una
segnalazione. Non li leggiamo per altri scopi e non li usiamo a fini
commerciali.</p>

<h3>I nomi dei componenti della formazione</h3>
<p>Un artista può indicare sul proprio profilo i nomi e i ruoli delle persone
che suonano con lui. Sono <strong>dati di terzi, che riceviamo da lui e non
dall&rsquo;interessato</strong>, e diventano pubblici insieme al profilo. Chiediamo
all&rsquo;artista di averli informati e di avere il loro consenso prima di
inserirli. Se il tuo nome compare su un profilo e non vuoi, scrivici: lo
togliamo.</p>

<h3>L&rsquo;account creato inviando una richiesta di booking</h3>
<p>Chi invia una richiesta dal profilo di un artista senza essere registrato può
creare l&rsquo;account nello stesso passaggio: in quel momento nasce un profilo di
tipo &laquo;organizzatore&raquo;, con i dati indicati nel modulo e con la struttura
eventualmente descritta. È un account a tutti gli effetti, con le stesse
possibilità di accesso, modifica e cancellazione degli altri.</p>

<h3>Le recensioni</h3>
<p>Dopo una data confermata e passata, l&rsquo;organizzatore può lasciare una
recensione all&rsquo;artista. La recensione è <strong>pubblica</strong> e resta sul
profilo. Riguarda una persona identificata: per questo può essere contestata,
e noi possiamo nasconderla se è offensiva, falsa o estranea all&rsquo;esperienza.</p>

<h3>Il registro delle email inviate</h3>
<p>Teniamo traccia delle comunicazioni che il sistema invia — destinatario,
oggetto, esito — per accorgerci quando qualcosa non arriva a destinazione e
poterlo correggere. È un registro tecnico, consultabile solo dal team.</p>
`;

// ───────────────────────────────────────────────────────────── PRIVACY ──────

const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Informativa sulla privacy",
  standfirst:
    "Quali dati raccogliamo, perché li raccogliamo, a chi li affidiamo e come puoi intervenire su di essi.",
  updatedAt: LEGAL_VERSION,
  body: `
${INTESTAZIONE_TITOLARE}

<h2>Quali dati raccogliamo</h2>

<h3>Se ti registri</h3>
<p>Nome, indirizzo email e password. La password non la vediamo mai: viene
custodita dal nostro fornitore di autenticazione in forma cifrata e non è
leggibile da noi.</p>

<h3>Se ti candidi come artista</h3>
<p>Oltre ai dati di registrazione: nome d'arte, biografia, generi musicali,
strumenti, città, collegamenti ai tuoi profili social e il materiale che carichi
— fotografie, tracce audio, video. Questi contenuti sono destinati a essere
pubblicati sul tuo profilo: li carichi tu e decidi tu quali siano.</p>

<h3>Se sei un organizzatore</h3>
<p>Dati del locale, del festival o dell'attività che rappresenti: denominazione,
indirizzo, capienza, immagini, recapiti.</p>

<h3>Quando usi la piattaforma</h3>
<p>Le richieste di booking che invii o ricevi, i messaggi scambiati in chat con
i relativi allegati e messaggi vocali, le prenotazioni di consulenza, le
recensioni che lasci.</p>

<h3>Visite ai profili degli artisti</h3>
<p>Contiamo quante volte un profilo viene aperto, per mostrare all'artista una
statistica. <strong>Non conserviamo il tuo indirizzo IP</strong>: viene
trasformato in un codice non riconducibile a te, che serve solo a non contare
due volte la stessa visita nella stessa giornata.</p>

<h2>Perché li trattiamo</h2>
<ul>
<li><strong>Per farti usare la piattaforma</strong>: senza questi dati non
possiamo creare il tuo account, mostrare il tuo profilo o recapitare le
richieste di booking. La base giuridica è l'esecuzione del contratto.</li>
<li><strong>Per mandarti le comunicazioni di servizio</strong>: conferme,
notifiche di una nuova richiesta, promemoria di un evento. Sono parte del
servizio e non si possono disattivare separatamente.</li>
<li><strong>Per gestire gli abbonamenti</strong>, dove previsti, e i relativi
obblighi contabili e fiscali.</li>
<li><strong>Per mandarti comunicazioni promozionali</strong>, solo se ci hai
dato un consenso specifico, che puoi ritirare quando vuoi.</li>
</ul>

<h2>A chi affidiamo i dati</h2>
<p>Ci appoggiamo a fornitori che trattano i dati per nostro conto, ognuno per
una funzione precisa:</p>
<ul>
<li><strong>Supabase</strong> — banca dati, accessi e archiviazione dei file.</li>
<li><strong>Vercel</strong> — pubblicazione e funzionamento del sito.</li>
<li><strong>Brevo</strong> e <strong>Resend</strong> — invio delle email.</li>
<li><strong>Stripe</strong> — pagamento degli abbonamenti. I dati della carta
sono gestiti direttamente da Stripe: <strong>non transitano mai dai nostri
sistemi e non li vediamo</strong>.</li>
<li><strong>bunny.net</strong> — archiviazione e distribuzione di immagini,
tracce audio e video, e riproduzione dei video.</li>
${
  TRACCIAMENTO_ATTIVO
    ? `<li><strong>Google Analytics</strong> — statistiche di navigazione in forma
aggregata. Si attiva solo con il tuo consenso.</li>
<li><strong>Meta</strong> — misurazione delle campagne pubblicitarie e
remarketing. Si attiva solo con il tuo consenso, ed è un trattamento di cui Meta
è contitolare insieme a noi.</li>`
    : ""
}
</ul>
<p class="da-completare"><em>Da completare con l'avvocato: paesi di
archiviazione, garanzie per i trasferimenti fuori dall'Unione Europea e
riferimenti agli accordi sottoscritti con ciascun fornitore.</em></p>

${INTEGRAZIONI_NARTE}

<h2>Il compenso degli artisti non passa da noi</h2>
<p>N'arte mette in contatto artisti e organizzatori. Il compenso di
un'esibizione viene concordato e pagato <strong>direttamente fra le due
parti</strong>: non lo incassiamo, non lo anticipiamo e non lo tratteniamo.
Non trattiamo quindi né coordinate bancarie né dati di fatturazione relativi
agli ingaggi.</p>

<h2>Per quanto li conserviamo</h2>
<p>Finché il tuo account resta attivo. Se lo elimini, i dati collegati vengono
cancellati, salvo quanto dobbiamo conservare per obbligo di legge — per esempio
i documenti contabili degli abbonamenti.</p>
<p class="da-completare"><em>Da completare con l'avvocato: termini precisi per
ciascuna categoria di dati, in particolare messaggi di chat, allegati e registro
degli invii email.</em></p>

<h2>I tuoi diritti</h2>
<p>Puoi in qualunque momento chiedere di accedere ai tuoi dati, correggerli,
cancellarli, limitarne il trattamento, ottenerne una copia in formato leggibile
oppure opporti al trattamento. Puoi anche ritirare un consenso che avevi dato,
senza che questo tolga validità a quanto fatto prima.</p>
<p>Per esercitarli scrivici dalla <a href="/contatti">pagina contatti</a>. Hai
inoltre il diritto di rivolgerti al Garante per la protezione dei dati
personali.</p>
`,
};

// ────────────────────────────────────────────────────────────── COOKIE ──────

const COOKIE_IN_BREVE_SENZA_TRACCIAMENTO = `
<h2>In breve</h2>
<p><strong>Non usiamo Google Analytics, non usiamo il pixel di Meta, non usiamo
alcuno strumento pubblicitario o di profilazione.</strong> Nessuno traccia la
tua navigazione su questo sito, né noi né terzi.</p>
`;

const COOKIE_IN_BREVE_CON_TRACCIAMENTO = `
<h2>In breve</h2>
<p>Oltre ai cookie necessari al funzionamento del sito, usiamo strumenti di
misurazione e pubblicitari di terze parti. <strong>Non partono finché non li
accetti</strong>: fino a quel momento non vengono nemmeno caricati, e puoi
cambiare idea quando vuoi dal pannello delle preferenze.</p>

<h3>Statistiche di navigazione — Google Analytics</h3>
<p>Ci dice quante persone visitano il sito e quali pagine guardano, in forma
aggregata. Non lo usiamo per farti pubblicità: le funzioni pubblicitarie di
Google restano disattivate.</p>

<h3>Misurazione e remarketing — pixel di Meta</h3>
<p>Serve a capire quali campagne portano iscrizioni e a riproporti i nostri
annunci su Facebook e Instagram. È profilazione a tutti gli effetti e richiede
il tuo consenso esplicito. Su questi dati Meta è contitolare insieme a noi.</p>

<h3>Riproduzione dei video — Bunny Stream</h3>
<p>Il riproduttore video è fornito da BunnyWay d.o.o. (Slovenia): imposta cookie
propri e raccoglie statistiche di visione. Per questo un video non parte finché
non acconsenti, o finché non sblocchi quel singolo contenuto.</p>
`;

const COOKIE: LegalDoc = {
  slug: "cookie-policy",
  title: "Cookie policy",
  standfirst: TRACCIAMENTO_ATTIVO
    ? "Quali cookie usiamo, quali richiedono il tuo consenso e come cambiare idea."
    : "Su N'arte non ci sono cookie di profilazione né strumenti di tracciamento di terze parti.",
  updatedAt: LEGAL_VERSION,
  body: `
${TRACCIAMENTO_ATTIVO ? COOKIE_IN_BREVE_CON_TRACCIAMENTO : COOKIE_IN_BREVE_SENZA_TRACCIAMENTO}

<h2>Cosa usiamo davvero</h2>

<h3>Cookie necessari</h3>
<p>Servono a far funzionare il sito e non possono essere disattivati: senza,
non è possibile restare collegati.</p>
<ul>
<li><strong>Cookie di sessione</strong> — mantengono l'accesso dopo il login.
Sono gestiti dal nostro fornitore di autenticazione.</li>
<li><strong>Profilo artista attivo</strong> — per chi gestisce più profili,
ricorda quale sta usando.</li>
</ul>

<h3>Memoria del browser</h3>
<p>Alcune preferenze restano salvate nel tuo browser e <strong>non arrivano mai
ai nostri server</strong>: gli artisti che segni come preferiti quando non sei
registrato, e la scelta fatta su questo banner.</p>

<h2>Come intervenire</h2>
<p>Puoi cancellare o bloccare i cookie dalle impostazioni del tuo browser.
Bloccando quelli necessari, però, l'accesso all'area riservata smetterà di
funzionare.</p>

${
  TRACCIAMENTO_ATTIVO
    ? `<h2>Come cambiare idea</h2>
<p>Puoi rivedere o ritirare il consenso in qualunque momento dal pannello delle
preferenze, raggiungibile dal pulsante in basso a sinistra di ogni pagina. Il
ritiro non tocca la validità di quanto fatto prima.</p>`
    : `<h2>Se cambierà qualcosa</h2>
<p>Se in futuro introdurremo strumenti di misurazione o di marketing, questa
pagina verrà aggiornata e ti verrà chiesto il consenso <strong>prima</strong>
che vengano attivati.</p>`
}
`,
};

// ───────────────────────────────────────────────────────────── TERMINI ──────

const TERMINI: LegalDoc = {
  slug: "termini",
  title: "Termini e condizioni d'uso",
  standfirst:
    "Le regole del servizio: cosa fa N'arte, cosa non fa, e cosa ci si aspetta da chi lo usa.",
  updatedAt: LEGAL_VERSION,
  body: `
<h2>Il ruolo di N'arte</h2>
<p><strong>N'arte è una piattaforma che mette in contatto.</strong> Consente ad
artisti e organizzatori di trovarsi, presentarsi e accordarsi.</p>
<p>N'arte <strong>non è parte del contratto</strong> che nasce fra un artista e
un organizzatore, non lo negozia e non lo garantisce. In particolare:</p>
<ul>
<li>il compenso viene concordato direttamente fra le due parti;</li>
<li><strong>il pagamento non passa da N'arte</strong>: non lo incassiamo, non lo
anticipiamo, non tratteniamo commissioni sull'ingaggio;</li>
<li>gli obblighi fiscali, contributivi e di eventuale fatturazione restano in
capo alle parti;</li>
<li>gli adempimenti verso la SIAE e verso le autorità locali restano a carico di
chi organizza l'evento.</li>
</ul>
<p>Quello che N'arte fornisce sono gli strumenti: i profili, il calendario, la
chat, il tracciamento delle offerte. L'esecuzione dell'accordo riguarda solo le
parti che l'hanno stretto.</p>

<h3>Gli adempimenti dell'evento</h3>
<p>Tutto ciò che un evento dal vivo comporta resta a carico di chi lo organizza
— l'organizzatore o il locale che ospita:</p>
<ul>
<li>gli obblighi verso la <strong>SIAE</strong> e i diritti connessi;</li>
<li>l'<strong>agibilità INPS</strong> dei lavoratori dello spettacolo e gli
obblighi contributivi;</li>
<li>la <strong>sicurezza</strong> del luogo e delle persone, la capienza, i
piani di emergenza;</li>
<li>le <strong>autorizzazioni</strong>, i permessi e le comunicazioni alle
autorità locali;</li>
<li>le <strong>coperture assicurative</strong> necessarie.</li>
</ul>
<p>Usando la piattaforma per inviare una richiesta, l'organizzatore
<strong>garantisce</strong> di essere in regola con questi obblighi o di
assumerli interamente, e <strong>tiene indenne N'arte</strong> da qualunque
pretesa di terzi che ne derivi, comprese quelle di enti e autorità.</p>

<h3>Il compenso annotato in chat</h3>
<p>La chat consente di registrare il compenso concordato con la conferma di
entrambe le parti. <strong>È un promemoria di quanto le parti si sono dette, non
un contratto concluso tramite N'arte.</strong> Serve a evitare malintesi e a
ricostruire la trattativa: non ci rende parte dell'accordo, non ci obbliga a
nulla e non garantisce che il pagamento avvenga.</p>

<h3>Cosa non garantiamo</h3>
<p>Non rispondiamo dell'inadempimento di una delle parti, del mancato o ritardato
pagamento del compenso, della qualità della prestazione artistica, di
annullamenti, ritardi o mancate presentazioni. Verifichiamo i profili prima di
ammetterli al catalogo, ma questo non è una garanzia sul comportamento delle
persone.</p>
<p class="da-completare"><em>Da rivedere con l'avvocato: questa sezione
distribuisce responsabilità fra le parti, ma una clausola contrattuale non
vincola automaticamente SIAE, INPS o gli organi ispettivi. Va verificato che la
garanzia e la manleva dell'organizzatore siano formulate in modo efficace, e se
il modello richieda un'autorizzazione all'intermediazione.</em></p>

<h2>Chi può usare N'arte</h2>
<p><strong>Il servizio è riservato ai maggiorenni.</strong> Per registrarsi,
candidarsi come artista o inviare una richiesta di booking bisogna avere almeno
18 anni, e lo si dichiara al momento dell'iscrizione. Se veniamo a sapere che un
account appartiene a un minore lo chiudiamo e cancelliamo i dati collegati.</p>

<h2>Account</h2>
<p>Per usare le funzioni riservate serve un account. I dati che inserisci devono
essere veri e aggiornati, e le credenziali vanno custodite: sei responsabile di
quanto avviene attraverso il tuo accesso.</p>
<p>L'account come artista si ottiene tramite candidatura, che il team N'arte
valuta. L'approvazione non è automatica e può essere negata.</p>

<h2>Contenuti caricati</h2>
<p>Fotografie, audio, video e testi che carichi <strong>restano tuoi</strong>.
Non ne acquistiamo la proprietà e non li rivendiamo.</p>

<h3>Cosa ci autorizzi a fare</h3>
<p>Caricandoli ci concedi una licenza <strong>non esclusiva e gratuita</strong>
per: mostrarli sulla piattaforma, ridimensionarli e convertirli per adattarli ai
diversi formati e dispositivi, e usarli per promuovere il tuo profilo, gli
eventi a cui partecipi e la piattaforma stessa, anche sui nostri canali social.
La licenza dura finché il contenuto resta pubblicato e <strong>cessa quando lo
rimuovi o chiudi l'account</strong>, salvo le copie già diffuse su canali terzi
o conservate nei backup, che si esauriscono con i normali cicli di
sovrascrittura.</p>

<h3>Cosa ci garantisci</h3>
<p>Dichiari di avere il diritto di caricare ogni contenuto e di concedercene
l'uso. In particolare:</p>
<ul>
<li>di essere l'autore dei brani, o di avere il permesso degli autori e degli
editori per le <strong>cover</strong> e i rifacimenti;</li>
<li>di essere titolare dei <strong>diritti sulle registrazioni</strong> che
carichi, o di averne l'autorizzazione da chi li detiene;</li>
<li>di avere il consenso dei <strong>fotografi e dei videomaker</strong> le cui
opere pubblichi;</li>
<li>di avere il consenso all'uso dell'immagine di <strong>tutte le persone
riconoscibili</strong> nelle foto e nei video;</li>
<li>di avere informato i <strong>componenti della tua formazione</strong> e
raccolto il loro consenso prima di inserire i loro nomi e ruoli sul profilo
pubblico, che è visibile a chiunque.</li>
</ul>
<p>Se un terzo contesta un contenuto, <strong>ne rispondi tu</strong> e ci tieni
indenni dalle conseguenze. Possiamo rimuovere senza preavviso ciò che risulti
privo di questi diritti o contrario a queste regole.</p>
<p class="da-completare"><em>Da rivedere con l'avvocato: ampiezza e durata della
licenza, sorte dei contenuti alla cessazione, e formulazione della manleva.</em></p>

<h2>Comportamento</h2>
<p>Non è consentito usare la piattaforma per molestare altre persone, pubblicare
contenuti offensivi o illeciti, fingersi qualcun altro, inviare messaggi
promozionali non richiesti o tentare di aggirare le limitazioni tecniche del
servizio.</p>

<h2>Recensioni</h2>
<p>Le recensioni possono essere lasciate da un organizzatore a un artista dopo
una data confermata e già passata, una sola volta per evento. Devono riferirsi
all'esperienza reale. Rimuoviamo quelle offensive, false o estranee al servizio.</p>

<h2>Abbonamenti degli artisti</h2>
<p>La piattaforma è gratuita per il pubblico, per gli utenti registrati e per gli
organizzatori. Agli artisti sono offerti piani a pagamento, i cui contenuti e
prezzi sono indicati nella pagina <a href="/prezzi">Piani e prezzi</a>.</p>
<p>L'abbonamento si rinnova automaticamente alla scadenza e si può disdire in
qualunque momento dalla propria area: la disdetta ha effetto alla fine del
periodo già pagato.</p>
<p><strong>Diritto di recesso.</strong> Se sei un consumatore hai quattordici
giorni per ripensarci dalla sottoscrizione, secondo il Codice del consumo.</p>
<p class="da-completare"><em>Da completare con l'avvocato: modalità di esercizio
del recesso, effetti sul servizio già fruito e modulo da rendere disponibile.</em></p>

<h2>Moderazione, sospensione e segnalazioni</h2>

<h3>Cosa possiamo fare, e quando</h3>
<p>Possiamo intervenire quando un contenuto o un comportamento viola queste
regole o la legge. Gli interventi possibili sono, in ordine di gravità:</p>
<ul>
<li><strong>rimuovere un contenuto</strong> (una foto, una traccia, un video,
una recensione);</li>
<li><strong>nascondere una recensione</strong> offensiva, falsa o estranea
all'esperienza dell'evento;</li>
<li><strong>limitare una conversazione</strong> in caso di molestie;</li>
<li><strong>sospendere un profilo</strong> dal catalogo pubblico;</li>
<li><strong>chiudere l'account</strong> nei casi gravi o ripetuti.</li>
</ul>
<p>Salvo i casi in cui la legge lo impedisca, <strong>ti diciamo cosa abbiamo
fatto e perché</strong>, e puoi contestare la decisione scrivendoci: la
riesaminiamo e ti rispondiamo. Nei casi gravi l'intervento può essere immediato
e la motivazione arrivare subito dopo.</p>

<h3>Segnalare un contenuto</h3>
<p>Se trovi sulla piattaforma un contenuto che ritieni illecito o contrario a
queste regole puoi segnalarcelo dalla <a href="/contatti">pagina contatti</a>,
indicando dove si trova, perché lo ritieni tale e come ricontattarti.
Confermiamo la ricezione, esaminiamo la segnalazione e ti comunichiamo l'esito.
Chi ha pubblicato il contenuto viene informato della decisione e può
contestarla.</p>

<h3>Accesso del team alle conversazioni</h3>
<p>Il team N'arte può accedere al contenuto delle conversazioni fra artisti e
organizzatori per fornire assistenza, gestire una contestazione fra le parti o
verificare una segnalazione. Non le leggiamo per altri scopi e non le usiamo a
fini commerciali.</p>
<p class="da-completare"><em>Da rivedere con l'avvocato: tipizzazione dei casi,
tempi di risposta alle segnalazioni, indirizzo dedicato da indicare, e verifica
degli obblighi derivanti dal regolamento europeo sui servizi digitali.</em></p>

<h2>Responsabilità</h2>
<p>Ci impegniamo perché il servizio funzioni con continuità, ma non possiamo
garantire che sia sempre disponibile e privo di errori.</p>
<p class="da-completare"><em>Da completare con l'avvocato: limitazioni di
responsabilità, legge applicabile e foro competente.</em></p>

<h2>Modifiche</h2>
<p>Questi termini possono cambiare. Le modifiche rilevanti vengono comunicate in
anticipo a chi ha un account.</p>
`,
};

export const LEGAL_DOCS: LegalDoc[] = [PRIVACY, COOKIE, TERMINI];

export function findLegalDoc(slug: string): LegalDoc | null {
  return LEGAL_DOCS.find((d) => d.slug === slug) ?? null;
}
