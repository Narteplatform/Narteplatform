"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createElement } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/emails/send";
import ConsultationRequestEmail from "@/lib/emails/templates/ConsultationRequestEmail";

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "boostcreativeai@gmail.com";

const bookSchema = z.object({
  slotId: z.string().uuid(),
  needs: z.string().trim().max(1000).optional(),
});

export async function bookConsultationAsArtist(input: {
  slotId: string;
  needs?: string;
}) {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Devi accedere come artista" };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "artist" && role !== "superadmin") {
    return { ok: false as const, error: "Solo artisti possono prenotare con auto-conferma" };
  }

  const { data: slot } = await admin
    .from("consultant_slots")
    .select("id, slot_at, consultant_id, is_active")
    .eq("id", parsed.data.slotId)
    .maybeSingle();
  if (!slot || !slot.is_active) {
    return { ok: false as const, error: "Slot non disponibile" };
  }

  // Verifica che non sia già preso
  const { data: existing } = await admin
    .from("consultations")
    .select("id")
    .eq("slot_id", parsed.data.slotId)
    .in("status", ["requested", "confirmed"])
    .maybeSingle();
  if (existing) {
    return { ok: false as const, error: "Slot già prenotato" };
  }

  // Recupera nome artista
  let displayName = (profile as { full_name?: string | null } | null)?.full_name ?? null;
  if (!displayName) {
    const { data: artist } = await admin
      .from("artists")
      .select("stage_name")
      .eq("user_id", user.id)
      .maybeSingle();
    displayName = (artist as { stage_name?: string } | null)?.stage_name ?? "Artista";
  }

  const { error } = await admin.from("consultations").insert({
    slot_id: parsed.data.slotId,
    user_id: user.id,
    name: displayName,
    email: user.email ?? "",
    phone: null,
    needs: parsed.data.needs ?? null,
    status: "confirmed",
  });
  if (error) return { ok: false as const, error: error.message };

  // Email notifica
  const slotAt = new Date(slot.slot_at).toLocaleString("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
  });
  await Promise.all([
    user.email
      ? sendEmail({
          to: user.email,
          subject: `Appuntamento confermato con N'arte · ${slotAt}`,
          template: "ConsultationConfirmedArtist",
          react: createElement(ConsultationRequestEmail, {
            toRole: "user",
            name: displayName ?? "Artista",
            slotAt,
            needs: parsed.data.needs ?? "Prenotazione artista (auto-confermata).",
          }),
        }).catch((e) => console.error("[email] artist book:", e))
      : Promise.resolve(),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Artista ha prenotato consulenza · ${displayName}`,
      template: "ConsultationConfirmedAdmin",
      react: createElement(ConsultationRequestEmail, {
        toRole: "admin",
        name: displayName ?? "Artista",
        email: user.email ?? undefined,
        slotAt,
        needs: parsed.data.needs ?? "Prenotazione artista (auto-confermata).",
      }),
    }).catch((e) => console.error("[email] artist book admin:", e)),
  ]);

  revalidatePath("/dashboard/consulenza");
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}
