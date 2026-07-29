// Invia un'email di prova con i valori di esempio del template.
//
//   npm run email:test -- <chiave> [destinatario]
//
// ATTENZIONE: questo CONSUMA quota (piano gratuito: 300 invii al giorno).
// Va usato solo dopo che `npm run email:preview` è verde, e una volta sola
// per template. Le verifiche a costo zero sono email:build e email:preview.
//
// Usa POST /smtp/email con templateId + params, cioè lo stesso percorso che
// userà l'applicazione: se funziona qui, funziona in produzione. Non passa
// da sendTest, che invece userebbe i dati di esempio memorizzati su Brevo e
// non proverebbe i nostri parametri.
//
// L'invio NON viene registrato in email_log: questo script non tocca il
// database. Le prove restano visibili nelle statistiche di Brevo.

import { TEMPLATES } from "../lib/brevo/templates/index.ts";

const API = "https://api.brevo.com/v3";
const [key, toArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || "N'arte";
const to = toArg || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPERADMIN_EMAIL;

if (!apiKey) fail("BREVO_API_KEY mancante in .env.local");
if (!senderEmail) fail("BREVO_SENDER_EMAIL mancante in .env.local");
if (!to) fail("Nessun destinatario: passalo come secondo argomento o imposta ADMIN_NOTIFICATION_EMAIL");
if (!key) {
  console.error("❌ Manca la chiave del template.\n\nDisponibili:");
  for (const t of TEMPLATES) console.error(`  ${t.key}`);
  process.exit(1);
}

const tpl = TEMPLATES.find((t) => t.key === key);
if (!tpl) fail(`Chiave "${key}" non presente nel manifest`);

const envVar = `BREVO_TEMPLATE_${key.toUpperCase()}`;
const templateId = Number(process.env[envVar]);
if (!Number.isFinite(templateId) || templateId <= 0) {
  fail(`${envVar} non valorizzata: pubblica prima il template con "npm run email:sync"`);
}

console.log(`Invio "${tpl.key}" (id ${templateId}) a ${to}…`);
console.log(`Mittente: ${senderName} <${senderEmail}>`);

const res = await fetch(`${API}/smtp/email`, {
  method: "POST",
  headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify({
    templateId,
    to: [{ email: to }],
    params: tpl.sample,
    sender: { email: senderEmail, name: senderName },
  }),
});

const text = await res.text();
if (!res.ok) {
  let msg = text;
  try {
    msg = JSON.parse(text).message ?? text;
  } catch {
    /* corpo non JSON: si mostra grezzo */
  }
  console.error(`\n❌ Invio fallito (HTTP ${res.status}): ${msg}`);
  if (res.status === 401) console.error("   Chiave API non valida.");
  if (/sender/i.test(String(msg))) {
    console.error("   Il mittente deve essere un sender verificato su Brevo.");
  }
  process.exit(1);
}

console.log(`\n✔  Inviata. ${text}`);
console.log("Consumato 1 invio dei 300 giornalieri del piano gratuito.");

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}
