/**
 * Contenuti della landing "Sei un artista?" (/candidatura-artista).
 *
 * Il testo sta qui e non dentro i componenti perché è la parte che si riscrive
 * più spesso: si cambia una frase senza aprire il JSX. I componenti restano
 * stupidi e riusabili.
 *
 * Le icone sono chiavi stringa e non JSX: così questo file resta `.ts`, non
 * importa lucide-react e non finisce nel bundle di ogni pagina che lo tocca.
 * La mappa chiave → icona vive nel componente che la consuma.
 */

export type BenefitIcon = "search" | "profile" | "calendar" | "wallet";

export type Benefit = {
  icon: BenefitIcon;
  title: string;
  desc: string;
};

export type Step = {
  title: string;
  desc: string;
  /** Nota breve sotto lo step: tempo richiesto, costo, vincolo. */
  meta: string;
};

export type ComparisonRow = {
  label: string;
  alone: string;
  withNarte: string;
};

export type Testimonial = {
  name: string;
  role: string;
  city: string;
  quote: string;
  photo: string | null;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type ProfileAnnotation = {
  title: string;
  desc: string;
};

// =========================================
// Benefici
// =========================================

export const BENEFITS: Benefit[] = [
  {
    icon: "search",
    title: "Ti cercano loro",
    desc: "Locali e organizzatori filtrano per genere, città e data. Quando corrispondi, la richiesta arriva a te — senza che tu abbia mandato niente a nessuno.",
  },
  {
    icon: "profile",
    title: "Un link al posto di dieci messaggi",
    desc: "Video, foto, generi, formazione, durata del set e cosa ti serve sul palco. Tutto in una pagina sola, invece che sparso fra Instagram, YouTube e WhatsApp.",
  },
  {
    icon: "calendar",
    title: "Le disponibilità le scrivi una volta",
    desc: "Segni sul calendario quando sei libero. Chi ti cerca lo vede prima di scriverti, e finisce il ping pong di messaggi per capire se il 14 sei in giro.",
  },
  {
    icon: "wallet",
    title: "Il tuo cachet è già sul tavolo",
    desc: "La fascia di prezzo sta sul profilo. Chi apre la chat sa già che cifra ha davanti, e la trattativa parte da lì invece che da zero ogni volta.",
  },
];

// =========================================
// Come funziona
// =========================================

export const STEPS: Step[] = [
  {
    title: "Mandi la candidatura",
    desc: "Nome d’arte, genere, città e un paio di link dove ti si sente suonare. Non serve un press kit.",
    meta: "2 minuti",
  },
  {
    title: "La guardiamo davvero",
    desc: "La legge una persona, non un filtro automatico. Se qualcosa non torna te lo scriviamo, invece di lasciarti senza risposta.",
    meta: "Risposta via email",
  },
  {
    title: "Costruisci il profilo",
    desc: "Foto, video, generi, formazione, fascia di cachet e calendario. È la pagina che gli organizzatori vedranno al posto tuo.",
    meta: "Gratis, per sempre",
  },
  {
    title: "Ricevi le richieste",
    desc: "Chi cerca un artista come te ti trova e ti scrive. Tu leggi, valuti e rispondi.",
    meta: "Richieste illimitate",
  },
];

// =========================================
// Confronto
// =========================================

export const COMPARISON: ComparisonRow[] = [
  {
    label: "Trovare le date",
    alone: "Scrivi ai locali uno per uno e speri che qualcuno apra il messaggio.",
    withNarte: "Gli organizzatori cercano per genere, città e data. Se corrispondi, ti trovano.",
  },
  {
    label: "Presentarti",
    alone: "Un link a Instagram, tre video mandati in DM e un audio su WhatsApp.",
    withNarte: "Una pagina con video, foto, generi, formazione e cosa ti serve sul palco.",
  },
  {
    label: "Il cachet",
    alone: "Ogni volta si riparte da zero e spesso lo dici per primo tu.",
    withNarte: "La fascia è scritta sul profilo. Chi ti scrive parte già da quella.",
  },
  {
    label: "Le disponibilità",
    alone: "Venti messaggi avanti e indietro per scoprire che quella sera suoni altrove.",
    withNarte: "Il calendario è pubblico e lo aggiorni tu. Chi ti cerca lo vede prima.",
  },
  {
    label: "Quando ti fermi",
    alone: "Se smetti di scrivere, smetti di suonare.",
    withNarte: "Il profilo continua a lavorare anche mentre sei in sala prove.",
  },
];

// =========================================
// Anteprima del profilo
// =========================================

export const PROFILE_ANNOTATIONS: ProfileAnnotation[] = [
  {
    title: "La foto e il nome d’arte",
    desc: "È la prima cosa che vede chi sta scorrendo trenta profili. Con Max lo shooting lo facciamo noi.",
  },
  {
    title: "Generi e formazione",
    desc: "Quanti siete sul palco, che strumenti, quanto dura il set. Le domande che ti farebbero comunque, con la risposta già pronta.",
  },
  {
    title: "Video e ascolti",
    desc: "Un live vale più di qualsiasi biografia. Carichi i video e chi ti guarda capisce in trenta secondi.",
  },
  {
    title: "Calendario e cachet",
    desc: "Le sere libere e la fascia di prezzo. Chi apre la chat ha già le due informazioni che servono per decidere.",
  },
];

// =========================================
// Storie di artisti
// =========================================
//
// ⚠️ SEGNAPOSTO — DA SOSTITUIRE PRIMA DELLA PUBBLICAZIONE.
// Nomi e foto sono volutamente generici: testimonianze inventate ma credibili
// su una pagina di acquisizione sono una bugia agli artisti che la leggono, e
// il primo che chiede "chi è questa persona?" brucia la fiducia di tutta la
// pagina. Le citazioni qui sotto mostrano il livello di specificità da
// cercare — sostituiscile con frasi vere del roster e foto reali in
// public/testimonials/.

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Nome dell’artista",
    role: "Cantautrice",
    city: "Napoli",
    quote:
      "Prima suonavo tre volte l’anno e le date me le trovavo scrivendo ai locali. Nei primi due mesi sul profilo mi hanno scritto in cinque, e con tre ci ho suonato.",
    photo: "/testimonials/artista-1.jpg",
  },
  {
    name: "Nome della band",
    role: "Quartetto rock",
    city: "Caserta",
    quote:
      "La cosa che ci ha cambiato la vita è il calendario. Prima passavamo la settimana a rispondere “no, quella sera no”. Adesso lo leggono da soli.",
    photo: "/testimonials/artista-2.jpg",
  },
  {
    name: "Nome dell’artista",
    role: "DJ e producer",
    city: "Salerno",
    quote:
      "Avere il cachet scritto sul profilo mi ha tolto la parte peggiore del lavoro. Chi mi scrive sa già la cifra e non devo più dirla io per primo.",
    photo: "/testimonials/artista-3.jpg",
  },
];

