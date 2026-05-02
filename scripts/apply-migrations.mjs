// Applica le SQL migration in supabase/migrations/ via DATABASE_URL.
// Idempotente: ogni file deve essere già scritto in modo idempotente.
//
// Uso:
//   1) imposta DATABASE_URL con la password vera del DB (Supabase → Settings → Database)
//      es: postgresql://postgres:<TUA_PASSWORD>@db.<ref>.supabase.co:5432/postgres
//   2) node --env-file=.env.local scripts/apply-migrations.mjs
//
// Se DATABASE_URL contiene "YOUR_DB_PASSWORD" (placeholder), lo script si ferma con
// un'istruzione chiara su come applicare le migration via Supabase SQL editor.

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(__dirname, "..", "supabase", "migrations");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || dbUrl.includes("YOUR_DB_PASSWORD")) {
  console.log("⚠️  DATABASE_URL non configurato (placeholder presente).");
  console.log("");
  console.log("Per applicare le migration esegui questi step (1 minuto):");
  console.log(" 1. Vai su https://supabase.com/dashboard/project/nppzchkgzltcokvxcpji/sql/new");
  console.log(" 2. Copia-incolla il contenuto di (in ordine):");
  console.log("    - supabase/migrations/0003_fix_rls_recursion.sql");
  console.log("    - supabase/migrations/0004_admin_artist_extras.sql");
  console.log("    - supabase/migrations/0005_genres_instruments_socials.sql");
  console.log("    - supabase/migrations/0006_slots_and_event_extras.sql");
  console.log(" 3. Premi Run.");
  console.log("");
  console.log("In alternativa: Settings → Database → copia la password DB,");
  console.log("aggiornala in .env.local (DATABASE_URL) e rilancia questo script.");
  process.exit(0);
}

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("❌ Modulo 'pg' non trovato. Esegui: npm install pg");
  process.exit(1);
}

const { Client } = pg.default ?? pg;
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("🔌 Connessione DB stabilita");

const files = (await readdir(MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();

for (const f of files) {
  const sql = await readFile(join(MIG_DIR, f), "utf8");
  process.stdout.write(`▶ ${f} … `);
  try {
    await client.query(sql);
    console.log("✅");
  } catch (e) {
    console.log("❌");
    console.error(`   ${e.message}`);
  }
}

await client.end();
console.log("🎉 Migration completate");
