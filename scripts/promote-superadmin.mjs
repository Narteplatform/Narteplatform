// Promuove un utente al ruolo superadmin.
// Da eseguire DOPO che l'utente ha completato signup + conferma email.
//
// Uso:
//   node --env-file=.env.local scripts/promote-superadmin.mjs
//   node --env-file=.env.local scripts/promote-superadmin.mjs altra@email.com

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetEmail = process.argv[2] || process.env.SUPERADMIN_EMAIL;

if (!url || !service) {
  console.error("❌ Variabili .env.local mancanti");
  process.exit(1);
}
if (!targetEmail) {
  console.error("❌ Email mancante. Passala come argomento o imposta SUPERADMIN_EMAIL.");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`🔍 Cerco utente con email ${targetEmail}...`);

const { data: list, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error("❌ Errore lista utenti:", listError.message);
  process.exit(1);
}

const user = list.users.find(
  (u) => u.email && u.email.toLowerCase() === targetEmail.toLowerCase()
);

if (!user) {
  console.error(`❌ Nessun utente trovato con email ${targetEmail}.`);
  console.error("   Registrati prima su /register, poi rilancia questo script.");
  process.exit(1);
}

console.log(`✅ Utente trovato: ${user.id}`);

// Assicura che esista il profilo (il trigger dovrebbe averlo gia' creato)
const { data: existingProfile } = await admin
  .from("profiles")
  .select("id, role")
  .eq("id", user.id)
  .maybeSingle();

if (!existingProfile) {
  const { error: insertError } = await admin.from("profiles").insert({
    id: user.id,
    role: "superadmin",
    full_name: user.user_metadata?.full_name ?? null,
  });
  if (insertError) {
    console.error("❌ Errore creazione profilo:", insertError.message);
    process.exit(1);
  }
  console.log("✅ Profilo creato con ruolo superadmin");
} else {
  if (existingProfile.role === "superadmin") {
    console.log("ℹ️  L'utente è già superadmin. Nessuna modifica.");
    process.exit(0);
  }
  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "superadmin" })
    .eq("id", user.id);
  if (updateError) {
    console.error("❌ Errore promozione:", updateError.message);
    process.exit(1);
  }
  console.log(`✅ Ruolo aggiornato: ${existingProfile.role} → superadmin`);
}

console.log(`\n🎉 ${targetEmail} è ora superadmin.`);
console.log("   Accedi su /login e potrai entrare in /admin.");
