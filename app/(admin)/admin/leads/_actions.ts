"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { ok: false as const, error: "Permessi insufficienti" };
  return { ok: true as const, supabase };
}

export async function updateLeadStatus(leadId: string, status: "new" | "contacted" | "closed") {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}
