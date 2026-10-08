import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import { normalizzaStato, PERCORSO_IN_ATTESA } from "@/lib/organizers/stato";
import { isUtenteSospeso, queryLoginBloccato } from "@/lib/auth/sospeso";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Account sospeso con una sessione ancora aperta: `banned_until` arriva con
  // l'utente, nessuna query in più. In un Server Component i cookie non si
  // possono cancellare (l'errore è ignorato dal client), ma il middleware
  // intercetta la richiesta successiva e li toglie.
  if (isUtenteSospeso(user)) {
    await supabase.auth.signOut();
    redirect(`/login?${queryLoginBloccato(user)}`);
  }

  // Admin client per la lettura del profilo: bypassa RLS in modo sicuro
  // (l'id è già verificato da auth.getUser server-side) ed evita la
  // ricorsione infinita causata dalle policy "is superadmin" su profiles.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.id)
    .single();
  return profile ? { ...user, profile } : { ...user, profile: null };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role | Role[]) {
  const user = await requireUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!user.profile || !roles.includes(user.profile.role)) redirect("/");
  return user;
}

export async function getConsultantForUser(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("consultants")
    .select("id, name, email, avatar_url, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  return data as
    | { id: string; name: string; email: string | null; avatar_url: string | null; is_active: boolean }
    | null;
}

export async function getOrganizerForUser(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/**
 * Guardia delle pagine e delle azioni dell'organizzatore.
 *
 * APPROVAZIONE (migration 0071). Un organizzatore `pending` o `rejected`
 * viene mandato alla pagina di attesa; il superadmin non è mai bloccato. Lo
 * stato si legge dalla stessa riga già caricata (`select *`): se la colonna non
 * esiste ancora il campo è `undefined` e vale «approved», come prima.
 *
 * CREAZIONE LAZY DELLA RIGA. Capita solo per un superadmin che apre l'area, o
 * per un organizzatore la cui riga non è stata creata dalla trigger. Per il
 * superadmin la riga nasce `approved`. Per un organizzatore NON si imposta lo
 * stato: vale il default della colonna, cioè `pending` dopo la migration
 * (corretto: nessuno l'ha approvato) e nessuna colonna prima (comportamento di
 * prima). Gli organizzatori esistenti hanno già la riga: la migration la crea
 * con il backfill, approvata. Se la lettura della riga fallisce NON si prova a
 * crearla: sarebbe una scrittura derivata da una lettura non riuscita.
 */
export async function requireOrganizer() {
  const user = await requireRole(["organizer", "superadmin"]);
  const isSuper = user.profile?.role === "superadmin";
  const admin = createAdminClient();

  const { data: esistente, error: letturaErr } = await admin
    .from("organizers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (letturaErr) {
    throw new Error(`[guards] lettura organizzatore fallita: ${letturaErr.message}`);
  }

  let organizer = esistente;
  if (!organizer) {
    const display =
      user.profile?.full_name || user.email?.split("@")[0] || "Organizzatore";
    let creato = await admin
      .from("organizers")
      .insert(
        isSuper
          ? { user_id: user.id, display_name: display, approval_status: "approved" }
          : { user_id: user.id, display_name: display }
      )
      .select()
      .single();
    if (creato.error && isSuper && colonnaAssente(creato.error)) {
      // Migration non ancora applicata: la colonna non c'è, si crea come prima.
      creato = await admin
        .from("organizers")
        .insert({ user_id: user.id, display_name: display })
        .select()
        .single();
    }
    if (creato.error || !creato.data) {
      throw new Error(`[guards] creazione organizzatore fallita: ${creato.error?.message ?? "vuota"}`);
    }
    organizer = creato.data;
  }

  if (!isSuper && normalizzaStato(organizer.approval_status) !== "approved") {
    redirect(PERCORSO_IN_ATTESA);
  }
  return { user, organizer };
}
