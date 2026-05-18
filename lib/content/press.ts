export type PressMention = {
  id: string;
  source: string;
  title: string;
  excerpt: string;
  image: string;
  ctaUrl: string;
};

// Hardcoded — aggiornare qui per modificare la sezione "Dicono di noi".
export const PRESS_MENTIONS: PressMention[] = [
  {
    id: "ilmattino-2024",
    source: "Il Mattino",
    title: "N'arte: la piattaforma che rilancia la musica dal vivo a Napoli",
    excerpt:
      "Una community di artisti emergenti, organizzatori e venue iconiche per riportare la musica nei luoghi più suggestivi della città.",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&auto=format&fit=crop&q=70",
    ctaUrl: "#",
  },
  {
    id: "repubblica-napoli-2025",
    source: "la Repubblica · Napoli",
    title: "Booking di artisti emergenti: nasce il network N'arte",
    excerpt:
      "Dietro N'arte una visione precisa: dare visibilità ai talenti del Sud Italia e semplificare il booking per organizzatori e locali.",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=70",
    ctaUrl: "#",
  },
  {
    id: "fanpage-2025",
    source: "Fanpage",
    title: "Live music a Napoli, l'esperimento N'arte funziona",
    excerpt:
      "Cresce il roster degli artisti, crescono gli eventi: la piattaforma campana entra nel suo secondo anno con numeri da protagonista.",
    image:
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&auto=format&fit=crop&q=70",
    ctaUrl: "#",
  },
  {
    id: "napolitoday-2025",
    source: "NapoliToday",
    title: "Dai vicoli ai palchi: gli artisti che scopri solo qui",
    excerpt:
      "Una vetrina curata di musicisti emergenti e una rete di organizzatori pronti a scommettere su di loro.",
    image:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&auto=format&fit=crop&q=70",
    ctaUrl: "#",
  },
];
