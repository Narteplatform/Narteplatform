#!/usr/bin/env node
/**
 * Genera i PDF dei documenti legali N'arte da `docs/legale/src/NN-*.html`.
 *
 * Nessuna dipendenza: usa Chrome in modalità headless per la stampa.
 *   node docs/legale/genera-pdf.mjs
 *
 * Ogni sorgente è un frammento `<article class="doc" data-titolo="…">`: lo script
 * lo avvolge nella pagina con il foglio di stile comune, stampa un PDF per
 * documento e poi un fascicolo unico con copertina e indice.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const SRC = join(QUI, "src");
const OUT = join(QUI, "pdf");
const TMP = join(QUI, ".tmp");

const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VERSIONE = "0.95 — bozza per revisione legale";
const DATA = "30 settembre 2026";

if (!existsSync(CHROME)) {
  console.error(`Chrome non trovato in ${CHROME}. Impostare CHROME_PATH.`);
  process.exit(1);
}

const css = readFileSync(join(SRC, "stampa.css"), "utf8");

const sorgenti = readdirSync(SRC)
  .filter((f) => /^\d{2}-.+\.html$/.test(f))
  .sort()
  .map((file) => {
    const html = readFileSync(join(SRC, file), "utf8");
    const titolo = html.match(/data-titolo="([^"]+)"/)?.[1];
    if (!titolo) throw new Error(`${file}: manca data-titolo sull'<article>`);
    return { file, codice: file.slice(0, 2), titolo, html };
  });

function pagina(titolo, corpo, intestazioneCorrente) {
  const testata = intestazioneCorrente.replace(/"/g, '\\"');
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>${titolo}</title>
<style>${css}
@page { @top-left { content: "N'arte — ${testata}"; font: 8pt "Helvetica Neue", Arial, sans-serif; color: #777; } }
@page :first { @top-left { content: none; } }
</style></head><body>${corpo}</body></html>`;
}

function stampa(htmlPath, pdfPath) {
  execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=4000",
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  if (!existsSync(pdfPath)) throw new Error(`PDF non generato: ${pdfPath}`);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

for (const s of sorgenti) {
  const nome = s.file.replace(/\.html$/, "");
  const tmp = join(TMP, `${nome}.html`);
  writeFileSync(tmp, pagina(s.titolo, s.html, s.titolo));
  stampa(tmp, join(OUT, `${nome}.pdf`));
  console.log(`✓ ${nome}.pdf`);
}

const copertina = `
<section class="copertina">
  <div>
    <div class="marchio">N'arte — documenti legali</div>
    <h1>Fascicolo legale<br>della piattaforma N'arte</h1>
    <div class="barra"></div>
    <p class="sottotitolo">Termini, condizioni e politiche della piattaforma, redatti sul
    funzionamento effettivo del servizio e sottoposti alla revisione del legale incaricato.</p>
  </div>
  <div class="dati">
    <strong>Titolare del servizio:</strong> Eduardo Castronuovo, ditta individuale — P.IVA IT11071661216<br>
    Via Domenico Fontana 27, 80128 Napoli<br>
    <strong>Versione:</strong> ${VERSIONE}<br>
    <strong>Data:</strong> ${DATA}<br><br>
    Documento riservato. Bozza non ancora validata: non va pubblicata né inviata agli utenti
    prima della revisione e dell'approvazione del legale.
  </div>
</section>
<section class="indice">
  <h2>Indice del fascicolo</h2>
  <ol>
    ${sorgenti.map((s) => `<li><span>${s.codice} · ${s.titolo}</span></li>`).join("\n    ")}
  </ol>
</section>`;

const fascicolo = join(TMP, "fascicolo.html");
writeFileSync(
  fascicolo,
  pagina(
    "Fascicolo legale N'arte",
    `${copertina}<div class="salto"></div>${sorgenti.map((s) => s.html).join("\n")}`,
    "Fascicolo legale",
  ),
);
stampa(fascicolo, join(OUT, "NARTE-fascicolo-legale-completo.pdf"));
console.log("✓ NARTE-fascicolo-legale-completo.pdf");

rmSync(TMP, { recursive: true, force: true });
