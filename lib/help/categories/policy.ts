import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-09-07";

export const POLICY: HelpCategory = {
  slug: "policy",
  title: "Policy, termini e sicurezza",
  description:
    "Regole d'uso della piattaforma, comportamento atteso, gestione delle contestazioni e sicurezza dell'account.",
  icon: "shield",
  audience: "all",
  articles: [
    {
      slug: "termini-servizio",
      title: "I termini d'uso in sintesi",
      excerpt:
        "I punti principali delle regole che accetti usando N'arte, spiegati in linguaggio semplice.",
      updatedAt: UPDATED,
      related: ["codice-condotta", "contenuti-e-diritti", "account/privacy-dati"],
      content: `
<h2>Questo è un riassunto</h2>
<p>Il testo che fa fede è quello dei <a href="/termini">termini d'uso</a>. Qui trovi i punti che contano davvero, in linguaggio semplice: in caso di differenza, vale il documento ufficiale.</p>

<h2>N'arte mette in contatto</h2>
<p>È il principio da cui discende tutto il resto. La piattaforma fa incontrare artisti e organizzatori: <strong>non è parte del contratto</strong> che nasce fra loro, non incassa il compenso, non applica commissioni sull'ingaggio e non garantisce l'esito di una serata.</p>
<p>Gli adempimenti dell'evento — permessi, SIAE, sicurezza — restano di chi organizza. Vedi <a href="/help/iniziare/cosa-fa-e-non-fa-narte">cosa fa e cosa non fa N'arte</a>.</p>

<h2>L'account</h2>
<ul>
  <li>I dati che fornisci devono essere <strong>veri</strong> e riferiti a te o alla realtà che rappresenti.</li>
  <li>Sei <strong>responsabile</strong> di quello che accade dal tuo account: proteggi le credenziali.</li>
  <li>L'<strong>account artista</strong> si ottiene solo tramite candidatura. L'approvazione non è automatica e <strong>può essere negata</strong>.</li>
</ul>

<h2>I contenuti che carichi</h2>
<p>Restano tuoi. Caricandoli autorizzi N'arte a mostrarli sulla piattaforma e a promuovere il tuo profilo e gli eventi collegati, e dichiari di <strong>avere i diritti</strong> per farlo. Dettagli in <a href="/help/policy/contenuti-e-diritti">contenuti e diritti</a>.</p>

<h2>Le recensioni</h2>
<p>Può lasciarle solo un organizzatore, a un artista, <strong>dopo una data confermata e già passata</strong>, una sola volta per evento. È il vincolo che le rende attendibili.</p>

<h2>Gli abbonamenti</h2>
<ul>
  <li>La piattaforma è <strong>gratuita</strong> per pubblico, utenti registrati e organizzatori.</li>
  <li>Agli artisti sono offerti piani facoltativi. L'abbonamento <strong>si rinnova automaticamente</strong> e si disdice quando vuoi dalla propria area.</li>
  <li>La <strong>disdetta ha effetto alla fine del periodo già pagato</strong>: non perdi i giorni versati.</li>
  <li>Se sottoscrivi in qualità di consumatore, i termini richiamano il <strong>diritto di ripensamento</strong> previsto dal Codice del consumo.</li>
</ul>
<p>Vedi <a href="/help/pagamenti/abbonamento-artista">l'abbonamento artista</a>.</p>

<h2>Cosa non è permesso</h2>
<p>Contenuti illeciti, offensivi o di cui non hai i diritti; spacciarsi per altri; usare la piattaforma per finalità estranee al booking musicale; raccogliere dati di altri utenti. Vedi il <a href="/help/policy/codice-condotta">codice di condotta</a>.</p>

<h2>Una nota di trasparenza</h2>
<p>I documenti legali pubblicati sono in corso di revisione da parte di un professionista. Restano validi come regole d'uso della piattaforma; se qualcosa non ti è chiaro, <a href="/contatti">chiedicelo</a> — preferiamo una domanda in più che un equivoco.</p>
`,
    },

    {
      slug: "codice-condotta",
      title: "Codice di condotta",
      excerpt:
        "Come ci si comporta su N'arte: gli impegni di artisti e organizzatori e cosa succede a chi non li rispetta.",
      updatedAt: UPDATED,
      related: ["contestazioni", "termini-servizio", "organizzatori/lasciare-recensione"],
      content: `
<h2>Il principio</h2>
<p>N'arte funziona perché dall'altra parte c'è quasi sempre qualcuno serio. Bastano poche eccezioni per rovinare l'esperienza di tutti, e questo è il metro con cui valutiamo i comportamenti.</p>

<h2>Vale per tutti</h2>
<ul>
  <li><strong>Rispondi.</strong> Anche un no. Il silenzio è il comportamento che danneggia di più, perché blocca chi aspetta.</li>
  <li><strong>Sii veritiero</strong> su chi sei, cosa fai e cosa offri.</li>
  <li><strong>Mantieni gli impegni presi.</strong> Una data confermata è un impegno reale su cui l'altro conta.</li>
  <li><strong>Comunica in tempo</strong> se qualcosa cambia. Un problema annunciato per tempo si risolve; scoperto all'ultimo, no.</li>
  <li><strong>Tieni un tono civile</strong>, anche in disaccordo.</li>
  <li><strong>Non chiedere di aggirare la piattaforma</strong> per evitare le tracce della trattativa.</li>
</ul>

<h2>Per gli artisti</h2>
<ul>
  <li><strong>Rispondi alle richieste</strong> entro qualche giorno, anche solo per declinare.</li>
  <li><strong>Tieni aggiornato il calendario</strong>: accettare una data che sai occupata fa perdere tempo a tutti.</li>
  <li><strong>Pubblica materiali tuoi e attuali.</strong> Video di altri, o di una formazione che non esiste più, sono una forma di inganno.</li>
  <li><strong>Presentati come concordato</strong>: se la richiesta era per un trio, non presentarti da solo senza averlo detto.</li>
  <li><strong>Rispetta orari e durata</strong> pattuiti.</li>
</ul>

<h2>Per gli organizzatori</h2>
<ul>
  <li><strong>Scrivi richieste concrete</strong>: data, luogo, tipo di serata, budget realistico.</li>
  <li><strong>Non fare promesse che non puoi mantenere</strong> per assicurarti un artista.</li>
  <li><strong>Paga quanto e quando concordato.</strong> È il punto su cui siamo meno flessibili di tutti.</li>
  <li><strong>Chiudi le richieste</strong> che non ti servono più, invece di lasciarle aperte.</li>
  <li><strong>Fornisci quello che hai promesso</strong>: impianto, spazio, condizioni.</li>
  <li><strong>Scrivi recensioni oneste</strong>, basate sui fatti della serata.</li>
</ul>

<h2>Cosa non è tollerato</h2>
<ul>
  <li>Insulti, molestie, discriminazioni di qualunque tipo.</li>
  <li>Profili falsi o furto di identità.</li>
  <li>Contenuti di cui non si hanno i diritti.</li>
  <li>Tentativi di truffa o richieste di denaro anomale. Vedi <a href="/help/policy/sicurezza-account">tenere al sicuro il proprio account</a>.</li>
  <li><strong>Annullamenti ripetuti</strong> di date confermate.</li>
  <li><strong>Mancati pagamenti reiterati</strong>.</li>
  <li>Recensioni false, offensive o riferite a fatti estranei alla serata.</li>
  <li>Uso della piattaforma per raccogliere contatti a fini diversi dal booking.</li>
</ul>

<h2>Cosa succede a chi non rispetta le regole</h2>
<p>Interveniamo in modo proporzionato: quasi sempre basta un richiamo, perché quasi sempre si tratta di leggerezza e non di malafede.</p>
<ol>
  <li><strong>Segnalazione</strong> alla persona interessata, con richiesta di chiarimenti.</li>
  <li><strong>Rimozione</strong> di contenuti o recensioni non conformi.</li>
  <li><strong>Annullamento</strong> di una data, se necessario, con motivazione registrata.</li>
  <li><strong>Limitazione o chiusura dell'account</strong> nei casi gravi o ripetuti.</li>
</ol>

<h2>Come segnalare</h2>
<p><a href="/contatti">Scrivici</a> indicando <strong>chi</strong>, <strong>quando</strong> e <strong>cosa</strong> è successo. Se la vicenda è passata dalla chat, diccelo: possiamo leggerla. Vedi <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>
`,
    },

    {
      slug: "contestazioni",
      title: "Come gestiamo le contestazioni",
      excerpt:
        "Cosa possiamo fare quando qualcosa va storto fra artista e organizzatore, cosa non possiamo fare e come segnalare.",
      updatedAt: UPDATED,
      related: ["codice-condotta", "iniziare/cosa-fa-e-non-fa-narte", "organizzatori/annullare-data"],
      content: `
<h2>Il punto di partenza</h2>
<p>N'arte <strong>non è parte del contratto</strong> fra artista e organizzatore. Questo definisce con precisione cosa possiamo e non possiamo fare, ed è giusto saperlo prima di trovarsi nella situazione.</p>

<h2>Cosa NON possiamo fare</h2>
<ul>
  <li><strong>Non possiamo obbligare nessuno a pagare.</strong> Il denaro non passa dalla piattaforma: non c'è nulla da trattenere o restituire.</li>
  <li><strong>Non possiamo rimborsare</strong> il compenso di una serata, perché non lo abbiamo mai incassato.</li>
  <li><strong>Non possiamo obbligare un artista a esibirsi</strong> né un locale ad aprire.</li>
  <li><strong>Non siamo un arbitro con potere legale</strong>: non stabiliamo chi ha ragione in senso giuridico.</li>
</ul>

<h2>Cosa possiamo fare</h2>
<ul>
  <li><strong>Leggere la conversazione.</strong> Le chat sono tracciate: possiamo ricostruire cosa era stato concordato e quando.</li>
  <li><strong>Verificare il prezzo definitivo</strong>, se registrato con la doppia conferma.</li>
  <li><strong>Ascoltare entrambe le versioni</strong> e provare a far ripartire il dialogo. Nella maggior parte dei casi finisce qui.</li>
  <li><strong>Annullare una data confermata</strong>, con una motivazione registrata.</li>
  <li><strong>Nascondere una recensione</strong> falsa, offensiva o estranea alla serata. Una recensione nascosta non compare più e non pesa sulla media.</li>
  <li><strong>Intervenire sull'account</strong> di chi si comporta in modo scorretto, fino a limitarlo o chiuderlo.</li>
</ul>

<h2>Come segnalare</h2>
<p><a href="/contatti">Scrivi dal modulo contatti</a> indicando:</p>
<ul>
  <li><strong>Chi</strong> — nome dell'artista o dell'organizzatore.</li>
  <li><strong>Quando</strong> — la data dell'evento o della trattativa.</li>
  <li><strong>Cosa è successo</strong>, in modo fattuale.</li>
  <li><strong>Cosa chiedi</strong>: che intervengano sull'altro, che si annulli una data, che si valuti una recensione.</li>
</ul>
<p>Riceverai risposta entro <strong>1-2 giorni lavorativi</strong>.</p>

<h2>Prima di segnalare, prova a parlarne</h2>
<p>La maggioranza dei casi che ci arrivano si risolve con un messaggio diretto. Un ritardo nel pagamento è spesso una svista amministrativa, non un rifiuto. Scrivi in chat, con calma e per iscritto: se poi la cosa non si risolve, quella conversazione diventa la prova migliore che hai.</p>

<h2>Perché conviene restare in piattaforma</h2>
<p>È il consiglio più concreto di questo articolo. Se la trattativa è avvenuta in chat, possiamo leggerla. Se è avvenuta al telefono o su WhatsApp, <strong>non abbiamo nulla</strong> su cui basarci, e la nostra capacità di aiutarti si riduce quasi a zero.</p>

<h2>Quando serve altro</h2>
<p>Per le questioni economiche fra le parti — un compenso non pagato, un danno subito — <strong>la strada è quella ordinaria</strong>: un legale, o gli strumenti di tutela previsti dalla legge. Possiamo fornirti quello che risulta dalla piattaforma sulla tua vicenda, ma non possiamo sostituirci a un procedimento.</p>
`,
    },

    {
      slug: "sicurezza-account",
      title: "Tenere al sicuro il proprio account",
      excerpt:
        "Password, accessi sospetti, truffe ricorrenti nel booking e cosa fare se qualcosa non torna.",
      updatedAt: UPDATED,
      related: ["recupero-password", "cambiare-email", "policy/contestazioni"],
      content: `
<h2>La password</h2>
<p>Il minimo richiesto è <strong>8 caratteri</strong>, ma il minimo non è un buon obiettivo. Tre regole che valgono più di qualunque altra:</p>
<ul>
  <li><strong>Non riusare</strong> la password di altri siti. Se uno di quelli subisce una violazione, chi ottiene le credenziali le prova ovunque.</li>
  <li><strong>Preferisci una frase lunga</strong> a una parola breve con simboli: è più facile da ricordare e più difficile da indovinare.</li>
  <li><strong>Non condividerla</strong>, nemmeno con chi gestisce la tua comunicazione. Se serve un accesso condiviso, <a href="/contatti">parliamone</a>.</li>
</ul>
<p>La cambi quando vuoi dalla sezione Password del tuo profilo.</p>

<h2>La casella email è la vera chiave</h2>
<p>Chi controlla la tua email può reimpostare la password e prendere l'account. Proteggi la casella almeno quanto la piattaforma, e se il tuo provider offre la <strong>verifica in due passaggi</strong>, attivala: è il singolo intervento più efficace.</p>

<h2>Le truffe ricorrenti nel booking</h2>
<p>Non sono specifiche di N'arte, girano ovunque ci siano ingaggi. Le più frequenti:</p>
<ul>
  <li><strong>Il pagamento in eccesso.</strong> Ti mandano più del pattuito e ti chiedono di restituire la differenza. Il pagamento iniziale poi si rivela falso o viene revocato. <strong>Non restituire mai denaro ricevuto in eccesso</strong>: chiedi di annullare e rifare il pagamento corretto.</li>
  <li><strong>L'anticipo per una serata lontanissima</strong> da un contatto mai visto, con fretta ingiustificata.</li>
  <li><strong>La richiesta di spostarsi subito fuori piattaforma</strong>, prima ancora di aver definito qualcosa. Non è di per sé sospetto — molti preferiscono il telefono — ma se si accompagna a insistenza e urgenza, fermati.</li>
  <li><strong>Link a finti moduli di accesso.</strong> N'arte non ti chiederà mai la password via email o in chat.</li>
</ul>

<h2>Come ci comportiamo noi</h2>
<ul>
  <li><strong>Non ti chiederemo mai la password</strong>, per nessun motivo.</li>
  <li>Non ti chiederemo mai <strong>i dati della carta</strong> via email o in chat. I pagamenti dell'abbonamento avvengono solo su Stripe.</li>
  <li>Le nostre email arrivano da un indirizzo del dominio <strong>narte.it</strong>. Nel dubbio, non cliccare: apri il sito digitando l'indirizzo a mano.</li>
</ul>

<h2>Perché conviene restare in chat</h2>
<p>La trattativa in piattaforma resta tracciata e consultabile. Se nasce una contestazione su cosa era stato pattuito, quella conversazione è la prima cosa che il team guarda. Uno scambio su WhatsApp, no.</p>

<h2>Se sospetti un accesso non tuo</h2>
<ol>
  <li><strong>Cambia subito la password</strong> di N'arte.</li>
  <li><strong>Cambia anche quella della casella email</strong>, se pensi che sia stata compromessa.</li>
  <li><a href="/contatti"><strong>Scrivici</strong></a> descrivendo cosa hai notato.</li>
</ol>

<h2>Segnalare un comportamento sospetto</h2>
<p>Se un utente ti chiede denaro in modo anomalo, ti manda link strani o si comporta in modo scorretto, <a href="/contatti">segnalacelo</a> con nome e data della conversazione. Vedi <a href="/help/policy/contestazioni">come gestiamo le contestazioni</a>.</p>
`,
    },

    {
      slug: "contenuti-e-diritti",
      title: "Contenuti e diritti: di chi sono foto, video e musica",
      excerpt:
        "Cosa resta tuo quando carichi materiale, cosa autorizzi facendolo e come comportarsi con i contenuti di altri.",
      updatedAt: UPDATED,
      related: ["termini-servizio", "brand/usare-nome-e-logo", "artisti/video-promo"],
      content: `
<h2>I contenuti restano tuoi</h2>
<p>Foto, video, tracce audio e testi che carichi <strong>restano di chi ne detiene i diritti</strong>. N'arte non ne acquisisce la proprietà.</p>

<h2>Cosa autorizzi caricandoli</h2>
<p>Autorizzi N'arte a <strong>mostrarli sulla piattaforma</strong> e a <strong>promuovere il tuo profilo e gli eventi collegati</strong>. In pratica significa che il tuo materiale può comparire sulla tua pagina pubblica, nelle pagine del roster e nelle comunicazioni con cui presentiamo gli artisti.</p>
<p>Se un contenuto non vuoi che venga usato in questo modo, la soluzione è semplice: non caricarlo.</p>

<h2>Devi avere i diritti su quello che carichi</h2>
<p>È il punto che genera più problemi in buona fede. Caricando un contenuto <strong>dichiari di avere il diritto di usarlo</strong>. Alcuni casi concreti:</p>
<ul>
  <li><strong>Foto scattate da un fotografo</strong>: averle pagate non sempre equivale ad averne i diritti di pubblicazione. Chiedi conferma, e se puoi mettilo per iscritto.</li>
  <li><strong>Video girati da altri</strong>: vale lo stesso. Chiedi il permesso a chi ha ripreso.</li>
  <li><strong>Registrazioni di brani non tuoi</strong>: eseguire una cover dal vivo è una cosa, pubblicarne la registrazione è un'altra. Verifica prima.</li>
  <li><strong>Immagini trovate in rete</strong>: non usarle. Nemmeno se "sono ovunque".</li>
  <li><strong>Foto in cui compaiono altre persone</strong>: se sono riconoscibili e la foto non è di contesto pubblico, serve il loro consenso. Vale anche per i componenti della band.</li>
</ul>

<h2>Le persone della tua formazione</h2>
<p>Se inserisci i nomi dei componenti nel profilo, assicurati che siano d'accordo: quei nomi diventano pubblici. Vale anche per le loro foto.</p>

<h2>Cosa succede in caso di segnalazione</h2>
<p>Se qualcuno segnala che un contenuto viola i suoi diritti, verifichiamo e possiamo <strong>rimuoverlo</strong>. Nei casi ripetuti interveniamo sull'account. Se ritieni che un tuo contenuto sia stato caricato da altri, <a href="/contatti">scrivicelo</a> indicando il profilo e il contenuto.</p>

<h2>I contenuti di N'arte</h2>
<p>Logo, nome, format, testi e materiali della piattaforma appartengono a N'arte. Per usarli ci sono regole precise: vedi <a href="/help/brand/usare-nome-e-logo">usare il nome e il logo</a>.</p>

<h2>Riprese durante una serata</h2>
<p>Se una data nasce su N'arte, mettetevi d'accordo <strong>prima</strong> su chi può riprendere e come si potranno usare le immagini. È uno dei punti della lista in <a href="/help/booking/contratto-modello">cosa mettere per iscritto prima di una data</a>: costa una riga e evita discussioni dopo.</p>
`,
    },
  ],
};
