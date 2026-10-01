// Genera i PDF per l'avvocato: node docs/legale/per-avvocato/genera.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const QUI = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = join(homedir(), "Downloads", "NARTE-documenti-per-avvocato");
mkdirSync(OUT, { recursive: true });
const css = readFileSync(join(QUI, "_stile.css"), "utf8");
const font = '<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;1,400&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">';
const pagina = (titolo, corpo) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${titolo}</title>${font}<style>${css}</style></head><body><div class="brand">N'arte<span>Documentazione per il legale</span></div>${corpo}</body></html>`;

const pezzi = readdirSync(QUI).filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
const tmp = join(tmpdir(), "narte-avvocato"); mkdirSync(tmp, { recursive: true });
const stampa = (html, pdf) => {
  const f = join(tmp, "p.html"); writeFileSync(f, html);
  execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=6000", `--print-to-pdf=${pdf}`, `file://${f}`], { stdio: "ignore" });
};
const corpi = [];
for (const f of pezzi) {
  const corpo = readFileSync(join(QUI, f), "utf8");
  const titolo = /<h1>(.*?)<\/h1>/.exec(corpo)?.[1] ?? f;
  corpi.push(corpo);
  const nome = `NARTE-${f.replace(".html", "")}.pdf`;
  stampa(pagina(titolo, corpo), join(OUT, nome));
  console.log("✓", nome);
}
stampa(pagina("N'arte — Documentazione per il legale", corpi.map((c, i) => `<div style="${i ? "break-before: page;" : ""}">${c}</div>`).join("")), join(OUT, "NARTE-documentazione-completa.pdf"));
console.log("✓ NARTE-documentazione-completa.pdf →", OUT);
rmSync(tmp, { recursive: true, force: true });
