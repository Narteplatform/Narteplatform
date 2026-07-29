// Genera la preview locale dei template email.
//
//   npm run email:build
//
// Non chiama Brevo, non tocca il database, non invia nulla: legge il
// manifest in lib/brevo/templates/, scrive i file in .brevo-preview/ e
// controlla che ogni {{params.x}} usato nell'HTML esista davvero fra i
// parametri tipizzati di quella email.
//
// Due file per template:
//   <chiave>.html          sorgente, con i placeholder ancora visibili —
//                          è esattamente ciò che verrà pushato su Brevo
//   <chiave>.preview.html  con i valori di esempio già sostituiti
//
// Apri .brevo-preview/index.html per vederli tutti affiancati.

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { TEMPLATES } from "../lib/brevo/templates/index.ts";
import { renderLocal, usedParams } from "../lib/brevo/preview.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".brevo-preview");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let problems = 0;

for (const tpl of TEMPLATES) {
  const declared = new Set(Object.keys(tpl.sample));
  const used = usedParams(tpl.html);

  // Un parametro usato ma non dichiarato arriverebbe vuoto in casella senza
  // che nulla segnali l'errore: è il caso che questa verifica esiste per
  // intercettare.
  const unknown = used.filter((p) => !declared.has(p));
  const unused = [...declared].filter((p) => !used.includes(p));

  if (unknown.length) {
    console.error(`✖  ${tpl.key} → parametri usati ma non dichiarati: ${unknown.join(", ")}`);
    problems++;
  }

  writeFileSync(join(OUT, `${tpl.key}.html`), tpl.html, "utf8");
  writeFileSync(join(OUT, `${tpl.key}.preview.html`), renderLocal(tpl.html, tpl.sample), "utf8");

  const note = unused.length ? `  ·  non usati: ${unused.join(", ")}` : "";
  console.log(`✔  ${tpl.key.padEnd(34)} ${(tpl.html.length / 1024).toFixed(1).padStart(5)} KB  ·  ${used.length} parametri${note}`);
}

// --- indice ---------------------------------------------------------------

const cards = TEMPLATES.map(
  (t) => `  <section>
    <h2>${t.key}</h2>
    <p class="meta"><strong>Oggetto:</strong> ${escapeHtml(t.subject)}</p>
    <div class="frames">
      <figure><figcaption>Desktop · 600px</figcaption><iframe src="${t.key}.preview.html" width="600" height="900"></iframe></figure>
      <figure><figcaption>Mobile · 375px</figcaption><iframe src="${t.key}.preview.html" width="375" height="900"></iframe></figure>
    </div>
  </section>`
).join("\n");

const index = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>Preview email N'arte</title>
  <style>
    body { margin:0; padding:32px; background:#22303c; color:#f7f5f2;
           font-family:system-ui,-apple-system,sans-serif; }
    h1 { font-size:22px; margin:0 0 4px; }
    .lead { margin:0 0 32px; color:#a8bccb; font-size:14px; max-width:70ch; }
    section { margin:0 0 48px; }
    h2 { font-size:15px; font-family:ui-monospace,monospace; color:#7fd1ff; margin:0 0 4px; }
    .meta { margin:0 0 12px; font-size:13px; color:#a8bccb; }
    .frames { display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start; }
    figure { margin:0; }
    figcaption { font-size:12px; color:#a8bccb; margin-bottom:6px; }
    iframe { border:0; background:#f7f5f2; border-radius:8px; }
  </style>
</head>
<body>
  <h1>Preview email N'arte — ${TEMPLATES.length} template</h1>
  <p class="lead">Rendering locale con i valori di esempio. È un'approssimazione del motore di Brevo
  e del tutto diverso da come renderizzano Outlook o Gmail: serve a validare struttura, colori e
  gerarchia, non a certificare la resa finale.</p>
${cards}
</body>
</html>
`;

writeFileSync(join(OUT, "index.html"), index, "utf8");

console.log(`\n${TEMPLATES.length} template scritti in .brevo-preview/`);
console.log(`Apri:  open .brevo-preview/index.html`);

if (problems) {
  console.error(`\n${problems} template con parametri non dichiarati.`);
  process.exit(1);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
