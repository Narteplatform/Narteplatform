/**
 * Utility deterministiche per il formatting SEO degli articoli del blog.
 *
 * Regola d'oro: NON modificare MAI le parole del testo (ordine, casing,
 * punteggiatura). Si limitano a wrappare il testo in markup HTML semantico
 * e a derivare i meta (title/description). Nessuna dipendenza esterna.
 *
 * Self-check (eseguibile mentalmente):
 *   formatContentToSeoHtml("<p>già html</p>")            === "<p>già html</p>"   // invariato
 *   formatContentToSeoHtml("Titolo breve")               === "<h2>Titolo breve</h2>"
 *   formatContentToSeoHtml("Una frase normale, lunga e con punto finale.")
 *                                                         === "<p>Una frase normale, lunga e con punto finale.</p>"
 *   formatContentToSeoHtml("- uno\n- due")               === "<ul><li>uno</li><li>due</li></ul>"
 *   formatContentToSeoHtml("1. primo\n2. secondo")       === "<ol><li>primo</li><li>secondo</li></ol>"
 *   formatContentToSeoHtml("a & b")                       === "<h2>a &amp; b</h2>"  // escaping
 *   deriveSeoMeta("Guida", "Testo libero").seoTitle      === "Guida | N'arte"
 */

const HTML_BLOCK_RE = /<(p|h1|h2|h3|h4|h5|h6|ul|ol|li|blockquote|figure|table|section|article|div|pre)\b/i;

/** Escape dei caratteri speciali HTML mantenendo intatte le parole. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Rimuove i tag HTML restituendo solo il testo (per i meta e i conteggi). */
function stripTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SHORT_HEADING_MAX = 65;

/**
 * Converte testo semplice in HTML SEO senza alterare alcuna parola.
 * Se l'input sembra già HTML (contiene tag di blocco) viene restituito invariato.
 */
export function formatContentToSeoHtml(raw: string): string {
  if (!raw) return "";
  if (HTML_BLOCK_RE.test(raw)) return raw;

  // Normalizza i newline e divide in blocchi separati da righe vuote.
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const html: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const isBulleted = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l));
    const isOrdered = lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l));

    if (isBulleted) {
      const items = lines
        .map((l) => escapeHtml(l.replace(/^[-*]\s+/, "")))
        .map((t) => `<li>${t}</li>`)
        .join("");
      html.push(`<ul>${items}</ul>`);
      continue;
    }

    if (isOrdered) {
      const items = lines
        .map((l) => escapeHtml(l.replace(/^\d+[.)]\s+/, "")))
        .map((t) => `<li>${t}</li>`)
        .join("");
      html.push(`<ol>${items}</ol>`);
      continue;
    }

    // Heading: singola riga corta, senza punto finale.
    if (
      lines.length === 1 &&
      lines[0].length < SHORT_HEADING_MAX &&
      !/[.!?:;]$/.test(lines[0])
    ) {
      html.push(`<h2>${escapeHtml(lines[0])}</h2>`);
      continue;
    }

    // Paragrafo: preserva eventuali a-capo singoli con <br>.
    const paragraph = lines.map((l) => escapeHtml(l)).join("<br>");
    html.push(`<p>${paragraph}</p>`);
  }

  return html.join("\n");
}

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 155;

/** Tronca a un limite mantenendo le parole intere e aggiunge "…". */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const clean = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(/[\s.,;:!?-]+$/, "");
  return `${clean}…`;
}

/**
 * Deriva i meta SEO da titolo e contenuto grezzo.
 * - seoTitle: `${title} | N'arte`, troncato a ~60 caratteri.
 * - seoDescription: primi ~155 caratteri di testo (senza tag), troncatura pulita.
 */
export function deriveSeoMeta(
  title: string,
  raw: string
): { seoTitle: string; seoDescription: string } {
  const cleanTitle = title.trim();
  const suffix = " | N'arte";
  const fullTitle = `${cleanTitle}${suffix}`;
  const seoTitle =
    fullTitle.length <= SEO_TITLE_MAX
      ? fullTitle
      : `${truncateAtWord(cleanTitle, Math.max(0, SEO_TITLE_MAX - suffix.length))}${suffix}`;

  const plain = stripTags(raw);
  const seoDescription = truncateAtWord(plain, SEO_DESC_MAX);

  return { seoTitle, seoDescription };
}

