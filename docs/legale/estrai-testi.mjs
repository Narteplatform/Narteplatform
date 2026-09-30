#!/usr/bin/env node
// Genera lib/legal/v2/testi.ts dai documenti HTML del fascicolo legale.
// Uso: node docs/legale/estrai-testi.mjs
// Nessuna dipendenza. Rieseguire dopo ogni correzione del legale ai file src/.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const DOCS = [
  { file: "01-termini-e-condizioni.html", slug: "termini" },
  { file: "02-condizioni-abbonamento.html", slug: "condizioni-abbonamento" },
  { file: "03-condizioni-artisti.html", slug: "condizioni-artisti" },
  { file: "04-condizioni-organizzatori.html", slug: "condizioni-organizzatori" },
  { file: "05-regolamento-recensioni.html", slug: "regolamento-recensioni" },
  { file: "06-moderazione-segnalazioni.html", slug: "segnalazioni-politica" },
  { file: "07-criteri-posizionamento.html", slug: "criteri-di-posizionamento" },
];

/** Rimuove ogni <tag class="cls"> ... </tag> tenendo conto dell'annidamento. */
function rimuoviBlocchi(html, tag, cls) {
  const apre = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`, "i");
  const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  for (;;) {
    const m = apre.exec(html);
    if (!m) return html;
    token.lastIndex = m.index + m[0].length;
    let depth = 1;
    let fine = -1;
    for (let t = token.exec(html); t; t = token.exec(html)) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        fine = t.index + t[0].length;
        break;
      }
    }
    if (fine < 0) throw new Error(`Tag <${tag} class="${cls}"> non chiuso`);
    html = html.slice(0, m.index) + html.slice(fine);
  }
}

function testo(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const out = [];
for (const d of DOCS) {
  const src = readFileSync(join(here, "src", d.file), "utf8");

  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(src);
  const sub = /<p class="sottotitolo">([\s\S]*?)<\/p>/i.exec(src);
  const dl = /<dl class="intestazione">([\s\S]*?)<\/dl>/i.exec(src);
  if (!h1 || !sub || !dl) throw new Error(`${d.file}: intestazione non riconosciuta`);

  const campo = (nome) => {
    const m = new RegExp(`<dt>${nome}</dt><dd>([\\s\\S]*?)</dd>`, "i").exec(dl[1]);
    return m ? m[1].trim() : "";
  };
  const versione = testo(campo("Versione"));
  const vigoreHtml = campo("In vigore dal");
  // Se la data è ancora un segnaposto non c'è nessuna data da mostrare.
  const inVigoreDal = vigoreHtml.includes('class="seg"') ? null : testo(vigoreHtml) || null;

  let body = src.slice(src.indexOf("</dl>") + "</dl>".length);
  body = body.replace(/<\/article>\s*$/i, "");
  body = rimuoviBlocchi(body, "div", "nota-legale");
  if (/nota-legale/.test(body)) throw new Error(`${d.file}: nota-legale residua`);
  body = body.trim();

  out.push({
    slug: d.slug,
    titolo: testo(h1[1]),
    sottotitolo: testo(sub[1]),
    versione,
    inVigoreDal,
    body,
  });
}

const intestazione = `/**
 * FILE GENERATO. NON MODIFICARLO A MANO.
 *
 * Origine: docs/legale/src/01..07 (fascicolo legale).
 * Dopo ogni correzione del legale ai file sorgente, rigenerarlo con:
 *
 *     node docs/legale/estrai-testi.mjs
 *
 * I segnaposto <span class="seg">[...]</span> sono lasciati visibili di
 * proposito: vanno compilati nei sorgenti prima di attivare
 * NEXT_PUBLIC_LEGAL_V2_PUBBLICATO.
 */
`;

const tipo = `
export type TestoLegaleV2 = {
  slug: string;
  titolo: string;
  sottotitolo: string;
  versione: string;
  /** Data di entrata in vigore, oppure null finché nel sorgente è un segnaposto. */
  inVigoreDal: string | null;
  /** HTML del documento, senza note per il legale, intestazione e titolo. */
  body: string;
};

export const TESTI_V2: TestoLegaleV2[] = `;

writeFileSync(
  join(root, "lib", "legal", "v2", "testi.ts"),
  intestazione + tipo + JSON.stringify(out, null, 2) + ";\n",
);
console.log(`Generati ${out.length} documenti in lib/legal/v2/testi.ts`);
