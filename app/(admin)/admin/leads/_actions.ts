"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";

// Una Server Action è un endpoint HTTP raggiungibile direttamente: il solo
// controllo del ruolo superadmin non bastava, perché un superadmin delegato
// senza accesso alla pagina "Lead" poteva comunque invocare queste azioni
// (es. deleteLead). requireAdminPageAccess applica anche il permesso per-pagina.

export async function updateLeadStatus(leadId: string, status: "new" | "contacted" | "closed") {
  await requireAdminPageAccess("leads");
  const admin = createAdminClient();
  const { error } = await admin.from("leads").update({ status }).eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}

export async function setLeadTags(leadId: string, tags: string[]) {
  await requireAdminPageAccess("leads");
  const admin = createAdminClient();
  const clean = Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 30)
    )
  ).slice(0, 20);
  const { error } = await admin.from("leads").update({ tags: clean }).eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}

export async function deleteLead(leadId: string) {
  await requireAdminPageAccess("leads");
  const admin = createAdminClient();
  const { error } = await admin.from("leads").delete().eq("id", leadId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true as const };
}
