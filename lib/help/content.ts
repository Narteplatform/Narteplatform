// Centro Assistenza N'arte — API pubblica dei contenuti.
//
// I testi vivono in lib/help/categories/*, uno per categoria: con una
// cinquantina di articoli un file solo diventava ingestibile. Qui restano
// l'assemblaggio e gli helper, così ogni consumatore continua a importare da
// "@/lib/help/content" come prima.
//
// Per aggiungere un articolo: apri il file della categoria e aggiungilo
// all'array. Per aggiungere una categoria: crea il file, importalo qui e
// aggiungi la voce a HELP_CATEGORIES (e l'icona in lib/help/icons.tsx).
//
// ⚠️ Gli slug sono URL pubbliche indicizzate: si aggiungono, non si rinominano.
// Cambiare uno slug rompe i link esistenti e richiede un redirect.

import type {
  HelpArticle,
  HelpCategory,
  HelpSearchItem,
} from "@/lib/help/types";

import { INIZIARE } from "@/lib/help/categories/iniziare";
import { ARTISTI } from "@/lib/help/categories/artisti";
import { ORGANIZZATORI } from "@/lib/help/categories/organizzatori";
import { BOOKING } from "@/lib/help/categories/booking";
import { CONSULENZA } from "@/lib/help/categories/consulenza";
import { ACCOUNT } from "@/lib/help/categories/account";
import { PAGAMENTI } from "@/lib/help/categories/pagamenti";
import { POLICY } from "@/lib/help/categories/policy";
import { BRAND } from "@/lib/help/categories/brand";
import { invitiVisibili } from "@/lib/inviti/modalita";

export type {
  HelpArticle,
  HelpCategory,
  HelpSearchItem,
  HelpAudience,
  HelpCategoryIcon,
} from "@/lib/help/types";

/** Un articolo insieme alla categoria che lo contiene: serve a costruire l'URL. */
export type HelpArticleRef = { category: HelpCategory; article: HelpArticle };

/**
 * L'ordine di questo array è l'ordine mostrato in pagina e nella barra
 * laterale: dal generale allo specifico, con le regole in fondo.
 */
const TUTTE_LE_CATEGORIE: HelpCategory[] = [
  INIZIARE,
  ARTISTI,
  ORGANIZZATORI,
  BOOKING,
  CONSULENZA,
  ACCOUNT,
  PAGAMENTI,
  POLICY,
  BRAND,
];

/**
 * Articoli che descrivono funzioni dietro un interruttore: finché è spento non
 * si pubblicano (né pagina, né ricerca, né sitemap). Lo stato si legge al build
 * e al rendering lato server; i contenuti non arrivano mai al browser se non
 * come indice di ricerca già filtrato.
 */
const ARTICOLI_CON_INTERRUTTORE: Record<string, () => boolean> = {
  "pagamenti/invita-un-artista": invitiVisibili,
};

export const HELP_CATEGORIES: HelpCategory[] = TUTTE_LE_CATEGORIE.map((c) => ({
  ...c,
  articles: c.articles.filter((a) => {
    const acceso = ARTICOLI_CON_INTERRUTTORE[`${c.slug}/${a.slug}`];
    return acceso ? acceso() : true;
  }),
}));

// ============================================
// LOOKUP
// ============================================

export function findCategory(slug: string): HelpCategory | null {
  return HELP_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function findArticle(
  categorySlug: string,
  articleSlug: string
): HelpArticleRef | null {
  const category = findCategory(categorySlug);
  if (!category) return null;
  const article = category.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return { category, article };
}

/** Tutti gli articoli con la loro categoria. Usato da sitemap e ricerca. */
export function allArticles(): HelpArticleRef[] {
  return HELP_CATEGORIES.flatMap((category) =>
    category.articles.map((article) => ({ category, article }))
  );
}

// ============================================
// RICERCA
// ============================================

/**
 * Indice per la ricerca client-side.
 *
 * Restituisce SOLO i campi che la ricerca usa davvero. Prima si passava
 * l'articolo intero, `content` compreso: l'HTML di ogni articolo finiva nel
 * payload inviato al browser senza che nessuno lo leggesse. Con una manciata
 * di articoli segnaposto non si notava; con una cinquantina di articoli scritti
 * erano centinaia di kilobyte per niente, su ogni visita.
 */
export function searchIndex(): HelpSearchItem[] {
  return allArticles().map(({ category, article }) => ({
    title: article.title,
    excerpt: article.excerpt,
    articleSlug: article.slug,
    categorySlug: category.slug,
    categoryTitle: category.title,
  }));
}

/** Ricerca lato server, su titolo, sommario e corpo. */
export function searchArticles(query: string, limit = 20): HelpArticleRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: HelpArticleRef[] = [];
  for (const category of HELP_CATEGORIES) {
    for (const article of category.articles) {
      const hay =
        `${article.title} ${article.excerpt} ${article.content}`.toLowerCase();
      if (hay.includes(q)) out.push({ category, article });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ============================================
// NAVIGAZIONE
// ============================================

/** Gli articoli messi in evidenza sulla home del Centro Assistenza. */
const POPULAR_SLUGS: [string, string][] = [
  ["iniziare", "cosa-fa-e-non-fa-narte"],
  ["organizzatori", "richiedere-booking"],
  ["artisti", "candidatura-artista"],
  ["booking", "stati-richiesta"],
  ["artisti", "tier-pro-max"],
  ["pagamenti", "modalita-pagamento"],
];

export function popularArticles(limit = 6): HelpArticleRef[] {
  const out: HelpArticleRef[] = [];
  for (const [categorySlug, articleSlug] of POPULAR_SLUGS) {
    const found = findArticle(categorySlug, articleSlug);
    if (found) out.push(found);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Articoli correlati.
 *
 * `related` accetta due forme: "slug" per un articolo della stessa categoria e
 * "categoria/slug" per uno di un'altra. Senza il rimando incrociato, con dodici
 * articoli per categoria il ripiego "i primi della lista" è quasi casuale.
 */
export function relatedArticles(
  categorySlug: string,
  currentSlug: string,
  limit = 4
): HelpArticleRef[] {
  const category = findCategory(categorySlug);
  if (!category) return [];

  const current = category.articles.find((a) => a.slug === currentSlug);
  const refs = current?.related ?? [];

  if (refs.length > 0) {
    const out: HelpArticleRef[] = [];
    for (const ref of refs) {
      const [a, b] = ref.includes("/") ? ref.split("/") : [categorySlug, ref];
      const found = findArticle(a, b);
      // Un riferimento che non risolve viene ignorato invece di far cadere la
      // pagina: uno slug sbagliato non deve costare un 500 in produzione.
      if (found && found.article.slug !== currentSlug) out.push(found);
      if (out.length >= limit) break;
    }
    if (out.length > 0) return out;
  }

  return category.articles
    .filter((a) => a.slug !== currentSlug)
    .slice(0, limit)
    .map((article) => ({ category, article }));
}
