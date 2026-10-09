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

export const BRAND_KIT_REGOLE = `
<h2>Come usare il logo</h2>
<ul>
  <li><strong>Usa i file così come sono.</strong> Niente ricolorazioni, ombre, contorni, effetti, rotazioni o deformazioni. Se lo ridimensioni, mantieni le proporzioni.</li>
  <li><strong>Non scomporlo.</strong> Simbolo e scritta restano insieme, il carattere non si cambia e dentro il marchio non si aggiungono parole.</li>
  <li><strong>Lascia spazio intorno.</strong> Tieni libera almeno l'altezza della «N» su ogni lato, lontano da altri loghi e dai bordi.</li>
  <li><strong>Scegli la versione giusta per il fondo.</strong> Su una foto scura serve il logo per fondi scuri; su una foto piena di dettagli appoggialo su una zona uniforme o su una banda di colore.</li>
</ul>

<h2>Quando chiedere prima</h2>
<ul>
  <li>Materiali pubblicitari a pagamento.</li>
  <li>Merchandising e prodotti fisici.</li>
  <li>Loghi affiancati in un unico marchio o comunicazioni che fanno pensare a una partnership ufficiale.</li>
  <li>Qualunque uso che possa far credere che N'arte organizzi o sponsorizzi l'evento, se non è così.</li>
</ul>
<p>Scrivici dal <a href="/contatti">modulo contatti</a>: rispondiamo entro 1-2 giorni lavorativi e quasi sempre la risposta è sì. Lì puoi chiedere anche il logo in formato vettoriale.</p>
`;

export const BRAND_KIT_ARTISTA = `
<h2>Come presentarti</h2>
<p>Puoi scrivere «Artista N'arte», «Faccio parte del roster N'arte» o «Trovi il mio profilo su N'arte». Per una data nata qui va bene «Serata nata su N'arte».</p>
<p>Il logo puoi usarlo senza chiedere per dire che fai parte del roster, per annunciare una data arrivata dalla piattaforma e per promuovere un evento organizzato da N'arte a cui partecipi. Non va nel tuo logo, nella foto profilo dei tuoi social o nel tuo merchandising.</p>

<h2>Il link al tuo profilo</h2>
<p>Il tuo profilo pubblico ha un indirizzo che non cambia: mettilo nella bio, nel link in bio o sul tuo sito. Lo apri dal pulsante <strong>«Apri pagina pubblica»</strong> nella dashboard.</p>
<p>È il link più utile da condividere. Chi lo apre trova biografia, foto, video e audio, e può mandarti una richiesta senza dover scrivere a nessuno. Funziona anche come press kit, e si aggiorna da solo ogni volta che modifichi il profilo.</p>

<h2>Il badge</h2>
<p>Con il badge puoi presentarti come <strong>Artista Pro su N'arte</strong>. Evita «artista verificato» o formule simili: il badge indica un abbonamento attivo, non una selezione né un riconoscimento artistico.</p>

<h2>Da non scrivere</h2>
<ul>
  <li>«Agenzia N'arte» o «il mio agente»: N'arte non è un'agenzia e non rappresenta nessuno.</li>
  <li>«Prodotto da N'arte» o «sponsorizzato da N'arte», se l'evento non è nostro.</li>
  <li>«Certificato N'arte»: non esiste alcuna certificazione.</li>
</ul>

<h2>Quando annunci una data</h2>
<p>Accordati con l'organizzatore su chi pubblica e quando, e usate lo stesso nome, la stessa ora e lo stesso luogo. Se ci tagghi (<a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a>), spesso ricondividiamo.</p>
`;

export const BRAND_KIT_ORGANIZZATORE = `
<h2>Come citare N'arte</h2>
<p>N'arte va citata per quello che ha fatto, cioè mettervi in contatto. Vanno bene «Serata nata su N'arte», «Artista N'arte» o «Cerchiamo i nostri artisti su N'arte», insieme al tag <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a>.</p>
<p>Non mettere N'arte tra gli organizzatori o gli sponsor di una serata che organizzi tu. Se invece l'evento è organizzato da N'arte, il logo va insieme a quello degli organizzatori.</p>

<h2>Il logo nella locandina</h2>
<ul>
  <li>Usa i file qui sopra, senza modificarli, nella versione adatta al fondo.</li>
  <li>Mettilo insieme agli altri riferimenti, tipo «artista da» o «in collaborazione con», e mai più in evidenza di chi organizza.</li>
  <li>Il logo del locale resta il protagonista: la serata è tua.</li>
</ul>

<h2>Cosa scrivere nell'annuncio</h2>
<ul>
  <li>Il <strong>nome dell'artista</strong>, scritto esattamente come lo scrive lui: i nomi d'arte hanno spesso maiuscole e apostrofi particolari.</li>
  <li><strong>Data, ora di inizio e indirizzo</strong>.</li>
  <li>Il tipo di <strong>ingresso</strong> (libero, con consumazione, a pagamento) e dove si comprano i biglietti.</li>
  <li><strong>Chi organizza</strong>.</li>
</ul>
<p>Mettetevi d'accordo con l'artista su chi pubblica e quando: due annunci con orari diversi confondono il pubblico.</p>

<h2>Foto e video</h2>
<p>Usa le foto che ti ha dato l'artista o che sei autorizzato a usare, e cita il fotografo quando serve. Se fai foto o riprese durante la serata, decidete prima come potrete usarle tutti e due.</p>
`;
