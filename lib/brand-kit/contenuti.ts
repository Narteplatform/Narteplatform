// Kit brand delle aree riservate (/dashboard/brand e /organizzatore/brand).
//
// Nel Centro Assistenza pubblico restano solo le regole essenziali d'uso del
// nome e del logo. File, colori, spazi di rispetto e indicazioni operative
// stanno qui, divisi per chi li usa: l'artista e l'organizzatore hanno esigenze
// diverse (citarsi come artista del roster da un lato, preparare una locandina
// dall'altro).
//
// HTML con gli stessi tag degli articoli /help, reso con la classe `blog-prose`.

export type BrandKitLogo = { href: string; titolo: string; uso: string; fondoScuro?: boolean };
export type BrandKitColore = { nome: string; hex: string; uso: string };

export const BRAND_KIT_LOGHI: BrandKitLogo[] = [
  { href: "/brand/narte-logo.png", titolo: "Logo principale", uso: "Per fondi chiari." },
  {
    href: "/brand/narte-logo-dark.png",
    titolo: "Logo per fondi scuri",
    uso: "Su nero, blu notte o foto scure.",
    fondoScuro: true,
  },
  {
    href: "/brand/narte-monogram.png",
    titolo: "Monogramma",
    uso: "Solo il simbolo, per spazi piccoli o quadrati: avatar, icone, bollini.",
  },
];

/** Gli stessi valori di app/globals.css (--color-notte, --color-azzurro, …). */
export const BRAND_KIT_COLORI: BrandKitColore[] = [
  { nome: "Notte", hex: "#0d1b2a", uso: "Testi e fondi scuri" },
  { nome: "Azzurro", hex: "#1a6bad", uso: "Colore principale" },
  { nome: "Corallo", hex: "#e8542a", uso: "Accento, da usare poco" },
  { nome: "Palco", hex: "#f7f5f2", uso: "Bianco caldo dei fondi chiari" },
];

/**
 * Regole d'uso del logo, uguali per artisti e organizzatori (testo del
 * cliente, novembre 2026). Ogni kit le include in fondo alla propria parte.
 */
const REGOLE_LOGO = `
<h2>Qualche regola per utilizzare correttamente il logo</h2>
<p>Il logo N'arte rappresenta la nostra identità: per questo ti chiediamo di utilizzarlo sempre nella sua versione originale.</p>
<p>In particolare:</p>
<ul>
  <li><strong>Non modificarlo:</strong> niente cambi di colore, ombre, contorni, effetti grafici, rotazioni o deformazioni. Puoi ridimensionarlo, ma mantenendo sempre le proporzioni.</li>
  <li><strong>Non separare gli elementi:</strong> simbolo e scritta devono rimanere insieme. Non cambiare il carattere e non aggiungere altre parole all'interno del marchio.</li>
  <li><strong>Lascia un po' di spazio:</strong> evita di posizionarlo troppo vicino ad altri loghi, testi o bordi. Mantieni intorno uno spazio libero almeno pari all'altezza della lettera «N».</li>
  <li><strong>Scegli la versione giusta:</strong> utilizza il logo per sfondi chiari o scuri in base alla grafica. Se lo inserisci su una fotografia molto ricca di dettagli, scegli una zona più uniforme oppure utilizza una banda di colore per renderlo leggibile.</li>
</ul>

<h2>Quando contattare N'arte prima di utilizzare il logo</h2>
<p>Ci sono alcune situazioni in cui è necessario confrontarsi con noi prima di procedere:</p>
<ul>
  <li>Quando vuoi utilizzare il logo in campagne pubblicitarie a pagamento.</li>
  <li>Quando vuoi inserirlo su merchandising, gadget o altri prodotti fisici.</li>
  <li>Quando vuoi affiancare il logo N'arte ad altri marchi creando un'identità grafica unica.</li>
  <li>Quando la comunicazione potrebbe far pensare a una partnership ufficiale, a una sponsorizzazione o a un'organizzazione da parte di N'arte che in realtà non esiste.</li>
</ul>
<p>Per qualsiasi dubbio sull'utilizzo del logo o sulla comunicazione della collaborazione, puoi <a href="/contatti">contattarci</a> prima della pubblicazione.</p>
`;

