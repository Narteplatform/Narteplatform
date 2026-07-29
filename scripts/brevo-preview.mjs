// Rende un template col motore VERO di Brevo, senza inviare nulla.
//
//   npm run email:preview               → tutti i template già pubblicati
//   npm run email:preview -- <chiave>   → solo quello
//
// Non consuma quota: `preview` renderizza e restituisce l'HTML, non spedisce.
// È la verifica che conta davvero, perché la preview locale usa la stessa
// lista di nomi dei template e quindi non può accorgersi di un refuso in un
// {{params.x}}: qui invece è Brevo a sostituire, e un nome sbagliato resta
// vuoto nell'output.
//
// Salva il risultato in .brevo-preview/<chiave>.brevo.html e segnala le
// differenze rilevanti rispetto al rendering locale.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { TEMPLATES } from "../lib/brevo/templates/index.ts";
import { renderLocal } from "../lib/brevo/preview.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".brevo-preview");
const API = "https://api.brevo.com/v3";

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error("❌ BREVO_API_KEY mancante in .env.local");
  process.exit(1);
}

const headers = { "api-key": apiKey, "content-type": "application/json", accept: "application/json" };

/**
 * Il contatto è obbligatorio: con i soli `params` Brevo risponde
 * "Contact not found". Non viene inviato nulla — serve solo a dare
 * all'endpoint un destinatario da cui leggere gli attributi. Vince
 * comunque ciò che passiamo in `params`.
 */
const contact = process.env.BREVO_PREVIEW_CONTACT || process.env.BREVO_SENDER_EMAIL;

/**
 * L'endpoint valido è `/smtp/template/preview` con l'id nel corpo — quello
 * per risorsa risponde 404 "Invalid route". La seconda forma resta come
 * riserva se Brevo dovesse cambiarlo.
 */
async function preview(templateId, params) {
  const attempts = [
    { path: `/smtp/template/preview`, body: { templateId, email: contact, params } },
    { path: `/smtp/templates/${templateId}/preview`, body: { email: contact, params } },
  ];
  let lastError = "";
  for (const a of attempts) {
    const res = await fetch(`${API}${a.path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(a.body),
    });
    const text = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(text);
      } catch {
        return { html: text };
      }
    }
    lastError = `${res.status} ${text.slice(0, 200)}`;
    if (res.status !== 404 && res.status !== 405) break;
  }
  throw new Error(lastError);
}

mkdirSync(OUT, { recursive: true });

const selected = TEMPLATES.filter((t) => !only || t.key === only);
let checked = 0;
let skipped = 0;

for (const tpl of selected) {
  const envVar = `BREVO_TEMPLATE_${tpl.key.toUpperCase()}`;
  const id = Number(process.env[envVar]);
  if (!Number.isFinite(id) || id <= 0) {
    console.log(`–  ${tpl.key.padEnd(34)} non ancora pubblicato (${envVar} vuota)`);
    skipped++;
    continue;
  }

  try {
    const res = await preview(id, tpl.sample);
    const html = res?.html ?? res?.htmlContent ?? "";
    writeFileSync(join(OUT, `${tpl.key}.brevo.html`), html, "utf8");

    // Un placeholder sopravvissuto al rendering è un nome che Brevo non
    // conosce: arriverebbe vuoto — o peggio, visibile — nella casella.
    const leftovers = [...html.matchAll(/\{\{\s*params\.(\w+)\s*\}\}/g)].map((m) => m[1]);
    const local = renderLocal(tpl.html, tpl.sample);
    const delta = html.length - local.length;

    const flags = [];
    if (leftovers.length) flags.push(`placeholder non risolti: ${[...new Set(leftovers)].join(", ")}`);
    if (Math.abs(delta) > 400) flags.push(`lunghezza diversa dal rendering locale (${delta > 0 ? "+" : ""}${delta} caratteri)`);

    const mark = flags.length ? "!" : "✔";
    console.log(`${mark}  ${tpl.key.padEnd(34)} id ${id}${flags.length ? "  →  " + flags.join(" · ") : ""}`);
    checked++;
  } catch (err) {
    console.error(`✖  ${tpl.key.padEnd(34)} ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(`\n${checked} verificati, ${skipped} non ancora pubblicati. Nessun invio consumato.`);
if (checked) console.log("HTML di Brevo salvato in .brevo-preview/<chiave>.brevo.html");
