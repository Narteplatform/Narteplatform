import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Pulizia dell'HTML degli articoli del blog.
 *
 * PRIMA c'era `stripUnsafe`, una manciata di espressioni regolari: toglieva
 * <script> e <style>, gli `on*=` e gli `href="javascript:…"` fra virgolette. Era
 * aggirabile in molti modi — `<svg onload=…>` senza spazio prima dell'attributo,
 * `href=javascript:…` senza virgolette, `<iframe srcdoc=…>`, entità HTML
 * (`&#106;avascript:`) — perché un'espressione regolare non è un parser HTML.
 *
 * ORA si usa sanitize-html, che costruisce l'albero e tiene SOLO ciò che è in
 * elenco (allowlist). L'elenco ricalca i nodi che l'editor TipTap di
 * /admin/blog produce davvero (components/admin/RichTextEditor.tsx):
 *   - StarterKit (titoli h2/h3, paragrafi, grassetto, corsivo, barrato, codice,
 *     blocchi di codice, citazioni, elenchi, a capo, linea orizzontale);
 *   - Underline, Link, Image (classe `rounded-xl`), TextStyle + Color (span con
 *     `color`), Highlight multicolore (mark con `background-color`), TextAlign
 *     (`text-align` su paragrafi e titoli);
 * più i blocchi che `formatContentToSeoHtml` lascia passare quando il testo è
 * già HTML (figure, tabelle, div/section), per non rompere articoli esistenti.
 *
 * Niente iframe né embed: l'editor non ne ha. Se un giorno servissero, vanno
 * aggiunti qui con l'elenco degli host consentiti, non tolti dal filtro.
 *
 * Si applica due volte: al SALVATAGGIO (app/(admin)/admin/blog/_actions.ts) e
 * alla VISUALIZZAZIONE (app/(public)/blog/[slug]/page.tsx). La seconda copre gli
 * articoli salvati quando c'era ancora il vecchio filtro.
 */

const COLORE = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i,
  /^inherit$/i,
  /^currentcolor$/i,
];

const OPZIONI: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4",
    "strong", "b", "em", "i", "u", "s", "strike", "del", "sub", "sup",
    "code", "pre", "blockquote",
    "ul", "ol", "li",
    "a", "img", "span", "mark",
    "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "div", "section",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", { name: "target", multiple: false, values: ["_blank", "_self"] }],
    img: ["src", "alt", "title", "width", "height", "loading", "class"],
    span: ["style"],
    mark: ["style", "data-color"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    h4: ["style"],
    code: ["class"],
    ol: ["start"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedClasses: {
    img: ["rounded-xl"],
    code: ["language-*"],
  },
  allowedStyles: {
    span: { color: COLORE },
    mark: { "background-color": COLORE, color: COLORE },
    p: { "text-align": [/^(left|right|center|justify)$/] },
    h2: { "text-align": [/^(left|right|center|justify)$/] },
    h3: { "text-align": [/^(left|right|center|justify)$/] },
    h4: { "text-align": [/^(left|right|center|justify)$/] },
  },
  // Link: solo web, posta e telefono. I percorsi relativi ("/artisti",
  // "#sezione") restano validi: sanitize-html filtra solo gli URL con schema.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  // `//host/...` eredita lo schema della pagina ma punta a un dominio esterno
  // senza dirlo: non serve all'editor e si rifiuta.
  allowProtocolRelative: false,
  // Titoli fuori scala: l'<h1> della pagina è il titolo dell'articolo, quindi
  // un h1 nel corpo diventa h2; h5/h6 scendono a h4. Il testo resta.
  transformTags: {
    h1: "h2",
    h5: "h4",
    h6: "h4",
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target === "_blank") {
        // Una scheda aperta con target=_blank può pilotare window.opener della
        // pagina di partenza: rel="noopener noreferrer" lo impedisce.
        const rel = new Set((out.rel ?? "").split(/\s+/).filter(Boolean));
        rel.add("noopener");
        rel.add("noreferrer");
        out.rel = Array.from(rel).join(" ");
      }
      return { tagName, attribs: out };
    },
  },
  // Ciò che non è in elenco sparisce col suo contenuto solo per questi tag;
  // per gli altri si toglie il tag e si conserva il testo.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math", "template"],
};

export function sanitizeBlogHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, OPZIONI);
}
