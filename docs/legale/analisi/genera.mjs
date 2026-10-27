#!/usr/bin/env node
/**
 * Stampa l'analisi della piattaforma per il legale e la unisce al fascicolo.
 *
 *   node docs/legale/analisi/genera.mjs                 # rigenera anche il fascicolo
 *   node docs/legale/analisi/genera.mjs --senza-fascicolo
 *
 * Passi:
 *  1. rigenera il fascicolo con ../genera-pdf.mjs (salvo --senza-fascicolo);
 *  2. stampa analisi-piattaforma.html con Chrome headless → pdf/NARTE-analisi-piattaforma.pdf;
 *  3. unisce analisi + fascicolo completo → pdf/NARTE-analisi-e-fascicolo-legale.pdf;
 *  4. copia i due PDF in ~/Downloads/NARTE-documenti-per-avvocato/.
 *
 * Nessuna dipendenza npm. Per l'unione usa `pdfunite` (poppler, `brew install poppler`)
 * oppure, se manca, l'azione di sistema macOS «Combine PDF Pages». La numerazione
 * delle pagine resta quella di ciascuna parte (analisi, poi fascicolo).
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const LEGALE = join(QUI, "..");
const OUT = join(LEGALE, "pdf");
const DOWNLOADS = join(homedir(), "Downloads", "NARTE-documenti-per-avvocato");
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ANALISI_HTML = join(QUI, "analisi-piattaforma.html");
const ANALISI_PDF = join(OUT, "NARTE-analisi-piattaforma.pdf");
const FASCICOLO_PDF = join(OUT, "NARTE-fascicolo-legale-completo.pdf");
const UNICO_PDF = join(OUT, "NARTE-analisi-e-fascicolo-legale.pdf");

if (!existsSync(CHROME)) {
  console.error(`Chrome non trovato in ${CHROME}. Impostare CHROME_PATH.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// 1. Fascicolo
if (!process.argv.includes("--senza-fascicolo")) {
  execFileSync(process.execPath, [join(LEGALE, "genera-pdf.mjs")], { stdio: "inherit" });
}
if (!existsSync(FASCICOLO_PDF)) {
  console.error(`Manca ${FASCICOLO_PDF}: lanciare prima node docs/legale/genera-pdf.mjs`);
  process.exit(1);
}

// 2. Analisi
execFileSync(
  CHROME,
  [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=6000",
    `--print-to-pdf=${ANALISI_PDF}`,
    pathToFileURL(ANALISI_HTML).href,
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
if (!existsSync(ANALISI_PDF)) throw new Error(`PDF non generato: ${ANALISI_PDF}`);
console.log("✓ NARTE-analisi-piattaforma.pdf");

// 3. PDF unico
function trova(cmd) {
  try {
    return execFileSync("/usr/bin/which", [cmd], { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}
const pdfunite = trova("pdfunite");
const joinMac = "/System/Library/Automator/Combine PDF Pages.action/Contents/MacOS/join";
if (pdfunite) {
  execFileSync(pdfunite, [ANALISI_PDF, FASCICOLO_PDF, UNICO_PDF], { stdio: "inherit" });
} else if (existsSync(joinMac)) {
  execFileSync(joinMac, ["-o", UNICO_PDF, ANALISI_PDF, FASCICOLO_PDF], { stdio: "inherit" });
} else {
  console.error("Né pdfunite né «Combine PDF Pages» disponibili: installare poppler (brew install poppler).");
  process.exit(1);
}
if (!existsSync(UNICO_PDF) || statSync(UNICO_PDF).size === 0) throw new Error(`PDF unico non generato: ${UNICO_PDF}`);
console.log("✓ NARTE-analisi-e-fascicolo-legale.pdf");

// 4. Copia per l'invio
mkdirSync(DOWNLOADS, { recursive: true });
for (const f of [ANALISI_PDF, UNICO_PDF]) copyFileSync(f, join(DOWNLOADS, f.split("/").pop()));
console.log(`✓ copiati in ${DOWNLOADS}`);
