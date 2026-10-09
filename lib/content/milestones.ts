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
 * Le tappe senza data hanno `year` e `date` vuoti: la linea non mostra
 * l’anno e, senza foto, il pallino mostra un punto.
 */
export type Milestone = {
  /** Slug stabile: alimenta gli id di aria-controls / aria-labelledby. */
  id: string;
  /** Etichetta corta sull’asse della linea. Vuota per le tappe senza data. */
  year: string;
  /** Etichetta estesa mostrata nel pannello. Vuota per le tappe senza data. */
  date: string;
  title: string;
  description: string;
  /** Path in public/, oppure null per usare da subito il fallback tipografico. */
  photo: string | null;
  photoAlt: string;
};

// Tappe concordate con Luigi il 09/10/2026. Le quattro centrali sono
// volutamente senza data: raccontano cosa fa N’arte, non un singolo evento.
// La foto del 2018 è Marechiaro (Unsplash, Valerio Filoso, licenza Unsplash);
// le altre sono ancora quelle segnaposto di public/milestones/.
export const MILESTONES: Milestone[] = [
  {
    id: "nasce-narte",
    year: "2018",
    date: "2018",
    title: "Nasce N’arte",
    description:
      "Eduardo Castronuovo organizza la prima serata a Napoli con un gruppo di musicisti che nessuno aveva ancora fatto salire su un palco. La città era piena di talento e mancava chi lo facesse suonare. Da lì in poi, una data dopo l’altra.",
    photo: "/milestones/2018-marechiaro.jpg",
    photoAlt: "Il mare di Marechiaro, a Napoli, al tramonto",
  },
  {
    id: "evento-narte",
    year: "",
    date: "",
    title: "L’evento N’arte!",
    description:
      "Le serate firmate N’arte, dal format alla scelta degli artisti. Sono l’occasione in cui la community si ritrova e il pubblico scopre gli artisti del roster dal vivo.",
    photo: "/milestones/2025-sunday-narte-brusco.jpg",
    photoAlt: "Un artista N’arte sul palco durante una serata N’arte",
  },
  {
    id: "festival",
    year: "",
    date: "",
    title: "Festival",
    description:
      "Dai locali ai festival, con line-up curate da N’arte per eventi più grandi, come i Capri Music Awards nella Piazzetta di Capri e Oktoberland all’Edenlandia.",
    photo: "/milestones/2025-capri-music-awards.jpg",
    photoAlt: "Il palco di un festival con artisti del roster N’arte",
  },
  {
    id: "aperture-concerti",
    year: "",
    date: "",
    title: "Aperture concerti",
    description:
      "Gli artisti del roster aprono i concerti di altri artisti. Per un emergente vuol dire suonare su un palco importante, davanti a un pubblico che altrimenti non incontrerebbe.",
    photo: "/milestones/2024-capodanno-plebiscito.jpg",
    photoAlt: "Il pubblico davanti al palco di un concerto",
  },
  {
    id: "partner-artistico",
    year: "",
    date: "",
    title: "Partner artistico",
    description:
      "Locali e realtà che affidano a N’arte la loro programmazione musicale. Come la rassegna Sunday N’arte al Brusco: ogni domenica un artista diverso, e per chi suona una data fissa in calendario.",
    photo: "/milestones/2025-oktoberland-edenlandia.jpg",
    photoAlt: "Musica dal vivo in un locale partner di N’arte",
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
