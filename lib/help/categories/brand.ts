import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-09-07";

export const BRAND: HelpCategory = {
  slug: "brand",
  title: "Brand e comunicazione",
  description:
    "Come usare il nome e il logo N'arte, come citarci sui tuoi canali e come annunciare una data nata sulla piattaforma.",
  icon: "megaphone",
  audience: "all",
  articles: [
    {
      slug: "usare-nome-e-logo",
      title: "Usare il nome e il logo N'arte",
      excerpt:
        "Come si scrive il nome, quali file usare, cosa è consentito e cosa no quando inserisci il marchio nei tuoi materiali.",
      updatedAt: UPDATED,
      related: ["annunciare-una-data", "citare-narte", "materiali-e-stampa"],
      content: `
<h2>Come si scrive il nome</h2>
<p>La forma corretta è <strong>N'arte</strong>: N maiuscola, apostrofo, resto minuscolo. Sempre così, anche a inizio frase e anche nei titoli tutti maiuscoli, dove diventa <strong>N'ARTE</strong>.</p>
<p>Da evitare: <em>Narte</em>, <em>N'Arte</em>, <em>NARTE</em> in mezzo a un testo normale, <em>N arte</em>. Sono errori piccoli ma frequenti, e in una locandina si notano.</p>

<h2>I file del logo</h2>
<p>Puoi usare questi file, così come sono:</p>
<ul>
  <li><a href="/brand/narte-logo.png">Logo principale</a> — per fondi chiari.</li>
  <li><a href="/brand/narte-logo-dark.png">Logo per fondi scuri</a> — la versione da usare su nero, notte o foto scure.</li>
  <li><a href="/brand/narte-monogram.png">Monogramma</a> — solo il simbolo, per spazi piccoli o quadrati: avatar, icone, bollini.</li>
</ul>
<p>Scegli la versione in base al fondo. Un logo scuro su una foto notturna sparisce, ed è l'errore più comune.</p>

<h2>Regole d'uso</h2>
<p>Poche e semplici:</p>
<ul>
  <li><strong>Non modificare il logo.</strong> Niente ricolorazioni, ombre, contorni, effetti, rotazioni o deformazioni. Se lo ridimensioni, mantieni le proporzioni.</li>
  <li><strong>Non ricomporlo.</strong> Non separare simbolo e testo, non sostituire il carattere, non aggiungere parole dentro il marchio.</li>
  <li><strong>Lascia respiro.</strong> Attorno al logo tieni uno spazio libero pari almeno all'altezza della "N": non appiccicarlo ad altri loghi o al bordo.</li>
  <li><strong>Garantisci la leggibilità.</strong> Su una foto affollata, appoggialo su un'area uniforme o su una banda di colore pieno.</li>
  <li><strong>Non usarlo come tuo.</strong> Il logo N'arte non va nel tuo profilo social, nel tuo logo, nel tuo merchandising.</li>
  <li><strong>Non lasciare intendere rapporti che non esistono.</strong> Vedi la sezione qui sotto.</li>
</ul>

<h2>I colori del brand</h2>
<p>Se ti serve accostare i colori giusti:</p>
<ul>
  <li><strong>Notte</strong> <code>#0d1b2a</code> — l'inchiostro e il fondo delle aree scure.</li>
  <li><strong>Azzurro</strong> <code>#1a6bad</code> — l'accento principale.</li>
  <li><strong>Corallo</strong> <code>#e8542a</code> — accento secondario, da usare con parsimonia.</li>
  <li><strong>Palco</strong> <code>#f7f5f2</code> — il bianco caldo dei fondi chiari.</li>
</ul>

<h2>Quando puoi usare il logo senza chiedere</h2>
<ul>
  <li>Per <strong>annunciare una data</strong> nata su N'arte, citandoci come piattaforma da cui è arrivato il contatto.</li>
  <li>Per indicare che <strong>fai parte del roster</strong>, se sei un artista approvato.</li>
  <li>Per <strong>promuovere un evento organizzato da N'arte</strong> a cui partecipi.</li>
  <li>In un <strong>articolo o servizio giornalistico</strong> che parla di N'arte.</li>
</ul>

<h2>Quando devi chiedere prima</h2>
<ul>
  <li>Su <strong>materiali commerciali</strong> o pubblicitari a pagamento.</li>
  <li>Su <strong>merchandising</strong> o prodotti fisici.</li>
  <li>In un <strong>logo composito</strong> o in una comunicazione che suggerisce una partnership ufficiale.</li>
  <li>Ogni volta che il tuo uso potrebbe far pensare che N'arte <strong>organizzi</strong> o <strong>sponsorizzi</strong> l'evento quando non è così.</li>
</ul>
<p>In tutti questi casi <a href="/contatti">scrivici</a>: rispondiamo entro 1-2 giorni lavorativi e nella grande maggioranza dei casi la risposta è sì.</p>

<h2>La distinzione che conta</h2>
<p>Essere nel roster e collaborare con N'arte per una data <strong>non equivale a essere un evento N'arte</strong>. Se la serata la organizza un locale che ti ha trovato qui, N'arte va citata come piattaforma, non messa come organizzatore. È spiegato in <a href="/help/brand/annunciare-una-data">come annunciare una data</a>.</p>
`,
    },

    {
      slug: "citare-narte",
      title: "Come citarci sui tuoi canali",
      excerpt:
        "Tag, menzioni e formule corrette per parlare di N'arte su social, sito e materiali, senza dire cose inesatte.",
      updatedAt: UPDATED,
      related: ["usare-nome-e-logo", "annunciare-una-data", "materiali-e-stampa"],
      content: `
<h2>Dove taggarci</h2>
<ul>
  <li><strong>Instagram</strong>: <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a></li>
  <li><strong>Facebook</strong>: <a href="https://facebook.com/narteofficiall" rel="noopener">narteofficiall</a></li>
</ul>
<p>Se ci tagghi in una storia o in un post, molto spesso lo ricondividiamo. Non è una promessa, ma è il modo più semplice per farsi notare dal team.</p>

<h2>Formule corrette</h2>
<p>A seconda della situazione:</p>
<ul>
  <li><strong>Se sei nel roster</strong>: "Artista N'arte", "Fai parte del roster N'arte", "Trovi il mio profilo su N'arte".</li>
  <li><strong>Se la data è nata qui</strong>: "Serata nata su N'arte", "Ci siamo conosciuti grazie a N'arte".</li>
  <li><strong>Se l'evento è nostro</strong>: "Un evento N'arte", "Nell'ambito di Sunday N'arte".</li>
  <li><strong>Se sei un locale</strong>: "Cerchiamo i nostri artisti su N'arte".</li>
</ul>

<h2>Formule da evitare</h2>
<p>Non perché siamo permalosi, ma perché dicono cose non vere e possono creare equivoci con il pubblico:</p>
<ul>
  <li><strong>"Prodotto da N'arte"</strong> — se non abbiamo prodotto noi l'evento.</li>
  <li><strong>"In collaborazione con N'arte"</strong> — se non c'è una collaborazione concordata. Trovarsi su una piattaforma non è una collaborazione.</li>
  <li><strong>"Sponsorizzato da N'arte"</strong> — non sponsorizziamo eventi di terzi.</li>
  <li><strong>"Agenzia N'arte" o "il mio agente"</strong> — N'arte non è un'agenzia e non fa da agente per nessuno.</li>
  <li><strong>"Certificato N'arte"</strong> — non esiste alcuna certificazione. Il badge <em>Verificato N'arte</em> attesta un abbonamento attivo, non un titolo: vedi <a href="/help/artisti/badge-e-visibilita">badge e visibilità</a>.</li>
</ul>

<h2>Il link al tuo profilo</h2>
<p>Se sei un artista del roster, il tuo profilo pubblico ha un indirizzo stabile che puoi mettere in biografia, nel link in bio o nel tuo sito. Lo trovi dal pulsante <strong>"Apri pagina pubblica"</strong> nella tua dashboard.</p>
<p>È il link più utile da condividere: chi lo apre trova biografia, foto, video, audio e il modo di inviarti una richiesta, senza dover scrivere a nessuno. Un solo indirizzo al posto di dieci messaggi.</p>

<h2>Parlare del badge</h2>
<p>Se hai il badge puoi dire di essere un <strong>artista verificato su N'arte</strong>. Evita formule che lascino intendere una selezione o un riconoscimento artistico: il badge indica un abbonamento attivo, ed essere onesti su questo punto ti fa più credito che il contrario.</p>

<h2>Se scrivi un articolo o un post che ci riguarda</h2>
<p>Non serve alcuna autorizzazione per parlare di N'arte. Se vuoi materiali o una dichiarazione, vedi <a href="/help/brand/materiali-e-stampa">materiali e richieste stampa</a>.</p>
`,
    },

    {
      slug: "annunciare-una-data",
      title: "Come annunciare una data nata su N'arte",
      excerpt:
        "Cosa scrivere nella locandina e nei post, chi va citato come organizzatore e come accordarsi sui crediti.",
      updatedAt: UPDATED,
      related: ["usare-nome-e-logo", "citare-narte", "booking/contratto-modello"],
      content: `
<h2>Chi annuncia cosa</h2>
<p>Di norma <strong>l'organizzatore annuncia l'evento</strong> e <strong>l'artista annuncia la propria data</strong>. Entrambe le cose vanno bene e si rafforzano a vicenda, purché dicano la stessa cosa.</p>
<p>Mettetevi d'accordo prima su chi pubblica e quando: due annunci con orari diversi o nomi scritti in modo diverso confondono il pubblico. È uno dei punti della lista in <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>Cosa non deve mancare</h2>
<ul>
  <li><strong>Nome dell'artista</strong>, scritto come lo scrive lui. Controllalo: i nomi d'arte hanno spesso maiuscole e apostrofi particolari.</li>
  <li><strong>Data, ora di inizio e luogo</strong> con indirizzo.</li>
  <li><strong>Ingresso</strong>: libero, con consumazione, a pagamento; e dove si prendono i biglietti.</li>
  <li><strong>Chi organizza</strong> — il locale, il festival, chi apre le porte.</li>
</ul>

<h2>Come citare N'arte</h2>
<p>La regola sta in una frase: <strong>N'arte va citata per quello che ha fatto, cioè mettervi in contatto</strong>.</p>
<ul>
  <li>Va bene: <em>"Serata nata su N'arte"</em>, <em>"Artista N'arte"</em>, un tag a <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a>.</li>
  <li>Non va bene mettere N'arte fra gli <strong>organizzatori</strong> o gli <strong>sponsor</strong> di un evento che non organizziamo.</li>
</ul>
<p>Se invece l'evento è organizzato da N'arte, allora sì: siamo l'organizzatore e il logo va con gli organizzatori.</p>

<h2>Il logo nella locandina</h2>
<p>Se lo inserisci, usa i file ufficiali senza modificarli e scegli la versione giusta per il fondo. Le regole sono in <a href="/help/brand/usare-nome-e-logo">usare il nome e il logo</a>.</p>
<p>Collocalo insieme agli altri riferimenti — "in collaborazione con", "artista da" — e non in posizione dominante rispetto a chi organizza davvero.</p>

<h2>Foto e video</h2>
<ul>
  <li>Usa <strong>foto fornite dall'artista</strong> o comunque autorizzate: non prenderle dai social senza chiedere. Vedi <a href="/help/policy/contenuti-e-diritti">contenuti e diritti</a>.</li>
  <li>Se scatti tu o fai riprese, <strong>accordati prima</strong> su come potranno essere usate. Vale in entrambe le direzioni.</li>
  <li><strong>Cita il fotografo</strong> quando il credito è dovuto.</li>
</ul>

<h2>Dopo la serata</h2>
<p>Il momento migliore per pubblicare è il giorno dopo, quando avete materiale vero. Taggatevi a vicenda: per l'artista è un riferimento verificabile, per il locale una prova che la programmazione funziona.</p>
<p>Se ci tagghi, c'è una buona probabilità che ricondividiamo.</p>

<h2>Se la data salta</h2>
<p><strong>Aggiorna l'annuncio</strong>, non limitarti a cancellarlo. Chi aveva segnato la serata merita di saperlo, e un post di rettifica costa meno di un pubblico che si presenta a porte chiuse.</p>
`,
    },

    {
      slug: "materiali-e-stampa",
      title: "Materiali e richieste stampa",
      excerpt:
        "Dove trovare loghi e informazioni ufficiali, e come richiedere materiali, dichiarazioni o interviste al team.",
      updatedAt: UPDATED,
      related: ["usare-nome-e-logo", "citare-narte", "annunciare-una-data"],
      content: `
<h2>Quello che puoi usare subito</h2>
<p>Non serve chiedere nulla per questi:</p>
<ul>
  <li><a href="/brand/narte-logo.png">Logo principale</a>, <a href="/brand/narte-logo-dark.png">versione per fondi scuri</a> e <a href="/brand/narte-monogram.png">monogramma</a>.</li>
  <li>I colori del brand, elencati in <a href="/help/brand/usare-nome-e-logo">usare il nome e il logo</a>.</li>
  <li>Le informazioni pubbliche su <a href="/chi-siamo">chi siamo</a> e le <a href="/collaborazioni">collaborazioni</a>.</li>
  <li>Le descrizioni dei <a href="/format">format</a>.</li>
</ul>

<h2>Una descrizione pronta</h2>
<p>Se ti serve una riga per presentarci, puoi usare questa così com'è:</p>
<p><em>"N'arte è la piattaforma italiana che mette in contatto artisti emergenti e organizzatori di eventi musicali. Nata a Napoli nel 2018 come realtà che organizza serate e format live, dal 2026 è anche una piattaforma su cui locali, festival e privati trovano musica dal vivo e inviano richieste di booking direttamente agli artisti."</em></p>

<h2>Cosa chiedere al team</h2>
<p>Scrivi dal <a href="/contatti">modulo contatti</a> se ti serve:</p>
<ul>
  <li>Il <strong>logo in formato vettoriale</strong> o in altre versioni.</li>
  <li>Una <strong>dichiarazione</strong> o un'<strong>intervista</strong>.</li>
  <li><strong>Fotografie</strong> di eventi passati, o l'autorizzazione a usarne alcune.</li>
  <li>Dati e informazioni sulla piattaforma per un articolo.</li>
  <li>L'uso del marchio in un <strong>contesto commerciale</strong> o in una partnership.</li>
</ul>

<h2>Come scrivere la richiesta</h2>
<p>Rispondiamo più in fretta se il messaggio contiene già:</p>
<ul>
  <li><strong>Chi sei</strong> e per quale testata o progetto scrivi.</li>
  <li><strong>Cosa ti serve</strong>, in concreto.</li>
  <li><strong>Dove verrà pubblicato</strong>.</li>
  <li><strong>Entro quando</strong> ti serve: se hai una scadenza, dillo subito.</li>
</ul>
<p>Il tempo di risposta ordinario è di <strong>1-2 giorni lavorativi</strong>.</p>

<h2>Sei un artista e ti serve il tuo materiale</h2>
<p>Le tue foto, i tuoi video e la tua biografia sono già sul tuo profilo pubblico, che ha un indirizzo stabile da condividere. Non serve chiederci nulla: il link alla tua pagina è il press kit più aggiornato che hai, perché cambia insieme al profilo.</p>
<p>Vedi <a href="/help/artisti/ottimizza-profilo">come ottimizzare il profilo artista</a>.</p>
`,
    },
  ],
};