export const BRAND_KIT_ARTISTA = `
<h2>Come comunicare che sei su N'arte</h2>
<p>Se una data è arrivata attraverso N'arte, o vuoi far sapere che hai un profilo sulla piattaforma, ci fa piacere che tu lo condivida e che venga riconosciuto il ruolo di N'arte nel mettere in contatto artisti e locali.</p>
<p>Puoi farlo in modo semplice, utilizzando una di queste formule:</p>
<ul>
  <li>Trovi il mio profilo su N'arte</li>
  <li>Data trovata su N'arte</li>
  <li>In collaborazione con N'arte</li>
</ul>
<p>Oppure semplicemente taggando il nostro profilo Instagram <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a> nel post o nella locandina: spesso ricondividiamo.</p>
<p>Una piccola precisazione: se la serata è organizzata dal locale o da un altro organizzatore, N'arte non deve comparire tra gli organizzatori o gli sponsor. Se invece l'evento è organizzato direttamente da N'arte, il nostro logo potrà essere inserito insieme a quello degli altri organizzatori.</p>

<h2>Il link al tuo profilo</h2>
<p>Il tuo profilo pubblico ha un indirizzo che non cambia: mettilo nella bio, nel link in bio o sul tuo sito. Lo apri dal pulsante <strong>«Apri pagina pubblica»</strong> nella dashboard.</p>
<p>È il link più utile da condividere. Chi lo apre trova biografia, foto, video e audio, e può mandarti una richiesta senza dover scrivere a nessuno. Funziona anche come press kit, e si aggiorna da solo ogni volta che modifichi il profilo.</p>

<h2>Il badge</h2>
<p>Con il badge puoi presentarti come <strong>Artista Pro su N'arte</strong>. Evita «artista verificato» o formule simili: il badge indica un abbonamento attivo, non una selezione né un riconoscimento artistico.</p>

<h2>Il logo N'arte nei tuoi contenuti</h2>
<p>Se vuoi inserire il nostro logo in un post o in una locandina, ti chiediamo di seguire qualche semplice indicazione:</p>
<ul>
  <li>Utilizza i file ufficiali che trovi in questa sezione, scegliendo la versione più adatta allo sfondo.</li>
  <li>Non modificarli e non alterarne colori o proporzioni.</li>
  <li>Inserisci il logo in modo discreto, vicino alla dicitura scelta (ad esempio «Data trovata su N'arte» o «In collaborazione con N'arte»).</li>
  <li>Il logo N'arte non deve avere più risalto del tuo nome o di quello del locale che ti ospita.</li>
  <li>Non usarlo come tuo logo, nella foto profilo dei tuoi social o sul tuo merchandising.</li>
</ul>
<p>Ricorda: i protagonisti della comunicazione sono la tua musica e la serata.</p>

<h2>Le informazioni da inserire quando annunci una data</h2>
<p>Quando pubblichi una serata, assicurati che non manchino le informazioni principali:</p>
<ul>
  <li><strong>Nome del locale o dell'evento:</strong> scrivilo come lo comunica chi organizza.</li>
  <li><strong>Data e orario:</strong> indica chiaramente quando inizia la serata o la tua esibizione.</li>
  <li><strong>Indirizzo:</strong> inserisci il luogo esatto dell'evento.</li>
  <li><strong>Ingresso:</strong> specifica se è gratuito, con consumazione obbligatoria o a pagamento. Se sono previsti biglietti, indica dove acquistarli.</li>
  <li><strong>Organizzazione:</strong> chiarisci chi organizza l'evento.</li>
</ul>
<p>Un altro consiglio: accordati prima con l'organizzatore su chi pubblicherà l'annuncio e in quale momento. Avere comunicazioni coordinate, con le stesse informazioni, aiuta tutti a raggiungere meglio il pubblico ed evita confusione.</p>

<h2>Foto e video</h2>
<ul>
  <li>Dai all'organizzatore foto e video di cui hai i diritti, così potrà usarli senza problemi.</li>
  <li>Indicagli il nome del fotografo o del videomaker da citare, quando serve.</li>
  <li>Se durante la serata vengono realizzate foto o riprese, accordati prima con l'organizzatore su come potranno essere utilizzate e condivise da entrambe le parti.</li>
</ul>

<h2>Da non scrivere</h2>
<ul>
  <li>«Agenzia N'arte» o «il mio agente»: N'arte non è un'agenzia e non rappresenta nessuno.</li>
  <li>«Prodotto da N'arte» o «sponsorizzato da N'arte», se l'evento non è nostro.</li>
  <li>«Certificato N'arte»: non esiste alcuna certificazione.</li>
</ul>
${REGOLE_LOGO}
<p>L'obiettivo è semplice: dare visibilità agli artisti, valorizzare il lavoro dei locali e riconoscere il ruolo di N'arte nel creare queste connessioni.</p>
`;

