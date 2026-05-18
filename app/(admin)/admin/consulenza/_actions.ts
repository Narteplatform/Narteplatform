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
  consultantId: z.string().uuid().optional(),
});

export async function createSlot(input: {
  slotAt: string;
  durationMin?: number;
  consultantId?: string;
}) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = slotSchema.safeParse({
    slotAt: input.slotAt,
    durationMin: input.durationMin ?? 30,
    consultantId: input.consultantId,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("consultant_slots").insert({
    slot_at: parsed.data.slotAt,
    duration_min: parsed.data.durationMin,
    is_active: true,
    consultant_id: parsed.data.consultantId ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza");
  revalidatePath("/admin/consulenza/slots");
  if (parsed.data.consultantId) {
    revalidatePath(`/admin/consulenza/consulenti/${parsed.data.consultantId}`);
  }
  revalidatePath("/artisti");
  revalidatePath("/dashboard/consulenza");
  return { ok: true as const };
}

export async function createSlotBatch(input: {
  consultantId: string;
  dates: string[]; // array di ISO datetime
  durationMin?: number;
}) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  if (!input.consultantId || !z.string().uuid().safeParse(input.consultantId).success) {
    return { ok: false as const, error: "Consulente non valido" };
  }
  const dates = (input.dates ?? []).filter(Boolean);
  if (dates.length === 0) return { ok: false as const, error: "Nessuna data selezionata" };
  const duration = input.durationMin ?? 30;
  const admin = createAdminClient();
  const rows = dates.map((d) => ({
    slot_at: d,
    duration_min: duration,
    is_active: true,
    consultant_id: input.consultantId,
  }));
  const { error } = await admin.from("consultant_slots").insert(rows);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/consulenza/consulenti/${input.consultantId}`);
  revalidatePath("/admin/consulenza");
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const, count: rows.length };
}

const consultantSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .email("Email non valida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
  bio: z.string().trim().max(1000).optional().or(z.literal("").transform(() => undefined)),
  avatarUrl: z
    .string()
    .url("URL avatar non valido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function createConsultant(input: z.infer<typeof consultantSchema>) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = consultantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("consultants")
    .insert({
      name: parsed.data.name,
      role: parsed.data.role ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      bio: parsed.data.bio ?? null,
      avatar_url: parsed.data.avatarUrl ?? null,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza");
  revalidatePath("/admin/consulenza/consulenti");
  revalidatePath("/dashboard/consulenza");
  return { ok: true as const, id: (data as { id: string } | null)?.id ?? null };
}

export async function updateConsultant(
  consultantId: string,
  input: z.infer<typeof consultantSchema>
) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = consultantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultants")
    .update({
      name: parsed.data.name,
      role: parsed.data.role ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      bio: parsed.data.bio ?? null,
      avatar_url: parsed.data.avatarUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultantId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/consulenza/consulenti/${consultantId}`);
  revalidatePath("/admin/consulenza/consulenti");
  revalidatePath("/dashboard/consulenza");
  return { ok: true as const };
}

export async function toggleConsultant(consultantId: string, isActive: boolean) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultants")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", consultantId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/consulenti");
  revalidatePath(`/admin/consulenza/consulenti/${consultantId}`);
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteConsultant(consultantId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin.from("consultants").delete().eq("id", consultantId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/consulenti");
  revalidatePath("/dashboard/consulenza");
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
