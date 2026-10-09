import type { HelpCategory } from "@/lib/help/types";

const UPDATED = "2026-10-09";

export const ACCOUNT: HelpCategory = {
  slug: "account",
  title: "Account e profilo",
  description:
    "Accesso, password, email, preferiti, notifiche, dati personali e chiusura dell'account.",
  icon: "user-cog",
  audience: "all",
  articles: [
    {
      slug: "recupero-password",
      title: "Come recuperare la password",
      excerpt:
        "Reimpostare la password dal modulo di accesso, quanto dura il link e cosa fare se l'email non arriva.",
      updatedAt: UPDATED,
      related: ["cambiare-email", "sicurezza-account", "iniziare/come-creare-account"],
      content: `
<h2>La procedura</h2>
<ol>
  <li>Vai su <a href="/login">/login</a>.</li>
  <li>Clicca su <strong>"Password dimenticata"</strong>.</li>
  <li>Inserisci l'email con cui ti sei registrato e invia.</li>
  <li>Apri il messaggio che ricevi e segui il link per impostare la nuova password.</li>
</ol>

<h2>Il link dura 60 minuti</h2>
<p>Dopo quel tempo smette di funzionare, per motivi di sicurezza. Se ti scade, richiedine un altro dalla stessa pagina.</p>

<h2>Se richiedi due volte di seguito</h2>
<p>Fra un invio e il successivo deve passare una <strong>finestra di alcuni minuti</strong>, così nessuno può usare il modulo per riempire di email la casella di un altro. Se richiedi il link due volte a breve distanza, il secondo potrebbe non partire: aspetta qualche minuto e usa il primo messaggio che ti è arrivato.</p>

<h2>Non arriva l'email</h2>
<ul>
  <li>Controlla <strong>spam</strong> e <strong>promozioni</strong>: quasi sempre finisce lì.</li>
  <li>Verifica di aver scritto <strong>l'indirizzo esatto</strong> della registrazione. Se sei un artista, è quello che hai indicato nella candidatura.</li>
  <li>Aggiungi N'arte ai tuoi contatti, così le prossime email non finiranno nello spam.</li>
</ul>
<p>Tieni presente che <strong>il messaggio che vedi a schermo è sempre lo stesso</strong>, che l'indirizzo esista o no. Lo abbiamo fatto apposta, altrimenti chiunque potrebbe usare il modulo per scoprire chi è iscritto a N'arte. Per questo la schermata di conferma non dimostra che l'account esista.</p>

<h2>Cambiare password quando la ricordi</h2>
<p>In questo caso il recupero non ti serve: entra nel tuo profilo e usa la sezione <strong>Password</strong>. La nuova password deve avere <strong>almeno 8 caratteri</strong>.</p>

<h2>Ancora bloccato</h2>
<p><a href="/contatti">Scrivici</a> indicando l'email di registrazione e, se sei un artista, il nome d'arte. Ti aiutiamo a rientrare.</p>
`,
    },

    {
      slug: "notifiche-email",
      title: "Quali email invia N'arte",
      excerpt:
        "L'elenco delle email automatiche di N'arte e del momento in cui partono.",
      updatedAt: UPDATED,
      related: ["booking/tempi-di-risposta", "recupero-password", "privacy-dati"],
      content: `
<h2>Le email che ricevi davvero</h2>
<p>Qui trovi l'elenco completo dei messaggi che la piattaforma invia oggi. Lo teniamo aggiornato perché sapere cosa <em>non</em> arriva conta quanto sapere cosa arriva.</p>

<h3>Registrazione e accesso</h3>
<ul>
  <li><strong>Conferma dell'iscrizione</strong> — al momento della registrazione. Va aperta per attivare l'account.</li>
  <li><strong>Recupero password</strong> — quando lo richiedi. Vedi <a href="/help/account/recupero-password">come recuperare la password</a>.</li>
</ul>

<ul>
  <li><strong>Password cambiata</strong> — ogni volta che la password viene modificata, così ti accorgi subito di un cambio che non hai fatto tu.</li>
</ul>

<h3>Candidatura artista e account organizzatore</h3>
<ul>
  <li><strong>Candidatura ricevuta</strong> — al candidato, subito dopo l'invio.</li>
  <li><strong>Candidatura approvata</strong> — all'artista, con il link per impostare la password e accedere.</li>
  <li><strong>Candidatura non accolta</strong> — al candidato, con la motivazione e il modo per contestare la decisione.</li>
  <li><strong>Richiesta di account organizzatore ricevuta</strong> — quando ti iscrivi come organizzatore.</li>
  <li><strong>Account organizzatore approvato</strong> — quando il team attiva il tuo account.</li>
</ul>

<h3>Booking</h3>
<ul>
  <li><strong>Nuova richiesta di booking</strong> — all'artista.</li>
  <li><strong>Richiesta inviata</strong> — all'organizzatore, come ricevuta.</li>
  <li><strong>L'artista ha accettato</strong> — all'organizzatore, quando la richiesta passa in trattativa.</li>
  <li><strong>L'artista non è disponibile</strong> — all'organizzatore, in caso di rifiuto.</li>
  <li><strong>Data confermata</strong> — a entrambi.</li>
  <li><strong>Richiesta annullata dall'organizzatore</strong> — all'artista.</li>
  <li><strong>Data annullata da N'arte</strong> — a entrambi, con la motivazione.</li>
  <li><strong>Compenso proposto</strong> e <strong>compenso confermato</strong> — quando una delle due parti propone o conferma la cifra finale.</li>
  <li><strong>Promemoria della data</strong> — il giorno prima della serata, a entrambi.</li>
  <li><strong>Invito a lasciare una recensione</strong> — all'organizzatore, il giorno dopo la serata.</li>
</ul>

<h3>Chat</h3>
<ul>
  <li><strong>Nuovo messaggio non letto</strong> — alla controparte, non più di una ogni mezz'ora.</li>
  <li><strong>Nuova offerta</strong> — alla controparte, sempre.</li>
</ul>
<p>Per riservatezza <strong>l'email non riporta mai il testo del messaggio</strong>: lo leggi entrando in piattaforma.</p>

<h3>Abbonamento artista</h3>
<ul>
  <li><strong>Abbonamento attivato</strong>, <strong>pagamento non riuscito</strong> e <strong>abbonamento disdetto</strong> — quando succede.</li>
  <li><strong>Promemoria del rinnovo</strong> — prima del rinnovo dell'abbonamento annuale.</li>
</ul>
<p>Ricevute e fatture arrivano da Stripe, e lo stato del piano è sempre visibile in <strong>/dashboard/abbonamento</strong>.</p>

<h3>Consulenza, contatti e segnalazioni</h3>
<ul>
  <li><strong>Appuntamento confermato</strong> — a chi prenota una consulenza, e un <strong>promemoria</strong> il giorno prima.</li>
  <li><strong>Conferma di ricezione</strong> — a chi scrive dal modulo contatti o invia una segnalazione, e poi l'<strong>esito</strong> della segnalazione.</li>
  <li><strong>Decisioni del team</strong> — se un tuo contenuto o il tuo account viene limitato, con la motivazione e il link per contestare.</li>
</ul>

<p>Al momento non inviamo newsletter periodiche.</p>

<h2>Si possono disattivare?</h2>
<p>Le email <strong>di servizio non si disattivano</strong>, perché fanno parte del funzionamento della piattaforma: senza l'avviso di una nuova richiesta di booking rischieresti di perderla.</p>
<p>Il consenso facoltativo alle comunicazioni promozionali, invece, puoi darlo o negarlo quando ti registri. Per revocarlo <a href="/contatti">scrivici</a>: vedi <a href="/help/account/privacy-dati">privacy e dati personali</a>.</p>

<h2>Non ricevo niente</h2>
<ul>
  <li>Controlla <strong>spam</strong> e <strong>promozioni</strong>.</li>
  <li>Aggiungi il mittente ai contatti.</li>
  <li>Con caselle aziendali, i filtri possono bloccare i messaggi automatici: chiedi al tuo amministratore.</li>
  <li>Se manca qualcosa che secondo questo elenco dovrebbe arrivare, <a href="/contatti">segnalacelo</a>.</li>
</ul>
`,
    },

    {
      slug: "preferiti",
      title: "Come funzionano i preferiti",
      excerpt:
        "Salvare gli artisti che ti interessano, cosa succede ai preferiti se non hai un account e come si ritrovano dopo l'accesso.",
      updatedAt: UPDATED,
      related: [
        "iniziare/come-creare-account",
        "organizzatori/trovare-artista",
        "privacy-dati",
      ],
      content: `
<h2>A cosa servono</h2>
<p>Il cuore che trovi sulla scheda di un artista lo salva fra i tuoi preferiti. Ti serve per mettere da parte una rosa di nomi mentre valuti chi scritturare, senza tenere dieci schede aperte nel browser.</p>

<h2>Senza account</h2>
<p>Puoi usarli anche così: in questo caso restano <strong>nella memoria del tuo browser</strong>, non sui nostri server. Questo significa che:</p>
<ul>
  <li>Li vedi <strong>solo su quel dispositivo e con quel browser</strong>.</li>
  <li>Si perdono se cancelli i dati di navigazione o usi una finestra anonima.</li>
</ul>

<h2>Con un account</h2>
<p>I preferiti vengono salvati sul tuo account: li ritrovi da qualunque dispositivo e non si perdono.</p>
<p><strong>Quando ti registri o accedi, i preferiti che avevi salvato nel browser vengono importati automaticamente</strong> sul tuo account, senza che tu debba rifare nulla.</p>

<h2>Dove li trovi</h2>
<p>Dal menu dei preferiti, disponibile nell'intestazione del sito.</p>

<h2>L'artista sa che l'ho salvato?</h2>
<p>No, non sa <strong>chi</strong> lo ha salvato. Gli artisti con il piano Max vedono solo <strong>quante volte</strong> il loro profilo è finito fra i preferiti, come dato aggregato, senza nomi né contatti. Vedi <a href="/help/artisti/statistiche-profilo">le statistiche del profilo</a>.</p>

<h2>Salvare non è prenotare</h2>
<p>Mettere un artista fra i preferiti <strong>non gli invia alcuna notifica</strong> e non avvia nessuna richiesta. Per contattarlo devi inviare una <a href="/help/organizzatori/richiedere-booking">richiesta di booking</a>.</p>
`,
    },

    {
      slug: "cambiare-email",
      title: "Cambiare l'email dell'account",
      excerpt:
        "L'indirizzo di accesso non si modifica dall'area riservata: ecco come richiederne la variazione e cosa comporta.",
      updatedAt: UPDATED,
      related: ["recupero-password", "sicurezza-account", "eliminare-account"],
      content: `
<h2>Al momento non si cambia da soli</h2>
<p>Nella sezione account puoi modificare <strong>nome visualizzato</strong>, <strong>foto profilo</strong> e <strong>password</strong>. L'<strong>email di accesso</strong>, invece, la vedi ma non puoi modificarla dall'interfaccia.</p>
<p>Per cambiarla devi <a href="/contatti">scrivere al team</a>.</p>

<h2>Cosa scrivere nella richiesta</h2>
<ul>
  <li>L'<strong>indirizzo attuale</strong> con cui accedi.</li>
  <li>Il <strong>nuovo indirizzo</strong> che vuoi usare.</li>
  <li>Se sei un artista, il <strong>nome d'arte</strong>.</li>
</ul>
<p>Se riesci ancora ad accedere alla casella, <strong>manda la richiesta dall'indirizzo attuale</strong>: così ci confermi subito che sei tu. Se invece l'hai persa, scrivicelo e verificheremo la tua identità in un altro modo prima di procedere, perché cambiare l'email di un account è un'operazione delicata.</p>

<h2>Cosa cambia dopo</h2>
<ul>
  <li>Accedi con il <strong>nuovo indirizzo</strong>; la password resta la stessa.</li>
  <li>Tutte le <strong>notifiche</strong> arrivano al nuovo indirizzo.</li>
  <li>Profilo, richieste, chat, recensioni e abbonamento <strong>restano intatti</strong>.</li>
</ul>

<h2>Se hai perso l'accesso alla casella</h2>
<p>Se non puoi più leggere la vecchia email, <strong>non riesci nemmeno a recuperare la password</strong>, perché il link di reimpostazione arriverebbe proprio lì. In questo caso scrivici direttamente, senza passare dal recupero.</p>

<h2>Ho due account per sbaglio</h2>
<p>Capita di essersi registrati con un indirizzo e poi di aver mandato la candidatura artista con un altro. <a href="/contatti">Segnalacelo</a> indicando entrambi gli indirizzi: vediamo insieme come sistemare le cose senza perdere i dati.</p>
`,
    },

    {
      slug: "privacy-dati",
      title: "Privacy e dati personali",
      excerpt:
        "Quali dati raccogliamo, chi li vede, perché non usiamo strumenti di tracciamento e come esercitare i tuoi diritti.",
      updatedAt: UPDATED,
      related: ["eliminare-account", "notifiche-email", "policy/contenuti-e-diritti"],
      content: `
<h2>I documenti ufficiali</h2>
<p>Qui trovi un riassunto in parole semplici. I testi che fanno fede sono l'<a href="/privacy">informativa privacy</a>, la <a href="/cookie-policy">cookie policy</a> e i <a href="/termini">termini d'uso</a>: se qualcosa non coincide, valgono quelli.</p>

<h2>Quali dati raccogliamo</h2>
<ul>
  <li><strong>Se ti registri</strong>: nome, email e password. La password non la vediamo mai: viene custodita in forma cifrata dal fornitore di autenticazione.</li>
  <li><strong>Se sei un artista</strong>: nome d'arte, biografia, generi, strumenti, città, social e i file che carichi (foto, audio, video).</li>
  <li><strong>Se sei un organizzatore</strong>: i dati del tuo profilo e quelli delle strutture, indirizzo e capienza compresi.</li>
  <li><strong>Quando usi la piattaforma</strong>: richieste di booking, messaggi in chat con allegati e note vocali, prenotazioni di consulenza, recensioni.</li>
</ul>

<h2>Cookie e strumenti di misurazione</h2>
<p>I cookie necessari a far funzionare il sito non si possono disattivare: quello che tiene aperta la sessione dopo l'accesso e, per chi gestisce più profili artista, quello che ricorda il profilo attivo. Nella memoria del browser restano inoltre i <a href="/help/account/preferiti">preferiti</a> salvati senza account.</p>
<p><strong>Tutto il resto non parte senza il tuo consenso.</strong> Statistiche di navigazione, strumenti pubblicitari e il riproduttore dei video di terze parti sono bloccati finché non li accetti: non vengono nemmeno caricati. Al primo accesso trovi un banner con le scelte separate per finalità, e rifiutare è semplice quanto accettare.</p>
<p>Puoi cambiare idea in qualunque momento dal collegamento <strong>«Preferenze cookie»</strong> in fondo a ogni pagina. L'elenco aggiornato degli strumenti in uso è nella <a href="/cookie-policy">cookie policy</a>, che fa fede.</p>

<h2>Le statistiche del profilo</h2>
<p>Le visite ai profili artista vengono conteggiate <strong>senza conservare il tuo indirizzo IP</strong>: viene trasformato in un codice non riconducibile a te, che serve solo a non contare due volte la stessa visita nella stessa giornata. Gli artisti sanno <em>quanti</em> hanno visitato il profilo, mai <em>chi</em>.</p>

<h2>Chi vede cosa</h2>
<ul>
  <li>Il tuo <strong>profilo pubblico</strong>, se sei un artista, è visibile a chiunque abbia un account.</li>
  <li>Un <strong>artista</strong> vede i dati di contatto di chi gli invia una richiesta: è necessario per organizzare la serata.</li>
  <li>Un <strong>organizzatore</strong> vede il profilo pubblico dell'artista.</li>
  <li>Il <strong>team N'arte</strong> ha accesso ai dati della piattaforma, incluso il contenuto delle conversazioni, per poter intervenire in caso di contestazione. È scritto nell'informativa, ma preferiamo dirtelo chiaramente anche qui.</li>
</ul>

<h2>A chi trasmettiamo i dati</h2>
<p>Solo ai fornitori tecnici che permettono al servizio di funzionare: chi ospita il sito, chi gestisce il database e i file, chi consegna le email e, per gli abbonamenti, Stripe. <strong>I dati della tua carta non transitano mai dai nostri sistemi</strong>: li gestisce direttamente Stripe e noi non li vediamo.</p>
<p>Non vendiamo dati a nessuno.</p>

<h2>I compensi non passano da noi</h2>
<p>Il pagamento dell'ingaggio avviene direttamente fra artista e organizzatore, quindi <strong>non trattiamo coordinate bancarie né dati di fatturazione</strong> relativi alle serate.</p>

<h2>I tuoi diritti</h2>
<p>Dalla pagina <a href="/account/i-miei-dati"><strong>I miei dati</strong></a> puoi fare da solo quattro cose:</p>
<ul>
  <li><strong>vedere cosa hai accettato</strong>, con versione e data di ogni consenso;</li>
  <li><strong>scaricare una copia</strong> dei tuoi dati in un file leggibile;</li>
  <li><strong>revocare il consenso</strong> alle comunicazioni promozionali;</li>
  <li><strong>chiedere la cancellazione</strong> dell'account.</li>
</ul>
<p>Per correggere un dato sbagliato basta il tuo profilo. Per limitare il trattamento od opporti, <a href="/contatti">scrivici</a>. Hai inoltre il diritto di rivolgerti al Garante per la protezione dei dati personali.</p>

<h2>Per quanto teniamo i dati</h2>
<p>Finché il tuo account resta attivo. Se lo elimini, i dati collegati vengono cancellati, salvo quanto siamo tenuti a conservare per obbligo di legge, per esempio i documenti contabili degli abbonamenti. Vedi <a href="/help/account/eliminare-account">eliminare il proprio account</a>.</p>
`,
    },

    {
      slug: "eliminare-account",
      title: "Eliminare il proprio account",
      excerpt:
        "Come richiedere la chiusura dell'account, cosa viene cancellato, cosa resta e le alternative da valutare prima.",
      updatedAt: UPDATED,
      related: ["privacy-dati", "cambiare-email", "pagamenti/abbonamento-artista"],
      content: `
<h2>Come si richiede</h2>
<p>Dalla pagina <a href="/account/i-miei-dati"><strong>I miei dati</strong></a>, in fondo: da lì la richiesta parte già collegata al tuo account e non devi dirci chi sei. È la strada più rapida.</p>
<p>In alternativa <a href="/contatti">scrivici dal modulo contatti</a> indicando che vuoi eliminare l'account, l'<strong>email di registrazione</strong> e, se sei un artista, il <strong>nome d'arte</strong>.</p>
<p><strong>Perché non c'è un pulsante che cancella tutto all'istante.</strong> Qui la cancellazione coinvolge più cose insieme: contenuti pubblicati, file archiviati, conversazioni che hanno due lati e documenti che la legge ci obbliga a tenere. Un pulsante che promettesse di eliminare tutto, e poi ne eliminasse solo una parte, ti direbbe una cosa falsa. Per questo registriamo la richiesta, la confermiamo con te e la completiamo entro un mese, come prevede la legge.</p>
<p>Manda la richiesta dall'indirizzo con cui sei registrato, così ci confermi che sei tu. Visto che la cancellazione è irreversibile, verifichiamo sempre l'identità prima di procedere.</p>

<h2>Prima, tre cose da valutare</h2>

<h3>1. Se sei un artista, disdici l'abbonamento</h3>
<p>Se hai un piano a pagamento attivo, <strong>disdicilo prima</strong> dal portale di fatturazione in <strong>/dashboard/abbonamento</strong>. Vedi <a href="/help/pagamenti/abbonamento-artista">l'abbonamento artista</a>.</p>

<h3>2. Chiudi le date in sospeso</h3>
<p>Se hai richieste in trattativa o <strong>date confermate non ancora svolte</strong>, avvisa la controparte in chat prima di chiudere l'account: dall'altra parte c'è qualcuno che conta su quella serata.</p>

<h3>3. Scarica quello che ti serve</h3>
<p>Foto, video, tracce audio e conversazioni non saranno più recuperabili. Se ci sono materiali che vuoi conservare, salvali prima.</p>

<h2>Cosa viene cancellato</h2>
<ul>
  <li>L'accesso e i dati del profilo.</li>
  <li>Il profilo artista pubblico, se ne hai uno, e i file caricati.</li>
  <li>I preferiti e le preferenze.</li>
</ul>

<h2>Cosa può restare</h2>
<p>Alcune cose, invece, possono rimanere:</p>
<ul>
  <li><strong>I documenti contabili</strong> degli abbonamenti, che siamo tenuti a conservare per obbligo di legge.</li>
  <li><strong>I messaggi che hai inviato in chat</strong> restano visibili alla controparte, come succede in qualunque conversazione a due: la copia dell'altra persona non possiamo cancellarla.</li>
  <li><strong>Le recensioni che hai scritto</strong> possono restare sul profilo dell'artista, prive del riferimento a te.</li>
  <li>Riferimenti a <strong>date già svolte</strong>, per la coerenza dello storico della controparte.</li>
</ul>

<h2>Un'alternativa</h2>
<p>Se ricevi troppe richieste o per un periodo non sei disponibile, <strong>non c'è bisogno di cancellare l'account</strong>: da artista puoi segnare le date come occupate con la modifica in massa del <a href="/help/booking/calendario-disponibilita">calendario</a>, e tornare quando vuoi. Se invece il problema è l'abbonamento, puoi passare al piano gratuito.</p>

<h2>Posso tornare indietro?</h2>
<p>No. Dopo la cancellazione l'account non si recupera: per rientrare bisogna registrarsi da capo e, per gli artisti, ripresentare la candidatura.</p>
`,
    },
  ],
};
