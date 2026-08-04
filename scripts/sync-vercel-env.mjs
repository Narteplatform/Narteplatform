// Sincronizza le variabili d'ambiente da .env.local al progetto Vercel linkato.
// Da eseguire DOPO `vercel link`.
//
// Uso:  npm run vercel:sync-env

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ENV_FILE = ".env.local";
const ENVIRONMENTS = ["production", "preview", "development"];

// Variabili da pubblicare su Vercel (in ordine).
// Le altre (es. DATABASE_URL con password segnaposto) restano locali.
const EXPORTABLE = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "BREVO_ASSET_BASE_URL",
  "BREVO_ENABLED_KEYS",
  "SUPERADMIN_EMAIL",
  "ADMIN_NOTIFICATION_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
  // Senza questa, le statistiche del piano Max restano a zero in produzione:
  // il tracking delle visite fallisce chiuso quando il salt manca.
  "VISIT_HASH_SALT",
];

if (!existsSync(ENV_FILE)) {
  console.error(`❌ ${ENV_FILE} non trovato`);
  process.exit(1);
}
if (!existsSync(".vercel/project.json")) {
  console.error("❌ Progetto non linkato. Esegui prima:  vercel link --yes");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let val = m[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[m[1]] = val;
}

// Gli id dei template Brevo si aggiungono da soli: sono una ventina e
// cambiano ogni volta che se ne pubblica uno nuovo. Elencarli a mano qui
// significherebbe dimenticarne uno e ritrovarsi in produzione con l'email
// saltata (`skipped`) mentre in locale funziona tutto.
for (const name of Object.keys(env).sort()) {
  if (name.startsWith("BREVO_TEMPLATE_") && !EXPORTABLE.includes(name)) {
    EXPORTABLE.push(name);
  }
}

let ok = 0;
let skipped = 0;
let failed = 0;

// Un valore localhost NON deve mai finire su production/preview: NEXT_PUBLIC_SITE_URL
// in .env.local è `http://localhost:3000` (giusto per il dev locale), ma spinto in
// produzione romperebbe OGNI redirect del sito — login, logout, checkout Stripe,
// portale. Un valore localhost è legittimo solo nell'ambiente `development`.
const isLocalhost = (v) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(v);

for (const name of EXPORTABLE) {
  const value = env[name];
  if (!value || value.startsWith("TODO") || value.startsWith("YOUR_")) {
    console.log(`⏭️  ${name}: skip (vuoto/segnaposto)`);
    skipped++;
    continue;
  }
  for (const envName of ENVIRONMENTS) {
    if (isLocalhost(value) && envName !== "development") {
      console.log(`⏭️  ${name} → ${envName}: skip (valore localhost, non va in ${envName})`);
      skipped++;
      continue;
    }
    // Rimuove eventuale valore esistente (idempotente)
    spawnSync("vercel", ["env", "rm", name, envName, "--yes"], { stdio: "pipe" });
    // Aggiunge il nuovo valore via stdin
    const r = spawnSync("vercel", ["env", "add", name, envName], {
      input: value + "\n",
      encoding: "utf8",
    });
    if (r.status === 0) {
      console.log(`✅ ${name} → ${envName}`);
      ok++;
    } else {
      console.log(`❌ ${name} → ${envName}: ${(r.stderr || "").trim()}`);
      failed++;
    }
  }
}

console.log(`\n📊 ${ok} ok, ${skipped} skip, ${failed} fail`);
if (failed > 0) process.exit(1);

console.log("\n💡 Prossimi step:");
console.log("   - vercel deploy --prod        per fare un deploy in produzione");
console.log("   - oppure git push: il deploy parte automatico");
