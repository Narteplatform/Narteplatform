"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "superadmin") {
    return { ok: false as const, error: "Permessi insufficienti" };
  }
  return { ok: true as const, user };
}

const slotSchema = z.object({
  slotAt: z.string().datetime("Data/ora non valida"),
  durationMin: z.number().int().min(15).max(180).default(30),
});

export async function createSlot(input: { slotAt: string; durationMin?: number }) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = slotSchema.safeParse({ slotAt: input.slotAt, durationMin: input.durationMin ?? 30 });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("consultant_slots").insert({
    slot_at: parsed.data.slotAt,
    duration_min: parsed.data.durationMin,
    is_active: true,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza");
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function toggleSlot(slotId: string, isActive: boolean) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultant_slots")
    .update({ is_active: isActive })
    .eq("id", slotId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteSlot(slotId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin.from("consultant_slots").delete().eq("id", slotId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/artisti");
  return { ok: true as const };
}

const statusSchema = z.enum(["requested", "confirmed", "completed", "cancelled"]);

export async function updateConsultationStatus(
  consultationId: string,
  status: z.infer<typeof statusSchema>
) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  if (!statusSchema.safeParse(status).success) {
    return { ok: false as const, error: "Status non valido" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultations")
    .update({ status })
    .eq("id", consultationId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}

export async function updateConsultationNotes(consultationId: string, notes: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultations")
    .update({ admin_notes: notes })
    .eq("id", consultationId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}
