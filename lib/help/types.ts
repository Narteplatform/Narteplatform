// Tipi del Centro Assistenza.
//
// Stanno in un file a parte perché i contenuti sono divisi per categoria in
// lib/help/categories/*: se i tipi vivessero in content.ts ogni categoria
// importerebbe il file che la importa, e sarebbe un ciclo.
// L'API pubblica resta lib/help/content.ts, che ri-esporta tutto.

export type HelpCategoryIcon =
  | "rocket"
  | "music"
  | "users"
  | "calendar"
  | "phone"
  | "user-cog"
  | "credit-card"
  | "shield"
  | "megaphone";

export type HelpAudience = "all" | "artist" | "organizer" | "user";

export type HelpArticle = {
  slug: string;
  title: string;
  excerpt: string;
  /**
   * HTML del corpo articolo. Usa <h2>, <h3>, <p>, <ul>, <ol>, <li>, <a>,
   * <strong>, <em>, <table>.
   *
   * Niente <h1>: quello è già il titolo della pagina, e un secondo <h1>
   * confonde sia i lettori di schermo sia i motori di ricerca.
   */
  content: string;
  /**
   * Data dell'ultima revisione, ISO. Obbligatoria: alimenta `dateModified`
   * nei dati strutturati e `lastmod` in sitemap. Senza, l'articolo è muto
   * per i motori di ricerca.
   */
  updatedAt: string;
  /** Mostra il banner "in preparazione". Nessun articolo dovrebbe averlo. */
  placeholder?: boolean;
  /**
   * Articoli correlati. Accetta due forme:
   *   "slug"            → articolo nella stessa categoria
   *   "categoria/slug"  → articolo in un'altra categoria
   * Se vuoto, si ripiega sui primi articoli della categoria.
   */
  related?: string[];
};

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  /** Nome icona lucide-react, vedi lib/help/icons.tsx */
  icon: HelpCategoryIcon;
  audience: HelpAudience;
  articles: HelpArticle[];
};

/** Voce dell'indice di ricerca: solo ciò che serve al client. Vedi searchIndex(). */
export type HelpSearchItem = {
  title: string;
  excerpt: string;
  articleSlug: string;
  categorySlug: string;
  categoryTitle: string;
};
