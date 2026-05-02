// Crea (o aggiorna) gli account fissi della piattaforma N'arte:
// - boostcreativeai@gmail.com  → superadmin
// - luigimarzaticodigital@gmail.com → artist (con record collegato in artists)
//
// Idempotente: se l'utente esiste già il ruolo viene riallineato.
//
// Uso:
//   node --env-file=.env.local scripts/seed-accounts.mjs
//
// Variabili .env.local richieste:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SEED_SUPERADMIN_PASSWORD   (es. "Cambia!Subito1")
//   SEED_ARTIST_PASSWORD       (es. "Cambia!Subito2")

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancante in .env.local");
  process.exit(1);
}

const adminPwd = process.env.SEED_SUPERADMIN_PASSWORD;
const artistPwd = process.env.SEED_ARTIST_PASSWORD;
if (!adminPwd || !artistPwd) {
  console.error(
    "❌ Imposta SEED_SUPERADMIN_PASSWORD e SEED_ARTIST_PASSWORD in .env.local prima di rilanciare."
  );
  process.exit(1);
}

const accounts = [
  {
    email: "boostcreativeai@gmail.com",
    password: adminPwd,
    role: "superadmin",
    fullName: "N'arte Admin",
  },
  {
    email: "luigimarzaticodigital@gmail.com",
    password: artistPwd,
    role: "artist",
    fullName: "Luigi Marzatico",
    artist: {
      stage_name: "Luigi Marzatico",
      slug: "luigi-marzatico",
      city: "Napoli",
      genre: ["pop", "cantautore"],
      bio: "Artista N'arte. Profilo demo per la piattaforma.",
    },
  },
];

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUser(email) {
  // listUsers gestisce paginazione fino a ~1000 utenti per pagina (sufficiente in dev/prod iniziale).
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

for (const acc of accounts) {
  console.log(`\n— ${acc.email} (${acc.role}) —`);

  let user = await findUser(acc.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: { full_name: acc.fullName },
    });
    if (error) {
      console.error(`  ❌ Errore createUser: ${error.message}`);
      continue;
    }
    user = data.user;
    console.log(`  ✅ Utente creato (id ${user.id})`);
  } else {
    console.log(`  ℹ️  Utente esistente (id ${user.id})`);
  }

  // Riallinea il profilo (il trigger dovrebbe averlo creato in automatico)
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, role: acc.role, full_name: acc.fullName }, { onConflict: "id" });
  if (profErr) {
    console.error(`  ❌ Errore profilo: ${profErr.message}`);
    continue;
  }
  console.log(`  ✅ Profilo allineato a ruolo "${acc.role}"`);

  if (acc.artist) {
    const { error: artistErr } = await admin
      .from("artists")
      .upsert(
        {
          user_id: user.id,
          stage_name: acc.artist.stage_name,
          slug: acc.artist.slug,
          city: acc.artist.city,
          genre: acc.artist.genre,
          bio: acc.artist.bio,
          status: "approved",
        },
        { onConflict: "slug" }
      );
    if (artistErr) {
      console.error(`  ❌ Errore artista: ${artistErr.message}`);
    } else {
      console.log(`  ✅ Artista "${acc.artist.stage_name}" collegato (slug ${acc.artist.slug})`);
    }
  }
}

console.log("\n🎉 Seed accounts completato.");
console.log("   Login attivi (cambia subito le password dopo il primo accesso):");
for (const acc of accounts) {
  console.log(`   • ${acc.email} → ${acc.role === "superadmin" ? "/admin" : "/dashboard"}`);
}
