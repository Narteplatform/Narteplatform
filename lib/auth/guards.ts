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
