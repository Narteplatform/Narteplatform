// Verifica connessione Supabase usando le chiavi in .env.local
// Esegui con:  node --env-file=.env.local scripts/check-supabase.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("❌ Variabili .env.local mancanti");
  process.exit(1);
}

console.log("🔌 Verifico connessione a", url);

const anonClient = createClient(url, anon);
const adminClient = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  "profiles",
  "artists",
  "artist_availability",
  "events",
  "leads",
  "artist_applications",
  "contact_messages",
  "collaborations",
];

let ok = 0;
let fail = 0;

for (const t of tables) {
  const { error, count } = await adminClient
    .from(t)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`  ❌ ${t}: ${error.message}`);
    fail++;
  } else {
    console.log(`  ✅ ${t} (${count ?? 0} righe)`);
    ok++;
  }
}

console.log(`\n📊 ${ok}/${tables.length} tabelle OK`);

// Verifica auth admin API
const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
if (usersError) {
  console.log("❌ auth.admin.listUsers:", usersError.message);
} else {
  console.log(`👤 ${usersData.users.length} utenti registrati`);
}

// Verifica storage buckets
const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
if (bucketsError) {
  console.log("❌ storage.listBuckets:", bucketsError.message);
} else {
  console.log(`🪣 ${buckets.length} bucket: ${buckets.map((b) => b.name).join(", ")}`);
}

if (fail > 0) {
  console.log("\n⚠️  Alcune tabelle non sono raggiungibili. Verifica che la migration sia applicata.");
  process.exit(1);
}

console.log("\n✅ Connessione Supabase OK");
