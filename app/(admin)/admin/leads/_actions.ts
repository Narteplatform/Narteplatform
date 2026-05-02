"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "superadmin") return { ok: false as const, error: "Permessi insufficienti" };
  return { ok: true as const, db: admin };
}

export async function updateLeadStatus(leadId: string, status: "new" | "contacted" | "closed") {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.db.from("leads").update({ status }).eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}

export async function setLeadTags(leadId: string, tags: string[]) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const clean = Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 30)
    )
  ).slice(0, 20);
  const { error } = await ctx.db.from("leads").update({ tags: clean }).eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}

export async function deleteLead(leadId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.db.from("leads").delete().eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}
