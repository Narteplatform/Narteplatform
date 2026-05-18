"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/emails/send";
import ConsultationRequestEmail from "@/lib/emails/templates/ConsultationRequestEmail";
import { createElement } from "react";

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "boostcreativeai@gmail.com";

const consultationSchema = z.object({
  slotId: z.string().uuid("Seleziona uno slot"),
  name: z.string().trim().min(2, "Nome obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().trim().min(5, "Telefono obbligatorio"),
  needs: z.string().trim().min(10, "Descrivi le tue necessità (min 10 caratteri)"),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

export async function requestConsultation(input: ConsultationInput) {
  const parsed = consultationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Verifica slot disponibile
  const { data: slot } = await admin
    .from("consultant_slots")
    .select("id, slot_at, is_active")
    .eq("id", data.slotId)
    .maybeSingle();
  if (!slot || !slot.is_active) {
    return { ok: false as const, error: "Slot non disponibile" };
  }

  // Verifica che non sia già prenotato
  const { data: existing } = await admin
    .from("consultations")
    .select("id, status")
    .eq("slot_id", data.slotId)
    .in("status", ["requested", "confirmed"])
    .maybeSingle();
  if (existing) {
    return { ok: false as const, error: "Slot già prenotato. Scegline un altro." };
  }

  const { error } = await admin.from("consultations").insert({
    slot_id: data.slotId,
    user_id: user?.id ?? null,
    name: data.name,
    email: data.email,
    phone: data.phone,
    needs: data.needs,
    status: "requested",
  });
  if (error) return { ok: false as const, error: error.message };

  const slotAt = new Date(slot.slot_at).toLocaleString("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
  });

  // Email al richiedente + admin
  await Promise.all([
    sendEmail({
      to: data.email,
      subject: `Richiesta chiamata gratuita con N'arte · ${slotAt}`,
      react: createElement(ConsultationRequestEmail, {
        toRole: "user",
        name: data.name,
        slotAt,
        needs: data.needs,
      }),
    }).catch((e) => console.error("[email] consultation user:", e)),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Nuova richiesta consulenza · ${data.name}`,
      react: createElement(ConsultationRequestEmail, {
        toRole: "admin",
        name: data.name,
        email: data.email,
        phone: data.phone,
        slotAt,
        needs: data.needs,
      }),
    }).catch((e) => console.error("[email] consultation admin:", e)),
  ]);

  revalidatePath("/artisti");
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}