// =========================================
// FAQ
// =========================================

export const FAQ: FaqItem[] = [
  {
    id: "costo",
    question: "Quanto costa stare su N’arte?",
    answer:
      "Il profilo è gratuito e non scade. Con il piano Free hai la pagina pubblica, il calendario e richieste di booking illimitate: ricevi tutto e ti avvisiamo via email. I piani a pagamento servono se vuoi rispondere in chat, caricare più materiale o avere priorità nei risultati.",
  },
  {
    id: "commissioni",
    // TODO Eduardo: confermare. Nel codice non esiste alcuna logica di
    // trattenuta sui cachet — il modello è l’abbonamento — ma è un’affermazione
    // commerciale e va confermata da te prima di andare online.
    question: "N’arte prende una percentuale sul mio cachet?",
    answer:
      "No. Quello che concordi con l’organizzatore resta tuo per intero. N’arte si sostiene con gli abbonamenti, non con una trattenuta sui tuoi ingaggi.",
  },
  {
    id: "chi",
    question: "Chi può candidarsi?",
    answer:
      "Musicisti solisti, band, DJ, cantautori, performer. Non serve avere un disco fuori o un numero minimo di follower: serve che ci sia qualcosa da ascoltare. Se stai iniziando adesso, mandaci comunque due link.",
  },
  {
    id: "tempi",
    question: "Quanto ci vuole per essere approvato?",
    answer:
      "Le candidature le guardiamo a mano, una per una, e rispondiamo via email. Se manca qualcosa te lo diciamo invece di lasciarti senza risposta: nessuna candidatura sparisce nel vuoto.",
  },
  {
    id: "cachet",
    question: "Chi decide quanto mi faccio pagare?",
    answer:
      "Tu. Scrivi la tua fascia sul profilo e la cambi quando vuoi. Noi non fissiamo tariffe e non trattiamo al posto tuo: serve solo a far arrivare richieste già in linea con quello che chiedi.",
  },
  {
    id: "esclusiva",
    question: "Devo lavorare in esclusiva con voi?",
    answer:
      "No. Continui a suonare dove vuoi, con chi vuoi, e a tenerti i contatti che hai già. N’arte aggiunge date, non le sostituisce.",
  },
  {
    id: "band",
    question: "Siamo una band: serve un account a testa?",
    answer:
      "No, l’account è uno e i piani valgono per l’account, non per il singolo profilo. Con Pro gestisci 2 profili artista, con Max fino a 5, tutti con i vantaggi del piano. È pensato apposta per band, manager e agenzie.",
  },
  {
    id: "disdetta",
    question: "Se disdico perdo tutto?",
    answer:
      "No. Il piano resta attivo fino alla fine del periodo già pagato, poi foto, video e profili oltre i limiti del piano gratuito vengono nascosti — non cancellati. Se torni, ricompare tutto com’era.",
  },
];