/** Testo del cliente (novembre 2026), riportato com'è salvo la grafia «N'arte». */
export const BRAND_KIT_ORGANIZZATORE = `
<h2>Come comunicare la collaborazione con N'arte</h2>
<p>Se hai trovato un artista attraverso N'arte, ci fa piacere che tu lo condivida e che venga riconosciuto il ruolo della nostra piattaforma nel mettere in contatto artisti e locali.</p>
<p>Puoi farlo in modo semplice, utilizzando una di queste formule:</p>
<ul>
  <li>Artista trovato su N'arte</li>
  <li>In collaborazione con N'arte</li>
  <li>Powered by N'arte</li>
</ul>
<p>Oppure semplicemente taggando il nostro profilo Instagram <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a> nel post o nella locandina.</p>
<p>Una piccola precisazione: se la serata è organizzata da te o dal tuo locale, N'arte non deve comparire tra gli organizzatori o gli sponsor. Se invece l'evento è organizzato direttamente da N'arte, il nostro logo potrà essere inserito insieme a quello degli altri organizzatori.</p>

<h2>Il logo N'arte nella locandina</h2>
<p>Se vuoi inserire il nostro logo nella comunicazione della serata, ti chiediamo di seguire qualche semplice indicazione:</p>
<ul>
  <li>Utilizza i file ufficiali che trovi in questa sezione, scegliendo la versione più adatta allo sfondo.</li>
  <li>Non modificarli e non alterarne colori o proporzioni.</li>
  <li>Inserisci il logo in modo discreto, vicino alla dicitura scelta (ad esempio «Artista trovato su N'arte» o «In collaborazione con N'arte»).</li>
  <li>Il logo N'arte non deve avere più risalto rispetto a quello del locale o di chi organizza la serata.</li>
</ul>
<p>Ricorda: il protagonista della comunicazione è il tuo evento e il tuo locale.</p>

<h2>Le informazioni da inserire nell'annuncio</h2>
<p>Quando pubblichi una serata, assicurati che non manchino le informazioni principali:</p>
<ul>
  <li><strong>Nome dell'artista:</strong> scrivilo esattamente come compare sul suo profilo, rispettando maiuscole, spazi e particolarità del nome d'arte.</li>
  <li><strong>Data e orario:</strong> indica chiaramente quando inizia la serata o l'esibizione.</li>
  <li><strong>Indirizzo:</strong> inserisci il luogo esatto dell'evento.</li>
  <li><strong>Ingresso:</strong> specifica se è gratuito, con consumazione obbligatoria o a pagamento. Se sono previsti biglietti, indica dove acquistarli.</li>
  <li><strong>Organizzazione:</strong> chiarisci chi organizza l'evento.</li>
</ul>
<p>Un altro consiglio: accordati prima con l'artista su chi pubblicherà l'annuncio e in quale momento. Avere comunicazioni coordinate, con le stesse informazioni, aiuta tutti a raggiungere meglio il pubblico ed evita confusione.</p>

<h2>Foto e video</h2>
<ul>
  <li>Utilizza le foto e i video che l'artista ti ha fornito oppure assicurati di avere il permesso per utilizzarli.</li>
  <li>Quando necessario, ricordati di citare il fotografo o il videomaker che ha realizzato i contenuti.</li>
  <li>Se durante la serata vengono realizzate foto o riprese, accordati prima con l'artista su come potranno essere utilizzate e condivise da entrambe le parti.</li>
</ul>
${REGOLE_LOGO}
<p>L'obiettivo è semplice: dare visibilità agli artisti, valorizzare il lavoro dei locali e riconoscere il ruolo di N'arte nel creare queste connessioni.</p>
`;
