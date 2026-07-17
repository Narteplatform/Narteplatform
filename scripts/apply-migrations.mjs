// Applica le SQL migration in supabase/migrations/ via DATABASE_URL.
//
// Tiene traccia di ciò che è già stato applicato in `public.schema_migrations`:
// ogni file gira UNA VOLTA SOLA. Questo è il motivo per cui esiste la tabella —
// la versione precedente rieseguiva tutti i file a ogni lancio, seed compresi, e
// 0030_seed_booking_info.sql non ha protezioni `on conflict`.
//
// Uso:
//   npm run db:apply              applica le migration non ancora applicate
//   npm run db:apply -- --status  mostra cosa è applicato e cosa manca
//   npm run db:apply -- --baseline marca TUTTE le migration come applicate senza
//                                  eseguirle (per un DB già allineato a mano)
//   npm run db:apply -- --dry-run  elenca cosa verrebbe applicato, senza farlo
//
// DATABASE_URL — Supabase → Settings → Database → Connection string.
//
// ⚠️  Usare la stringa del POOLER in "Session mode" (porta 5432):
//       postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
//     La connessione diretta (db.<ref>.supabase.co) è raggiungibile solo via IPv6
//     senza l'add-on IPv4: da molte reti fallisce con ENETUNREACH.
//     Il pooler in "Transaction mode" (porta 6543) NON va bene: non supporta
//     tutte le istruzioni DDL/prepared statement usate qui.

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(__dirname, "..", "supabase", "migrations");

const args = new Set(process.argv.slice(2));
const isStatus = args.has("--status");
const isBaseline = args.has("--baseline");
const isDryRun = args.has("--dry-run");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || dbUrl.includes("YOUR_DB_PASSWORD")) {
  console.log("⚠️  DATABASE_URL non configurato (placeholder presente).\n");
  console.log("Per abilitare l'applicazione automatica delle migration:");
  console.log(" 1. Supabase → Settings → Database → Connection string → URI");
  console.log(" 2. Scegli la stringa del pooler in SESSION MODE (porta 5432):");
  console.log("      postgresql://postgres.nppzchkgzltcokvxcpji:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres");
  console.log(" 3. Incollala in .env.local come DATABASE_URL=…");
  console.log(" 4. La PRIMA volta, su un DB già allineato a mano:");
  console.log("      npm run db:apply -- --baseline");
  console.log("    (marca le migration esistenti come applicate senza rieseguirle)");
  console.log("\nIn alternativa, continua ad applicarle a mano dal SQL editor:");
  console.log("  https://supabase.com/dashboard/project/nppzchkgzltcokvxcpji/sql/new");
  process.exit(1);
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

try {
  await client.connect();
} catch (e) {
  console.error(`❌ Connessione fallita: ${e.message}`);
  if (/ENETUNREACH|ETIMEDOUT/.test(e.message)) {
    console.error("   Sintomo tipico della connessione diretta (IPv6-only).");
    console.error("   Usa la stringa del pooler in session mode (porta 5432).");
  }
  process.exit(1);
}
console.log("🔌 Connessione DB stabilita");

await client.query(`
  create table if not exists public.schema_migrations (
    filename   text primary key,
    checksum   text not null,
    applied_at timestamptz not null default now()
  );
`);

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

const files = (await readdir(MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
const { rows } = await client.query("select filename, checksum from public.schema_migrations");
const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

const pending = [];
const drifted = [];
for (const f of files) {
  const sql = await readFile(join(MIG_DIR, f), "utf8");
  const sum = sha(sql);
  if (!applied.has(f)) pending.push({ f, sql, sum });
  else if (applied.get(f) !== sum) drifted.push(f);
}

// Un file già applicato ma modificato dopo: il DB e il repo dicono cose diverse.
// Non si riapplica in automatico (potrebbe non essere idempotente) ma va detto,
// perché è la strada maestra per un ambiente che diverge in silenzio.
if (drifted.length > 0) {
  console.log(`\n⚠️  ${drifted.length} migration modificate DOPO essere state applicate:`);
  for (const f of drifted) console.log(`   - ${f}`);
  console.log("   Il DB non riflette il contenuto attuale di questi file.");
  console.log("   Se il cambiamento va applicato, eseguilo a mano dal SQL editor.\n");
}

if (isStatus) {
  console.log(`\n${applied.size}/${files.length} migration applicate.`);
  if (pending.length) {
    console.log("\nDa applicare:");
    for (const p of pending) console.log(`   - ${p.f}`);
  } else {
    console.log("Nessuna migration in attesa. ✅");
  }
  await client.end();
  process.exit(0);
}

if (isBaseline) {
  for (const { f, sum } of pending) {
    await client.query(
      "insert into public.schema_migrations (filename, checksum) values ($1, $2) on conflict (filename) do nothing",
      [f, sum]
    );
    console.log(`▷ ${f} — marcata come applicata (baseline, non eseguita)`);
  }
  console.log(`\n✅ Baseline completata: ${files.length} migration registrate.`);
  await client.end();
  process.exit(0);
}

if (pending.length === 0) {
  console.log("\n✅ Nessuna migration da applicare.");
  await client.end();
  process.exit(0);
}

if (isDryRun) {
  console.log(`\n${pending.length} migration verrebbero applicate:`);
  for (const p of pending) console.log(`   - ${p.f}`);
  await client.end();
  process.exit(0);
}

let failed = null;
for (const { f, sql, sum } of pending) {
  process.stdout.write(`▶ ${f} … `);
  try {
    // Il file e la sua registrazione stanno nella STESSA transazione: o entrambi
    // o nessuno. Senza questo, un crash fra i due lascerebbe una migration
    // applicata ma non registrata, che al lancio successivo verrebbe rieseguita.
    await client.query("begin");
    await client.query(sql);
    await client.query(
      "insert into public.schema_migrations (filename, checksum) values ($1, $2)",
      [f, sum]
    );
    await client.query("commit");
    console.log("✅");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.log("❌");
    console.error(`   ${e.message}`);
    if (e.hint) console.error(`   HINT: ${e.hint}`);
    failed = f;
    // STOP. La versione precedente proseguiva col file successivo: le migration
    // sono ordinate perché dipendono l'una dall'altra, e applicarne una sopra
    // uno stato rotto produce un danno peggiore dell'errore iniziale.
    break;
  }
}

await client.end();

if (failed) {
  console.error(`\n❌ Interrotto su ${failed}. Le migration successive NON sono state applicate.`);
  console.error("   Il file fallito è stato annullato per intero (rollback).");
  process.exit(1);
}

console.log(`\n🎉 ${pending.length} migration applicate.`);
