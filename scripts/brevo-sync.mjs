// Sincronizza i template email del repo con Brevo.
//
//   node --env-file=.env.local scripts/brevo-sync.mjs          → sincronizza tutto
//   node --env-file=.env.local scripts/brevo-sync.mjs <chiave> → solo quella
//
// La fonte di verità è il file HTML in lib/brevo/templates/: Brevo ne è solo
// una copia. Se il template esiste già (id nella env var corrispondente) viene
// AGGIORNATO, altrimenti creato — così non si accumulano duplicati a ogni run.
//
// Nota: NON invia email. L'invio è un'altra API e richiede che il servizio
// transazionale sia attivo sull'account.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.brevo.com/v3";

/**
 * Manifest dei template. `envVar` è la variabile che contiene il templateId
 * Brevo: la stessa che legge lib/brevo/registry.ts.
 */
const TEMPLATES = {
  application_received: {
    file: "lib/brevo/templates/application-received.html",
    name: "N'arte — Candidatura ricevuta",
    subject: "Candidatura ricevuta — N'Arte",
    envVar: "BREVO_TEMPLATE_APPLICATION_RECEIVED",
  },
};

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || "N'arte";

if (!apiKey) {
  console.error("❌ BREVO_API_KEY mancante in .env.local");
  process.exit(1);
}
if (!senderEmail) {
  console.error("❌ BREVO_SENDER_EMAIL mancante in .env.local");
  process.exit(1);
}

const headers = {
  "api-key": apiKey,
  "content-type": "application/json",
  accept: "application/json",
};

async function brevo(path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = res.status === 204 ? "" : await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const msg = parsed?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parsed;
}

const only = process.argv[2];
const entries = Object.entries(TEMPLATES).filter(([k]) => !only || k === only);

if (entries.length === 0) {
  console.error(`❌ Chiave "${only}" non presente nel manifest`);
  process.exit(1);
}

let created = 0;
let updated = 0;

for (const [key, tpl] of entries) {
  const html = readFileSync(join(ROOT, tpl.file), "utf8");

  // I placeholder dichiarati nell'HTML, utili per accorgersi subito di un
  // refuso: {{params.foo}} scritto male non dà errore, arriva vuoto.
  const params = [...html.matchAll(/\{\{params\.(\w+)\}\}/g)].map((m) => m[1]);
  const uniqueParams = [...new Set(params)];

  const existingId = process.env[tpl.envVar];
  const payload = {
    templateName: tpl.name,
    subject: tpl.subject,
    sender: { name: senderName, email: senderEmail },
    htmlContent: html,
    isActive: true,
    tag: "narte-transactional",
  };

  try {
    if (existingId) {
      await brevo(`/smtp/templates/${existingId}`, "PUT", payload);
      console.log(`↻  ${key} → aggiornato (id ${existingId})`);
      updated++;
    } else {
      const res = await brevo("/smtp/templates", "POST", payload);
      console.log(`✚  ${key} → creato (id ${res.id})`);
      console.log(`   aggiungi a .env.local:  ${tpl.envVar}=${res.id}`);
      created++;
    }
    console.log(
      `   ${(html.length / 1024).toFixed(1)} KB · parametri: ${uniqueParams.length ? uniqueParams.join(", ") : "nessuno"}`
    );
  } catch (err) {
    console.error(`✖  ${key} → ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(`\n${created} creati, ${updated} aggiornati.`);
