// Pubblica su Brevo i template email definiti nel repo.
//
//   npm run email:sync:dry              → mostra cosa cambierebbe, non tocca nulla
//   npm run email:sync                  → crea/aggiorna tutti i template
//   npm run email:sync -- <chiave>      → solo quella
//   npm run email:sync -- --write-env   → aggiorna le BREVO_TEMPLATE_* in .env.local
//
// La fonte di verità è lib/brevo/templates/: Brevo ne è una copia. Lo script
// non cancella MAI nulla — non esiste un --prune — e non tocca i template che
// non conosce.
//
// Come ritrova un template già esistente, in ordine:
//   1. la env var BREVO_TEMPLATE_<CHIAVE>
//   2. il marker invisibile <!-- narte:key=... --> dentro l'HTML remoto
//   3. il nome, che contiene la chiave fra parentesi quadre
// Il marker è la difesa vera contro i duplicati: lo emette layout(), quindi
// non si può dimenticare, ed è invisibile nel pannello Brevo.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { TEMPLATES } from "../lib/brevo/templates/index.ts";
import { usedParams } from "../lib/brevo/preview.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.brevo.com/v3";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const writeEnv = args.includes("--write-env");
const only = args.find((a) => !a.startsWith("--"));

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || "N'arte";

if (!apiKey) fail("BREVO_API_KEY mancante in .env.local");
if (!senderEmail) fail("BREVO_SENDER_EMAIL mancante in .env.local");

const headers = {
  "api-key": apiKey,
  "content-type": "application/json",
  accept: "application/json",
};

async function brevo(path, method = "GET", body) {
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
  if (!res.ok) throw new Error(parsed?.message || `HTTP ${res.status}`);
  return parsed;
}

/** Env var attesa per una chiave: application_received → BREVO_TEMPLATE_APPLICATION_RECEIVED */
function envVarFor(key) {
  return `BREVO_TEMPLATE_${key.toUpperCase()}`;
}

// --- 1. selezione e validazione -------------------------------------------

const selected = TEMPLATES.filter((t) => !only || t.key === only);
if (selected.length === 0) fail(`Chiave "${only}" non presente nel manifest`);

let invalid = 0;
for (const tpl of selected) {
  const declared = new Set(Object.keys(tpl.sample));
  const unknown = usedParams(tpl.html).filter((p) => !declared.has(p));
  if (unknown.length) {
    console.error(`✖  ${tpl.key} → parametri non dichiarati: ${unknown.join(", ")}`);
    invalid++;
  }
}
if (invalid) fail(`${invalid} template con parametri non validi. Niente è stato pubblicato.`);

// --- 2. inventario remoto -------------------------------------------------

console.log("Leggo i template già presenti su Brevo…");
const remote = [];
for (let offset = 0; ; offset += 50) {
  const page = await brevo(`/smtp/templates?limit=50&offset=${offset}`);
  const list = page?.templates ?? [];
  remote.push(...list);
  if (list.length === 0 || remote.length >= (page?.count ?? 0)) break;
}
console.log(`  ${remote.length} template sull'account.\n`);

/** Estrae la chiave dal marker che layout() inserisce in cima all'HTML. */
function markerKey(html) {
  return html ? (html.match(/<!--\s*narte:key=([\w_]+)\s*-->/)?.[1] ?? null) : null;
}

function resolveId(tpl) {
  const fromEnv = Number(process.env[envVarFor(tpl.key)]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return { id: fromEnv, how: "env" };

  const byMarker = remote.find((r) => markerKey(r.htmlContent) === tpl.key);
  if (byMarker) return { id: byMarker.id, how: "marker" };

  const byName = remote.find((r) => (r.name || "").includes(`[${tpl.key}]`));
  if (byName) return { id: byName.id, how: "nome" };

  return { id: null, how: "nuovo" };
}

// --- 3. push --------------------------------------------------------------

const results = [];
let created = 0;
let updated = 0;
let unchanged = 0;

for (const tpl of selected) {
  const { id, how } = resolveId(tpl);
  const payload = {
    templateName: tpl.name,
    subject: tpl.subject,
    sender: { name: senderName, email: senderEmail },
    htmlContent: tpl.html,
    isActive: true,
    tag: "narte-transactional",
  };

  const size = `${(tpl.html.length / 1024).toFixed(1)} KB`;

  try {
    if (id) {
      const current = remote.find((r) => r.id === id);
      const same =
        current &&
        current.htmlContent === tpl.html &&
        current.subject === tpl.subject &&
        current.name === tpl.name;

      if (same) {
        console.log(`=  ${tpl.key.padEnd(34)} invariato (id ${id})`);
        unchanged++;
        results.push({ key: tpl.key, id });
        continue;
      }
      if (dryRun) {
        console.log(`↻  ${tpl.key.padEnd(34)} verrebbe AGGIORNATO (id ${id}, trovato via ${how}) · ${size}`);
      } else {
        await brevo(`/smtp/templates/${id}`, "PUT", payload);
        console.log(`↻  ${tpl.key.padEnd(34)} aggiornato (id ${id}, via ${how}) · ${size}`);
      }
      updated++;
      results.push({ key: tpl.key, id });
    } else {
      if (dryRun) {
        console.log(`✚  ${tpl.key.padEnd(34)} verrebbe CREATO · ${size}`);
        results.push({ key: tpl.key, id: null });
      } else {
        const res = await brevo("/smtp/templates", "POST", payload);
        console.log(`✚  ${tpl.key.padEnd(34)} creato (id ${res.id}) · ${size}`);
        results.push({ key: tpl.key, id: res.id });
      }
      created++;
    }
  } catch (err) {
    console.error(`✖  ${tpl.key.padEnd(34)} ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(
  `\n${created} da creare, ${updated} da aggiornare, ${unchanged} invariati.` +
    (dryRun ? "  (dry-run: nessuna modifica inviata)" : "")
);

// --- 4. env ---------------------------------------------------------------

const withId = results.filter((r) => r.id);

if (!dryRun && withId.length) {
  if (writeEnv) {
    updateEnvFile(withId);
  } else {
    console.log("\nAggiungi a .env.local (oppure rilancia con --write-env):");
    for (const r of withId) console.log(`  ${envVarFor(r.key)}=${r.id}`);
    console.log("\nPoi:  npm run vercel:sync-env");
  }
}

/**
 * Riscrive in place le righe BREVO_TEMPLATE_* di .env.local preservando
 * commenti e ordine. È l'unica scrittura su file dello script, ed è opt-in.
 */
function updateEnvFile(entries) {
  const path = join(ROOT, ".env.local");
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    console.error("\n✖  .env.local non leggibile: le variabili non sono state scritte.");
    return;
  }

  const lines = content.split("\n");
  const pending = new Map(entries.map((e) => [envVarFor(e.key), String(e.id)]));

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#?\s*(BREVO_TEMPLATE_[A-Z0-9_]+)\s*=/);
    if (m && pending.has(m[1])) {
      lines[i] = `${m[1]}=${pending.get(m[1])}`;
      pending.delete(m[1]);
    }
  }

  if (pending.size) {
    lines.push("", "# Id dei template Brevo (scritti da scripts/brevo-sync.mjs)");
    for (const [k, v] of pending) lines.push(`${k}=${v}`);
  }

  writeFileSync(path, lines.join("\n"), "utf8");
  console.log(`\n✔  .env.local aggiornato con ${entries.length} id.`);
  console.log("Poi:  npm run vercel:sync-env");
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}
