import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-10-09";

// Qui restano solo le regole essenziali, valide per tutti. File del logo,
// colori e indicazioni operative stanno nel Kit brand delle aree riservate
// (/dashboard/brand per gli artisti, /organizzatore/brand per gli
// organizzatori), con i testi in lib/brand-kit/contenuti.ts.

export const BRAND: HelpCategory = {
  slug: "brand",
  title: "Brand e comunicazione",
  description:
    "Come scrivere il nome N'arte, quando si può usare il logo e come citarci quando annunci una data.",
  icon: "megaphone",
  audience: "all",
  articles: [
    {
      slug: "usare-nome-e-logo",
      title: "Usare il nome e il logo N'arte",
      excerpt:
        "Come si scrive il nome, quando puoi usare il logo e quando invece conviene chiederci prima.",
      updatedAt: UPDATED,
      related: ["annunciare-una-data", "citare-narte", "materiali-e-stampa"],
      content: `
<h2>Come si scrive il nome</h2>
<p>Si scrive <strong>N'arte</strong>: N maiuscola, apostrofo e il resto minuscolo, anche a inizio frase. Nei titoli tutti in maiuscolo diventa <strong>N'ARTE</strong>.</p>
<p>Le forme sbagliate più frequenti sono <em>Narte</em>, <em>N'Arte</em> e <em>N arte</em>.</p>

<h2>Le regole di base</h2>
<ul>
  <li>Il logo si usa così com'è, senza modificarlo o ricolorarlo.</li>
  <li>Non va inserito nel tuo logo, nella tua immagine profilo o nel tuo merchandising.</li>
  <li>Non deve far pensare a un rapporto con N'arte che non esiste, per esempio una sponsorizzazione.</li>
</ul>
<p>Se sei un artista o un organizzatore, i file del logo, i colori e le indicazioni complete li trovi nel <strong>Kit brand</strong> della tua area riservata.</p>

<h2>Quando puoi usarlo senza chiedere</h2>
<ul>
  <li>Per annunciare una data nata su N'arte.</li>
  <li>Per dire che fai parte del roster, se sei un artista approvato.</li>
  <li>Per promuovere un evento organizzato da N'arte a cui partecipi.</li>
  <li>In un articolo o in un servizio giornalistico su N'arte.</li>
</ul>

<h2>Quando chiederci prima</h2>
<p>Per pubblicità a pagamento, merchandising, loghi affiancati in un unico marchio o qualunque uso che possa far pensare a una partnership ufficiale. <a href="/contatti">Scrivici</a>: rispondiamo entro 1-2 giorni lavorativi e quasi sempre la risposta è sì.</p>

<h2>Piattaforma, non organizzatore</h2>
<p>Se una serata la organizza un locale che ha trovato l'artista qui, N'arte va citata come la piattaforma da cui è nato il contatto, non tra gli organizzatori. Trovi qualche esempio in <a href="/help/brand/annunciare-una-data">come annunciare una data</a>.</p>
`,
    },

    {
      slug: "citare-narte",
      title: "Come citarci sui tuoi canali",
      excerpt:
        "Dove taggarci e quali formule usare per parlare di N'arte senza creare equivoci.",
      updatedAt: UPDATED,
      related: ["usare-nome-e-logo", "annunciare-una-data", "materiali-e-stampa"],
      content: `
<h2>Dove taggarci</h2>
<ul>
  <li><strong>Instagram</strong>: <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a></li>
  <li><strong>Facebook</strong>: <a href="https://facebook.com/narteofficiall" rel="noopener">narteofficiall</a></li>
</ul>
<p>Quando ci tagghi in un post o in una storia, spesso lo ricondividiamo.</p>

<h2>Formule che vanno bene</h2>
<ul>
  <li><strong>Se sei nel roster</strong>: «Artista N'arte», «Trovi il mio profilo su N'arte».</li>
  <li><strong>Se la data è nata qui</strong>: «Serata nata su N'arte», «Ci siamo conosciuti grazie a N'arte».</li>
  <li><strong>Se l'evento è nostro</strong>: «Un evento N'arte».</li>
  <li><strong>Se sei un locale</strong>: «Cerchiamo i nostri artisti su N'arte».</li>
</ul>

<h2>Formule da evitare</h2>
<p>Queste danno al pubblico un'idea sbagliata di cosa fa N'arte:</p>
<ul>
  <li><strong>«Prodotto da N'arte»</strong> o <strong>«sponsorizzato da N'arte»</strong>, se l'evento non è nostro.</li>
  <li><strong>«In collaborazione con N'arte»</strong>, se non c'è un accordo con noi. Essersi trovati sulla piattaforma non è una collaborazione.</li>
  <li><strong>«Agenzia N'arte»</strong> o <strong>«il mio agente»</strong>: N'arte non è un'agenzia e non rappresenta nessuno.</li>
  <li><strong>«Certificato N'arte»</strong>: non esistono certificazioni. Il badge <em>Artista Pro</em> indica un abbonamento attivo, come spiegato in <a href="/help/artisti/badge-e-visibilita">badge e visibilità</a>.</li>
</ul>

<h2>Se scrivi di noi</h2>
<p>Per parlare di N'arte non serve nessuna autorizzazione. Se ti servono materiali o una dichiarazione, leggi <a href="/help/brand/materiali-e-stampa">materiali e richieste stampa</a>.</p>
`,
    },

    {
      slug: "annunciare-una-data",
      title: "Come annunciare una data nata su N'arte",
      excerpt:
        "Chi annuncia cosa, cosa non deve mancare nell'annuncio e come citare N'arte.",
      updatedAt: UPDATED,
      related: ["usare-nome-e-logo", "citare-narte", "booking/contratto-modello"],
      content: `
<h2>Chi annuncia cosa</h2>
<p>Di solito l'organizzatore annuncia l'evento e l'artista annuncia la propria data. Va bene che lo facciano entrambi, purché i due annunci dicano la stessa cosa.</p>
<p>Decidete prima chi pubblica e quando: due post con orari diversi o con il nome scritto in due modi confondono il pubblico. È uno dei punti di <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>.</p>

<h2>Cosa non deve mancare</h2>
<ul>
  <li>Il <strong>nome dell'artista</strong>, scritto come lo scrive lui.</li>
  <li><strong>Data, ora di inizio e indirizzo</strong>.</li>
  <li>Il tipo di <strong>ingresso</strong> e dove si comprano i biglietti.</li>
  <li><strong>Chi organizza</strong>.</li>
</ul>

<h2>Come citare N'arte</h2>
<p>N'arte va citata per quello che ha fatto: vi ha messi in contatto. Vanno bene «Serata nata su N'arte», «Artista N'arte» o un tag a <a href="https://instagram.com/narte.official" rel="noopener">@narte.official</a>.</p>
<p>N'arte non va messa tra gli organizzatori o gli sponsor di una serata che non organizza. Se invece l'evento è nostro, il logo va insieme a quello degli organizzatori.</p>
<p>Artisti e organizzatori trovano nel <strong>Kit brand</strong> della propria area riservata i file del logo e le indicazioni per usarlo in una locandina.</p>

<h2>Foto e video</h2>
<p>Usa foto fornite dall'artista o che hai il permesso di usare, senza prenderle dai social, e cita il fotografo quando serve. Se fai riprese durante la serata, decidete prima come potrete usarle. Approfondisci in <a href="/help/policy/contenuti-e-diritti">contenuti e diritti</a>.</p>

<h2>Dopo la serata e se salta</h2>
<p>Il giorno dopo è il momento giusto per pubblicare foto e video: taggatevi a vicenda, e taggate anche noi.</p>
<p>Se la data salta, <strong>aggiorna l'annuncio</strong> invece di cancellarlo, così chi se l'era segnata lo viene a sapere.</p>
`,
    },

    {
      slug: "materiali-e-stampa",
      title: "Materiali e richieste stampa",
      excerpt:
        "Dove trovare le informazioni ufficiali su N'arte e come chiedere materiali, dichiarazioni o interviste.",
      updatedAt: UPDATED,
      related: ["usare-nome-e-logo", "citare-narte", "annunciare-una-data"],
      content: `
<h2>Informazioni pubbliche</h2>
<p>Per raccontare N'arte puoi partire da <a href="/chi-siamo">chi siamo</a>, dalle <a href="/collaborazioni">collaborazioni</a> e dalle pagine dei <a href="/format">format</a>.</p>

<h2>Una descrizione pronta</h2>
<p>Se ti serve una frase per presentarci, puoi usare questa:</p>
<p><em>«N'arte è la piattaforma italiana che mette in contatto artisti emergenti e organizzatori di eventi musicali. Nata a Napoli nel 2018 organizzando serate e format live, dal 2026 è anche una piattaforma dove locali, festival e privati trovano musica dal vivo e inviano richieste di booking direttamente agli artisti.»</em></p>

<h2>Cosa puoi chiederci</h2>
<p>Scrivici dal <a href="/contatti">modulo contatti</a> per:</p>
<ul>
  <li>il logo, anche in formato vettoriale;</li>
  <li>una dichiarazione o un'intervista;</li>
  <li>foto di eventi passati, o il permesso di usarne alcune;</li>
  <li>dati e informazioni sulla piattaforma per un articolo;</li>
  <li>l'uso del marchio in un contesto commerciale o in una partnership.</li>
</ul>
<p>Ti rispondiamo prima se nel messaggio ci dici chi sei e per chi scrivi, cosa ti serve, dove verrà pubblicato ed entro quando. Di solito rispondiamo entro <strong>1-2 giorni lavorativi</strong>.</p>

<h2>Se sei un artista o un organizzatore</h2>
<p>Loghi e colori li trovi già nel <strong>Kit brand</strong> della tua area riservata. Agli artisti conviene condividere il link al profilo pubblico: raccoglie foto, video e biografia ed è sempre aggiornato. Vedi <a href="/help/artisti/ottimizza-profilo">come ottimizzare il profilo artista</a>.</p>
`,
    },
  ],
};
