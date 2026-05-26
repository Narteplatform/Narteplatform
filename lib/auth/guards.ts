import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

export async function requireOrganizer() {
  const user = await requireRole(["organizer", "superadmin"]);
  let organizer = await getOrganizerForUser(user.id);
  // Auto-bootstrap: se è superadmin senza riga organizer, creala
  if (!organizer) {
    const admin = createAdminClient();
    const display =
      user.profile?.full_name || user.email?.split("@")[0] || "Organizzatore";
    const { data: created } = await admin
      .from("organizers")
      .insert({ user_id: user.id, display_name: display })
      .select()
      .single();
    organizer = created ?? null;
  }
  return { user, organizer: organizer! };
}
