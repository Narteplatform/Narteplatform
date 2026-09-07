import type { HelpCategory } from "@/lib/help/types";
import { ENTITLEMENTS, PLAN_LABELS } from "@/lib/billing/plans";

const UPDATED = "2026-09-07";

export const CONSULENZA: HelpCategory = {
  slug: "consulenza",
  title: "Consulenza N'arte",
  description:
    "Le sessioni con un consulente del team, riservate agli artisti abbonati: come prenotarle e come sfruttarle.",
  icon: "phone",
  audience: "artist",
  articles: [
    {
      slug: "prenotare-chiamata",
      title: "Come prenotare una consulenza",
      excerpt:
        "Chi può prenotare, quante sessioni sono incluse nel proprio piano, come si sceglie lo slot e cosa succede dopo.",
      updatedAt: UPDATED,
      related: [
        "prepararsi-alla-consulenza",
        "annullare-consulenza",
        "artisti/tier-pro-max",
      ],
      content: `
<h2>A chi è riservata</h2>
<p>La consulenza N'arte è una sessione individuale con un consulente del team, <strong>riservata agli artisti con un abbonamento attivo</strong>. Si prenota dall'area riservata, non esiste una pagina pubblica di prenotazione.</p>
<p>Quante sessioni hai a disposizione dipende dal piano:</p>
<ul>
  <li><strong>${PLAN_LABELS.free}</strong> — non inclusa</li>
  <li><strong>${PLAN_LABELS.pro}</strong> — ${ENTITLEMENTS.pro.consultationsPerMonth} sessione al mese</li>
  <li><strong>${PLAN_LABELS.max}</strong> — illimitate</li>
</ul>
<p>Non c'è nulla da pagare al momento della prenotazione: la sessione è compresa nell'abbonamento che hai già.</p>

<h2>Come si prenota</h2>
<ol>
  <li>Vai su <strong>/dashboard/consulenza</strong> — nella barra laterale la voce è <strong>"Consulente N'arte"</strong>.</li>
  <li>Nel calendario, scegli un giorno con il <strong>pallino verde</strong>: sono quelli con slot liberi.</li>
  <li>Seleziona <strong>orario e consulente</strong> fra quelli disponibili.</li>
  <li>Se vuoi, scrivi <strong>cosa vorresti discutere</strong>. È facoltativo ma cambia molto la qualità della sessione: il consulente arriva preparato.</li>
  <li>Premi <strong>"Conferma appuntamento"</strong>.</li>
</ol>

<h2>La conferma è immediata</h2>
<p>Non c'è alcuna approvazione da attendere: l'appuntamento è <strong>confermato nell'istante in cui prenoti</strong>. Ricevi un'email di conferma con data e ora, e il team viene avvisato.</p>

<h2>Quanto dura</h2>
<p>Di norma <strong>30 minuti</strong>. Alcuni slot possono avere una durata diversa, indicata nella scheda dello slot.</p>

<h2>Se non ci sono slot liberi</h2>
<p>Gli slot vengono aperti dal team periodicamente e ognuno accetta <strong>una sola prenotazione</strong>. Se il calendario è vuoto, riprova nei giorni successivi: se ne aggiungono di nuovi con regolarità.</p>

<h2>Quando la quota è esaurita</h2>
<p>Con il piano ${PLAN_LABELS.pro} hai una sessione al mese. Se l'hai già usata, la piattaforma te lo dice: <strong>la quota si rinnova il primo giorno del mese</strong>. Con ${PLAN_LABELS.max} non c'è limite.</p>

<h2>E se sono un organizzatore?</h2>
<p>La prenotazione automatica è riservata agli artisti abbonati. Se sei un organizzatore o un brand e vuoi essere seguito nella scelta di un artista o nella costruzione di una serata, <a href="/contatti">scrivici dal modulo contatti</a> descrivendo cosa hai in mente: il team ti risponde e valuta come aiutarti.</p>
`,
    },

    {
      slug: "prepararsi-alla-consulenza",
      title: "Come prepararsi alla consulenza",
      excerpt:
        "Trenta minuti passano in fretta: cosa preparare prima, che domande portare e come ottenere il massimo dalla sessione.",
      updatedAt: UPDATED,
      related: ["prenotare-chiamata", "artisti/ottimizza-profilo", "artisti/video-promo"],
      content: `
<h2>Arriva con una domanda, non con un tema</h2>
<p>Mezz'ora è poca. "Parliamo del mio progetto" consuma dieci minuti solo per inquadrare la situazione. <strong>"Il mio profilo riceve poche richieste, dove sbaglio?"</strong> è una domanda su cui si può lavorare subito.</p>
<p>Scrivi la domanda nel campo facoltativo al momento della prenotazione: il consulente arriva già preparato e non si parte da zero.</p>

<h2>Cosa preparare prima</h2>
<ul>
  <li><strong>Il profilo aggiornato.</strong> Se è a metà, buona parte della sessione se ne andrà a dire cosa manca — cosa che puoi già leggere in <a href="/help/artisti/ottimizza-profilo">come ottimizzare il profilo</a>.</li>
  <li><strong>I numeri, se li hai.</strong> Con il piano ${PLAN_LABELS.max} porta le <a href="/help/artisti/statistiche-profilo">statistiche</a>: visite, quante da organizzatori, richieste ricevute.</li>
  <li><strong>Cosa hai già provato</strong> e cosa non ha funzionato.</li>
  <li><strong>Un obiettivo concreto</strong>: più date, date meglio pagate, entrare in un certo tipo di locale, cambiare tipo di serata.</li>
</ul>

<h2>Le domande che funzionano meglio</h2>
<ul>
  <li>Il mio profilo <strong>comunica quello che faccio davvero</strong>?</li>
  <li>La mia <strong>fascia di prezzo</strong> è coerente con quello che offro?</li>
  <li>Il <strong>video</strong> che ho caricato funziona o va rifatto?</li>
  <li>Sto puntando al <strong>tipo di locale sbagliato</strong>?</li>
  <li>Conviene tenere tutto in un profilo o <a href="/help/artisti/profili-multipli">separare i progetti</a>?</li>
  <li>Come rispondo a una richiesta con <strong>budget troppo basso</strong> senza chiudere la porta?</li>
</ul>

<h2>Cosa la consulenza non è</h2>
<p>È utile saperlo per non restare delusi. Il consulente <strong>non può garantirti date</strong>, non fa da agente e non contatta i locali al posto tuo. Il lavoro è sul posizionamento, sul profilo e sul modo in cui ti proponi.</p>
<p>La candidatura agli eventi N'arte è una cosa diversa, inclusa nel piano ${PLAN_LABELS.max} e curata dal team.</p>

<h2>Dopo</h2>
<p>Prendi appunti e <strong>applica una cosa sola</strong>, subito. Un video rifatto vale più di dieci consigli annotati e mai messi in pratica. Se hai il piano ${PLAN_LABELS.max} puoi riprenotare senza limiti e verificare i risultati nella sessione successiva.</p>
`,
    },

    {
      slug: "annullare-consulenza",
      title: "Annullare o spostare una consulenza",
      excerpt:
        "Come disdire un appuntamento già confermato, entro quando avvisare e cosa succede alla quota del tuo piano.",
      updatedAt: UPDATED,
      related: ["prenotare-chiamata", "prepararsi-alla-consulenza", "account/notifiche-email"],
      content: `
<h2>Come si annulla</h2>
<p>Al momento <strong>l'annullamento non si esegue dalla dashboard</strong>: per disdire o spostare un appuntamento già confermato devi <a href="/contatti">scrivere al team</a> dal modulo contatti.</p>
<p>Nel messaggio indica il <strong>giorno e l'ora</strong> dell'appuntamento e il <strong>nome d'arte</strong> con cui hai prenotato: bastano a individuarlo senza scambi ulteriori.</p>

<h2>Entro quando avvisare</h2>
<p>Il prima possibile, e comunque <strong>almeno 24 ore prima</strong>. Ogni slot accetta una sola prenotazione: disdire per tempo lo rende di nuovo disponibile per un altro artista. Disdire un'ora prima significa semplicemente sprecarlo.</p>

<h2>La quota del mio piano viene restituita?</h2>
<p>Se hai il piano ${PLAN_LABELS.pro}, che include una sessione al mese, e devi annullare, <strong>segnalalo nel messaggio</strong>: il team valuta la situazione. In ogni caso la quota si <strong>rinnova il primo giorno di ogni mese</strong>, quindi al massimo si tratta di attendere il mese nuovo.</p>
<p>Con il piano ${PLAN_LABELS.max} la questione non si pone: le sessioni sono illimitate e puoi semplicemente riprenotare.</p>

<h2>Spostare invece di annullare</h2>
<p>Se il problema è solo l'orario, scrivilo: è più semplice riassegnarti a uno slot libero che annullare e ricominciare.</p>

<h2>Se salti l'appuntamento</h2>
<p>Non ci sono penali. Ma un consulente ha tenuto libera quella mezz'ora, e un altro artista non ha potuto prenotarla: un messaggio in anticipo, anche breve, è la cosa giusta da fare.</p>
`,
    },

    {
      slug: "diventa-consulente",
      title: "Vuoi diventare consulente N'arte?",
      excerpt:
        "Chi sono i consulenti, che competenze cerchiamo e come proporsi per collaborare con il team.",
      updatedAt: UPDATED,
      related: ["prenotare-chiamata", "iniziare/differenze-ruoli", "policy/codice-condotta"],
      content: `
<h2>Chi sono i consulenti</h2>
<p>Sono professionisti che tengono le sessioni individuali con gli artisti abbonati: lavorano sul posizionamento del progetto, sul profilo, sul modo di proporsi agli organizzatori e sulla strategia di crescita.</p>
<p>Sul profilo di ciascuno compaiono nome, ruolo e una breve biografia: l'artista vede con chi sta prenotando.</p>

<h2>Che competenze cerchiamo</h2>
<p>Non un titolo particolare, ma esperienza reale e verificabile in almeno uno di questi ambiti:</p>
<ul>
  <li><strong>Booking e direzione artistica</strong> — chi ha programmato locali, rassegne o festival e sa cosa cerca chi sta dall'altra parte.</li>
  <li><strong>Management di artisti</strong> — chi ha seguito progetti emergenti nella crescita.</li>
  <li><strong>Comunicazione e promozione musicale</strong> — press kit, social, rapporti con la stampa.</li>
  <li><strong>Produzione e live</strong> — chi conosce il palco dal lato tecnico e organizzativo.</li>
</ul>
<p>Conta soprattutto una cosa: <strong>saper dare un consiglio concreto in mezz'ora</strong>. Non è un talk, è una sessione operativa.</p>

<h2>Come proporsi</h2>
<p>Non c'è un modulo dedicato: si passa dal <a href="/contatti">modulo contatti</a>. Scrivi indicando come oggetto che ti proponi come consulente, e nel messaggio:</p>
<ul>
  <li><strong>Chi sei</strong> e cosa fai oggi.</li>
  <li><strong>Su cosa potresti dare consulenza</strong>, in concreto.</li>
  <li><strong>Esperienze verificabili</strong>: locali, festival, artisti seguiti, progetti.</li>
  <li><strong>Quanta disponibilità</strong> avresti, indicativamente, ogni mese.</li>
  <li>Un <strong>link</strong> al tuo profilo professionale o al tuo sito.</li>
</ul>

<h2>Come funziona la collaborazione</h2>
<p>Il team valuta le proposte e, se c'è interesse, ti contatta per conoscerti. I consulenti attivi hanno un accesso dedicato alla piattaforma, limitato ai propri appuntamenti e al proprio profilo: gli slot vengono concordati e resi prenotabili dagli artisti.</p>

<h2>Sono un artista del roster: posso candidarmi?</h2>
<p>Sì, non c'è incompatibilità di principio: molti artisti con anni di esperienza hanno esattamente le competenze che servono. Scrivilo nel messaggio, così valutiamo insieme.</p>
`,
    },
  ],
};
