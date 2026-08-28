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
 * PREDISPOSTO PER IUBENDA
 * La fonte dei testi passa da `LEGAL_SOURCE`. Quando iubenda sarà attivo basta
 * impostare la variabile d'ambiente `NEXT_PUBLIC_IUBENDA_*` con gli id dei
 * documenti: le pagine si limiteranno a rimandare ai documenti ospitati da
 * iubenda, sempre aggiornati, e queste bozze resteranno qui come storico senza
 * più essere mostrate. Nessuna rotta cambia, nessun link si rompe.
 *
 * IL PRESUPPOSTO CHE REGGE TUTTO IL TESTO
 * N'arte mette in contatto artisti e organizzatori e si ferma lì. Non incassa,
 * non anticipa e non intermedia il compenso dell'esibizione: quello lo
 * concordano e lo regolano direttamente le due parti. L'unica somma che N'arte
 * incassa è l'abbonamento dell'artista. Se questo presupposto cambia, va
 * riscritta la sezione "Il ruolo di N'arte" dei Termini, e con essa la
 * responsabilità su pagamenti e contestazioni.
 */

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

/** Versione dei documenti. Cambiarla quando il testo cambia in modo sostanziale:
 *  viene registrata insieme al consenso, così si sa a cosa l'utente ha aderito. */
export const LEGAL_VERSION = "2026-08-28";

/**
 * Id dei documenti su iubenda, quando saranno disponibili.
 * Finché sono vuoti, si mostrano le bozze locali.
 */
export const IUBENDA = {
  privacy: process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_URL ?? "",
  cookie: process.env.NEXT_PUBLIC_IUBENDA_COOKIE_URL ?? "",
  termini: process.env.NEXT_PUBLIC_IUBENDA_TERMS_URL ?? "",
} as const;

export function iubendaUrlFor(slug: LegalDoc["slug"]): string {
  if (slug === "privacy") return IUBENDA.privacy;
  if (slug === "cookie-policy") return IUBENDA.cookie;
  return IUBENDA.termini;
}

const TITOLARE = `
<h2>Chi tratta i tuoi dati</h2>
<p>Il titolare del trattamento è <strong>N'arte</strong>. Per qualunque richiesta
relativa ai tuoi dati personali puoi scriverci dalla
<a href="/contatti">pagina contatti</a>.</p>
<p class="da-completare"><em>Da completare con l'avvocato: denominazione legale
completa, sede, partita IVA e indirizzo email dedicato alla privacy.</em></p>
`;

// ───────────────────────────────────────────────────────────── PRIVACY ──────

const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Informativa sulla privacy",
  standfirst:
    "Quali dati raccogliamo, perché li raccogliamo, a chi li affidiamo e come puoi intervenire su di essi.",
  updatedAt: LEGAL_VERSION,
  body: `
${TITOLARE}

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
</ul>
<p class="da-completare"><em>Da completare con l'avvocato: paesi di
archiviazione, garanzie per i trasferimenti fuori dall'Unione Europea e
riferimenti agli accordi sottoscritti con ciascun fornitore.</em></p>

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

const COOKIE: LegalDoc = {
  slug: "cookie-policy",
  title: "Cookie policy",
  standfirst:
    "Su N'arte non ci sono cookie di profilazione né strumenti di tracciamento di terze parti.",
  updatedAt: LEGAL_VERSION,
  body: `
<h2>In breve</h2>
<p><strong>Non usiamo Google Analytics, non usiamo il pixel di Meta, non usiamo
alcuno strumento pubblicitario o di profilazione.</strong> Nessuno traccia la
tua navigazione su questo sito, né noi né terzi.</p>

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

<h2>Se cambierà qualcosa</h2>
<p>Se in futuro introdurremo strumenti di misurazione o di marketing, questa
pagina verrà aggiornata e ti verrà chiesto il consenso <strong>prima</strong>
che vengano attivati.</p>
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

<h2>Account</h2>
<p>Per usare le funzioni riservate serve un account. I dati che inserisci devono
essere veri e aggiornati, e le credenziali vanno custodite: sei responsabile di
quanto avviene attraverso il tuo accesso.</p>
<p>L'account come artista si ottiene tramite candidatura, che il team N'arte
valuta. L'approvazione non è automatica e può essere negata.</p>

<h2>Contenuti caricati</h2>
<p>Fotografie, audio, video e testi che carichi restano tuoi. Caricandoli ci
autorizzi a mostrarli sulla piattaforma e a usarli per promuovere il tuo profilo
e gli eventi a cui partecipi.</p>
<p>Dichiari di avere il diritto di caricarli: che siano tuoi o che tu abbia
ottenuto il permesso di chi ne detiene i diritti — fotografi, altri musicisti,
autori. Possiamo rimuovere un contenuto che risulti privo di questi diritti o
contrario a queste regole.</p>

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

<h2>Sospensione</h2>
<p>Possiamo sospendere o chiudere un account che violi queste regole, dandone
comunicazione. Nei casi gravi la sospensione può essere immediata.</p>

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
