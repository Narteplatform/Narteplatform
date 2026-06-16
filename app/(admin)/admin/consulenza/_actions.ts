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

// Autorizza superadmin (accesso totale) oppure consultant (limitato al proprio profilo).
// Per il consultant restituisce anche il consultantId della sua riga in `consultants`.
async function ensureConsultantOrAdmin() {
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
  const role = (profile as { role?: string } | null)?.role;
  if (role === "superadmin") {
    return { ok: true as const, user, isSuperadmin: true as const, consultantId: null as string | null };
  }
  if (role === "consultant") {
    const { data: row } = await admin
      .from("consultants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const consultantId = (row as { id: string } | null)?.id ?? null;
    if (!consultantId) {
      return { ok: false as const, error: "Profilo consulente non collegato" };
    }
    return { ok: true as const, user, isSuperadmin: false as const, consultantId };
  }
  return { ok: false as const, error: "Permessi insufficienti" };
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
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  if (!input.consultantId || !z.string().uuid().safeParse(input.consultantId).success) {
    return { ok: false as const, error: "Consulente non valido" };
  }
  // Un consulente può creare slot solo per sé stesso.
  if (!ctx.isSuperadmin && input.consultantId !== ctx.consultantId) {
    return { ok: false as const, error: "Permessi insufficienti" };
  }
  const dates = Array.from(new Set((input.dates ?? []).filter(Boolean)));
  if (dates.length === 0) return { ok: false as const, error: "Nessuna data selezionata" };
  const duration = input.durationMin ?? 30;
  const admin = createAdminClient();

  // Evita duplicati (stesso consultant_id + slot_at) escludendo gli slot già esistenti.
  const { data: existing } = await admin
    .from("consultant_slots")
    .select("slot_at")
    .eq("consultant_id", input.consultantId)
    .in("slot_at", dates);
  const existingSet = new Set(((existing ?? []) as { slot_at: string }[]).map((s) => s.slot_at));
  const rows = dates
    .filter((d) => !existingSet.has(d))
    .map((d) => ({
      slot_at: d,
      duration_min: duration,
      is_active: true,
      consultant_id: input.consultantId,
    }));
  if (rows.length === 0) return { ok: true as const, count: 0 };
  const { error } = await admin.from("consultant_slots").insert(rows);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/consulenza/consulenti/${input.consultantId}`);
  revalidatePath("/admin/consulenza");
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const, count: rows.length };
}

// #9 — Mass editing multi-giorno: crea lo stesso template di orari su più giorni.
export async function createSlotBatchMulti(input: {
  consultantId: string;
  days: string[]; // array di date locali "YYYY-MM-DD"
  hours: string[]; // array di orari "HH:MM"
  durationMin?: number;
}) {
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  if (!input.consultantId || !z.string().uuid().safeParse(input.consultantId).success) {
    return { ok: false as const, error: "Consulente non valido" };
  }
  if (!ctx.isSuperadmin && input.consultantId !== ctx.consultantId) {
    return { ok: false as const, error: "Permessi insufficienti" };
  }
  const days = (input.days ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const hours = (input.hours ?? []).filter((h) => /^\d{1,2}:\d{2}$/.test(h));
  if (days.length === 0) return { ok: false as const, error: "Nessun giorno selezionato" };
  if (hours.length === 0) return { ok: false as const, error: "Nessun orario selezionato" };
  const duration = input.durationMin ?? 30;

  const allIso = new Set<string>();
  for (const day of days) {
    const [yyyy, mo, dd] = day.split("-").map(Number);
    for (const h of hours) {
      const [hh, mm] = h.split(":").map(Number);
      if ([yyyy, mo, dd, hh, mm].some((n) => Number.isNaN(n))) continue;
      allIso.add(new Date(yyyy, mo - 1, dd, hh, mm, 0).toISOString());
    }
  }
  const isoList = Array.from(allIso);
  if (isoList.length === 0) return { ok: false as const, error: "Nessuno slot generato" };

  const admin = createAdminClient();
  // Esclude gli slot già presenti per evitare violazioni di unicità.
  const { data: existing } = await admin
    .from("consultant_slots")
    .select("slot_at")
    .eq("consultant_id", input.consultantId)
    .in("slot_at", isoList);
  const existingSet = new Set(((existing ?? []) as { slot_at: string }[]).map((s) => s.slot_at));
  const rows = isoList
    .filter((iso) => !existingSet.has(iso))
    .map((iso) => ({
      slot_at: iso,
      duration_min: duration,
      is_active: true,
      consultant_id: input.consultantId,
    }));
  if (rows.length === 0) return { ok: true as const, count: 0 };
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
  createAccount: z.boolean().optional(),
  password: z.string().min(8, "Password min 8 caratteri").optional().or(z.literal("").transform(() => undefined)),
});

export async function createConsultant(input: z.infer<typeof consultantSchema>) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = consultantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  if (parsed.data.createAccount && (!parsed.data.email || !parsed.data.password)) {
    return { ok: false as const, error: "Email e password obbligatorie per creare l'account" };
  }
  const admin = createAdminClient();

  let userId: string | null = null;
  if (parsed.data.createAccount && parsed.data.email && parsed.data.password) {
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { role: "consultant", full_name: parsed.data.name },
    });
    if (authErr || !created?.user) {
      return { ok: false as const, error: authErr?.message ?? "Errore creazione account" };
    }
    userId = created.user.id;
    // Trigger handle_new_user crea già il profilo con role=consultant.
    // Aggiorna esplicitamente per sicurezza.
    await admin.from("profiles").update({ role: "consultant", full_name: parsed.data.name }).eq("id", userId);
  }

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
      user_id: userId,
    })
    .select("id")
    .single();
  if (error) {
    if (userId) await admin.auth.admin.deleteUser(userId);
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/consulenza");
  revalidatePath("/admin/consulenza/consulenti");
  revalidatePath("/dashboard/consulenza");
  return { ok: true as const, id: (data as { id: string } | null)?.id ?? null };
}

export async function linkConsultantAccount(input: {
  consultantId: string;
  email: string;
  password: string;
}) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  if (!input.email || !input.password || input.password.length < 8) {
    return { ok: false as const, error: "Email valida e password (min 8) obbligatorie" };
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("consultants")
    .select("id, name, user_id")
    .eq("id", input.consultantId)
    .maybeSingle();
  const row = existing as { id: string; name: string; user_id: string | null } | null;
  if (!row) return { ok: false as const, error: "Consulente non trovato" };
  if (row.user_id) return { ok: false as const, error: "Account già collegato" };

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: "consultant", full_name: row.name },
  });
  if (authErr || !created?.user) {
    return { ok: false as const, error: authErr?.message ?? "Errore creazione account" };
  }
  const userId = created.user.id;
  await admin.from("profiles").update({ role: "consultant", full_name: row.name }).eq("id", userId);
  const { error: linkErr } = await admin
    .from("consultants")
    .update({ user_id: userId, email: input.email, updated_at: new Date().toISOString() })
    .eq("id", input.consultantId);
  if (linkErr) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false as const, error: linkErr.message };
  }
  revalidatePath(`/admin/consulenza/consulenti/${input.consultantId}`);
  return { ok: true as const };
}

export async function updateConsultant(
  consultantId: string,
  input: z.infer<typeof consultantSchema>
) {
  // #15 — Un consulente può aggiornare il PROPRIO profilo; il superadmin qualsiasi.
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  if (!ctx.isSuperadmin && consultantId !== ctx.consultantId) {
    return { ok: false as const, error: "Permessi insufficienti" };
  }
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
  revalidatePath("/admin/profilo");
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

// Verifica che lo slot appartenga al consulente corrente (se non superadmin).
async function assertSlotOwnership(
  admin: ReturnType<typeof createAdminClient>,
  ctx: { isSuperadmin: boolean; consultantId: string | null },
  slotIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ctx.isSuperadmin) return { ok: true };
  if (!ctx.consultantId) return { ok: false, error: "Profilo consulente non collegato" };
  if (slotIds.length === 0) return { ok: true };
  const consultantId = ctx.consultantId;
  const { data: owned } = await admin
    .from("consultant_slots")
    .select("id")
    .in("id", slotIds)
    .eq("consultant_id", consultantId);
  const ownedIds = new Set(((owned ?? []) as { id: string }[]).map((s) => s.id));
  if (slotIds.some((id) => !ownedIds.has(id))) {
    return { ok: false, error: "Permessi insufficienti su uno o più slot" };
  }
  return { ok: true };
}

export async function toggleSlot(slotId: string, isActive: boolean) {
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const own = await assertSlotOwnership(admin, ctx, [slotId]);
  if (!own.ok) return { ok: false as const, error: own.error };
  const { error } = await admin
    .from("consultant_slots")
    .update({ is_active: isActive })
    .eq("id", slotId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteSlot(slotId: string) {
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const own = await assertSlotOwnership(admin, ctx, [slotId]);
  if (!own.ok) return { ok: false as const, error: own.error };
  const { error } = await admin.from("consultant_slots").delete().eq("id", slotId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// #9 — Azioni bulk su un insieme di slot (attiva/disattiva tutti, elimina tutti).
export async function toggleSlotBatch(slotIds: string[], isActive: boolean) {
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  const ids = (slotIds ?? []).filter((id) => z.string().uuid().safeParse(id).success);
  if (ids.length === 0) return { ok: false as const, error: "Nessuno slot selezionato" };
  const admin = createAdminClient();
  const own = await assertSlotOwnership(admin, ctx, ids);
  if (!own.ok) return { ok: false as const, error: own.error };
  const { error } = await admin
    .from("consultant_slots")
    .update({ is_active: isActive })
    .in("id", ids);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const, count: ids.length };
}

export async function deleteSlotBatch(slotIds: string[]) {
  const ctx = await ensureConsultantOrAdmin();
  if (!ctx.ok) return ctx;
  const ids = (slotIds ?? []).filter((id) => z.string().uuid().safeParse(id).success);
  if (ids.length === 0) return { ok: false as const, error: "Nessuno slot selezionato" };
  const admin = createAdminClient();
  const own = await assertSlotOwnership(admin, ctx, ids);
  if (!own.ok) return { ok: false as const, error: own.error };
  const { error } = await admin.from("consultant_slots").delete().in("id", ids);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza/slots");
  revalidatePath("/dashboard/consulenza");
  revalidatePath("/artisti");
  return { ok: true as const, count: ids.length };
}

// #12 — Assegna un consulente reale a uno slot legacy (consultant_id NULL).
export async function assignConsultantToSlot(slotId: string, consultantId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  if (!z.string().uuid().safeParse(slotId).success) {
    return { ok: false as const, error: "Slot non valido" };
  }
  if (!z.string().uuid().safeParse(consultantId).success) {
    return { ok: false as const, error: "Consulente non valido" };
  }
  const admin = createAdminClient();
  const { data: consultant } = await admin
    .from("consultants")
    .select("id, is_active")
    .eq("id", consultantId)
    .maybeSingle();
  if (!consultant) return { ok: false as const, error: "Consulente non trovato" };
  const { error } = await admin
    .from("consultant_slots")
    .update({ consultant_id: consultantId })
    .eq("id", slotId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/consulenza");
  revalidatePath("/admin/consulenza/confermati");
  revalidatePath("/admin/consulenza/slots");
  revalidatePath(`/admin/consulenza/consulenti/${consultantId}`);
  revalidatePath("/dashboard/consulenza");
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
