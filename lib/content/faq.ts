export type FaqItem = { q: string; a: string };
export type FaqCategory = { category: string; items: FaqItem[] };

export const FAQ: FaqCategory[] = [
  {
    category: "Per artisti",
    items: [
      {
        q: "Come posso candidarmi come artista N'arte?",
        a: "Vai alla pagina “Sei un artista?” e compila il form con bio, generi e link social. Riceverai una risposta entro 7 giorni lavorativi.",
      },
      {
        q: "L'iscrizione è gratuita?",
        a: "Sì. La candidatura e la presenza nel roster N'arte sono completamente gratuite per gli artisti.",
      },
      {
        q: "Come gestisco le mie disponibilità?",
        a: "Una volta approvato, accedi alla tua dashboard “Calendario” e segna le date libere o occupate. Le richieste degli organizzatori arrivano in tempo reale.",
      },
      {
        q: "Cosa succede quando ricevo una richiesta di booking?",
        a: "Ricevi una notifica via email e in dashboard. Puoi accettare per aprire la trattativa, rifiutare oppure proporre una controfferta nella chat.",
      },
    ],
  },
  {
    category: "Per organizzatori",
    items: [
      {
        q: "Devo registrarmi per contattare un artista?",
        a: "Sì, la registrazione come organizzatore è necessaria per vedere prezzi, calendario e inviare richieste di booking.",
      },
      {
        q: "Posso confermare una data senza pagare nulla?",
        a: "L'utilizzo della piattaforma è gratuito sia per la ricerca sia per la trattativa. Il compenso dell'artista è concordato direttamente tra le parti.",
      },
      {
        q: "Come funziona la chat con l'artista?",
        a: "Una volta accettata la richiesta, si apre una chat dedicata dove negoziare data, slot, budget e dettagli logistici, anche con offerte vincolanti.",
      },
    ],
  },
  {
    category: "Account",
    items: [
      {
        q: "Come modifico la mia password?",
        a: "Dalla pagina di login clicca “Password dimenticata”. Riceverai un link per impostarne una nuova.",
      },
      {
        q: "Posso eliminare il mio account?",
        a: "Sì. Scrivi a hello@narte.it e cancelleremo i tuoi dati nel rispetto della normativa GDPR.",
      },
    ],
  },
  {
    category: "Pagamenti",
    items: [
      {
        q: "N'arte gestisce i pagamenti?",
        a: "No. I pagamenti avvengono direttamente tra organizzatore e artista, secondo gli accordi fissati in chat.",
      },
      {
        q: "Servono fatture o ricevute?",
        a: "Le emette direttamente l'artista o la sua agenzia, in autonomia. N'arte non si interpone nella transazione.",
      },
    ],
  },
  {
    category: "Generale",
    items: [
      {
        q: "In che città è attiva N'arte?",
        a: "Il network è nato a Napoli e si sta espandendo nel Sud Italia. Artisti e organizzatori di tutta Italia possono comunque iscriversi.",
      },
      {
        q: "Posso prenotare una chiamata con un consulente?",
        a: "Sì, dalla sezione “Artisti” → tab “Consulente N'arte” puoi prenotare una chiamata gratuita di 30 minuti.",
      },
      {
        q: "Dove vi seguo sui social?",
        a: "Trovi N'arte su Instagram, TikTok e LinkedIn. I link sono in fondo a ogni pagina.",
      },
    ],
  },
];
