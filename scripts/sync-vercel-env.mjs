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
  "SUPERADMIN_EMAIL",
  "ADMIN_NOTIFICATION_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
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

let ok = 0;
let skipped = 0;
let failed = 0;

for (const name of EXPORTABLE) {
  const value = env[name];
  if (!value || value.startsWith("TODO") || value.startsWith("YOUR_")) {
    console.log(`⏭️  ${name}: skip (vuoto/segnaposto)`);
    skipped++;
    continue;
  }
  for (const envName of ENVIRONMENTS) {
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
