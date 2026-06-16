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