/**
 * Slug deterministico dal titolo (copia locale, non-`"use server"`, così può
 * girare anche lato client per l'anteprima/auto-compilazione). La generazione
 * dello slug definitivo e la sua unicità restano gestite in `_actions.ts`.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/** Stopword italiane comuni: articoli, preposizioni, congiunzioni, ausiliari, pronomi. */
const IT_STOPWORDS = new Set<string>([
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "da", "in",
  "con", "su", "per", "tra", "fra", "del", "dello", "della", "dei", "degli",
  "delle", "dal", "dallo", "dalla", "dai", "dagli", "dalle", "nel", "nello",
  "nella", "nei", "negli", "nelle", "al", "allo", "alla", "ai", "agli", "alle",
  "sul", "sullo", "sulla", "sui", "sugli", "sulle", "col", "coi",
  "e", "ed", "o", "od", "ma", "se", "che", "chi", "cui", "non", "come", "anche",
  "più", "meno", "molto", "poco", "tanto", "tutto", "tutti", "tutte", "ogni",
  "sono", "essere", "stato", "stata", "hai", "abbiamo", "avete", "hanno",
  "questo", "questa", "questi", "queste", "quello", "quella", "quelli", "quelle",
  "ti", "si", "ci", "vi", "mi", "ne", "lo", "la", "li", "le", "suo", "sua",
  "suoi", "sue", "tuo", "tua", "loro", "nostro", "nostra", "vostro", "vostra",
  "già", "ancora", "sempre", "mai", "dove", "quando", "quanto", "quale", "quali",
  "ossia", "cioè", "senza", "sotto", "sopra", "dopo", "prima", "verso", "circa",
]);

/**
 * Estrae le keyword più rilevanti per frequenza, senza mai alterare le parole:
 * conserva la prima forma vista (casing/accenti originali). Scarta stopword IT,
 * token < 4 caratteri e numeri puri.
 */
export function extractKeywords(raw: string, max = 8): string[] {
  const plain = stripTags(raw);
  const tokens = plain.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const firstForm = new Map<string, string>();
  const count = new Map<string, number>();
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (key.length < 4 || IT_STOPWORDS.has(key) || /^\d+$/.test(key)) continue;
    if (!firstForm.has(key)) firstForm.set(key, t);
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([k]) => firstForm.get(k)!);
}

/**
 * Tra le prime ~4 frasi del testo sceglie quella che contiene più keyword e la
 * restituisce verbatim (troncata a 155). Deterministico. Ritorna null se non
 * trova nulla di utile.
 */
function pickKeywordRichSentence(plain: string, keywords: string[]): string | null {
  if (!plain) return null;
  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (sentences.length === 0) return null;
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  let best = sentences[0];
  let bestScore = -1;
  for (const s of sentences) {
    const low = s.toLowerCase();
    const score = lowerKeywords.reduce((n, k) => (low.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return truncateAtWord(best, SEO_DESC_MAX);
}

const EXCERPT_MAX = 200;

/**
 * Deriva l'intero set di parametri SEO in modo deterministico (nessuna IA,
 * nessuna dipendenza, nessuna alterazione delle parole del testo).
 */
export function deriveFullSeo(
  title: string,
  raw: string,
  coverImage?: string | null
): {
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  ogImage: string | null;
} {
  const plain = stripTags(raw);
  const keywords = extractKeywords(raw);
  const base = deriveSeoMeta(title, raw);
  const seoDescription = pickKeywordRichSentence(plain, keywords) ?? base.seoDescription;
  return {
    slug: slugify(title),
    excerpt: truncateAtWord(plain, EXCERPT_MAX),
    seoTitle: base.seoTitle,
    seoDescription,
    keywords,
    ogImage: coverImage?.trim() ? coverImage.trim() : null,
  };
}

/**
 * Difesa in profondità lato server: rimuove blocchi <script>/<style>, attributi
 * on*= e URL javascript:. Il contenuto è comunque scritto solo dai superadmin e
 * Tiptap non emette script; questa è una rete di sicurezza dependency-free.
 */
export function stripUnsafe(html: string): string {
  return html
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
