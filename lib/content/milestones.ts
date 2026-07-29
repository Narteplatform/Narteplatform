/**
 * Le tappe di N’arte mostrate su /chi-siamo.
 *
 * Contenuto redazionale, non dati: vive qui e non a DB perché cambia due volte
 * l’anno e non ha bisogno di un CRUD. Per aggiungere una tappa: una voce in
 * fondo all’array (l’ordine dell’array è l’ordine sulla linea) e la foto in
 * `public/milestones/` con lo stesso nome file indicato in `photo`.
 *
 * Le foto sono segnaposto: finché il file non esiste, il pallino mostra l’anno
 * in tipografia display e la pagina resta integra (vedi MilestonesTimeline).
 * Formato consigliato: quadrato, almeno 400×400, soggetto centrato.
 *
 * ⚠️ Titoli ed eventi sono reali (dal calendario N’arte). Le date di alcune
 * tappe vanno confermate da Eduardo prima della pubblicazione: sono segnate
 * con TODO qui sotto.
 */
export type Milestone = {
  /** Slug stabile: alimenta gli id di aria-controls / aria-labelledby. */
  id: string;
  /** Etichetta corta sull’asse della linea. */
  year: string;
  /** Etichetta estesa mostrata nel pannello. */
  date: string;
  title: string;
  description: string;
  /** Path in public/, oppure null per usare da subito il fallback tipografico. */
  photo: string | null;
  photoAlt: string;
};

export const MILESTONES: Milestone[] = [
  {
    id: "nasce-narte",
    year: "2018",
    date: "Settembre 2018", // TODO: confermare il mese esatto
    title: "Nasce N’arte",
    description:
      "Eduardo Castronuovo mette insieme la prima serata con quattro musicisti che nessuno aveva ancora messo su un palco. Non c’era un piano industriale: c’era una città piena di talento e nessuno che lo facesse suonare. Da lì in poi, una data dopo l’altra.",
    photo: "/milestones/2018-nasce-narte.jpg",
    photoAlt: "La prima serata N’arte a Napoli nel 2018",
  },
  {
    id: "capodanno-plebiscito",
    year: "2024",
    date: "31 dicembre 2024",
    title: "Capodanno in Piazza del Plebiscito",
    description:
      "Il salto di scala. Dal palco di un locale alla piazza più grande di Napoli, con un concertone gratuito di fine anno e una line-up scelta tutta dal roster N’arte. Gli stessi artisti che sei anni prima suonavano davanti a quaranta persone.",
    photo: "/milestones/2024-capodanno-plebiscito.jpg",
    photoAlt: "Il concertone di Capodanno in Piazza del Plebiscito a Napoli",
  },
  {
    id: "capri-music-awards",
    year: "2025",
    date: "16 luglio 2025",
    title: "Capri Music Awards",
    description:
      "Tre serate di concerti e premiazioni nella Piazzetta di Capri, con il patrocinio del Comune. Un premio dedicato alla scena emergente italiana, nato per dare a questi artisti una cosa che di solito non ricevono mai: un riconoscimento ufficiale.",
    photo: "/milestones/2025-capri-music-awards.jpg",
    photoAlt: "La premiazione dei Capri Music Awards nella Piazzetta di Capri",
  },
  {
    id: "oktoberland-edenlandia",
    year: "2025",
    date: "9 ottobre 2025",
    title: "Oktoberland all’Edenlandia",
    description:
      "Tre giorni di musica e birra dentro il parco divertimenti storico di Napoli, con la line-up curata da noi. La prova che un format può funzionare fuori dai club: pubblico diverso, orari diversi, stessa qualità sul palco.",
    photo: "/milestones/2025-oktoberland-edenlandia.jpg",
    photoAlt: "Il palco di Oktoberland al parco Edenlandia di Napoli",
  },
  {
    id: "sunday-narte-brusco",
    year: "2025",
    date: "Dal 2025, ogni domenica", // TODO: confermare da quando è partita la rassegna
    title: "Sunday N’arte al Brusco",
    description:
      "Il primo appuntamento fisso: ogni domenica musica dal vivo e brunch al Brusco Restaurant, un artista diverso a settimana. Per chi suona è la differenza fra una serata all’anno e una data sicura in calendario.",
    photo: "/milestones/2025-sunday-narte-brusco.jpg",
    photoAlt: "Un artista N’arte durante il brunch domenicale al Brusco Restaurant",
  },
  {
    id: "piattaforma-narte",
    year: "2026",
    date: "2026",
    title: "N’arte diventa una piattaforma",
    description:
      "Otto anni di agenda, telefonate e passaparola diventano uno strumento: profili con video e disponibilità, richieste dirette dagli organizzatori, calendario condiviso. Quello che facevamo a mano per cento artisti, adesso lo può fare chiunque.",
    photo: "/milestones/2026-piattaforma-narte.jpg",
    photoAlt: "La piattaforma N’arte su desktop e mobile",
  },
];
