"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createElement } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/emails/send";
import ConsultationRequestEmail from "@/lib/emails/templates/ConsultationRequestEmail";
import { checkMonthlyQuota, getEntitlementsForUser } from "@/lib/billing/entitlements";
import { resolveActiveArtist } from "@/lib/artist/current";
import { TITOLARE } from "@/lib/legal/titolare";

// Notifiche al team: la casella interna configurata, altrimenti il recapito unico.
const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPERADMIN_EMAIL || TITOLARE.emailContatti;

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

  // Quota di piano. Il superadmin non ha un profilo artista collegato e non
  // viene limitato: prenota per conto del team.
  if (role === "artist") {
    const ctx = await getEntitlementsForUser(user.id);
    if (ctx) {
      const quota = await checkMonthlyQuota(
        { artistId: ctx.artistId, userId: user.id },
        ctx.entitlements,
        "consultation"
      );
      if (!quota.ok) return { ok: false as const, error: quota.error };
    }
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
    // Profilo attivo: con più profili, .maybeSingle() qui andrebbe in errore.
    const active = await resolveActiveArtist(user.id);
    displayName = active?.stage_name ?? "Artista";
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

/**
 * Disdetta di una consulenza da parte dell'artista (doc. 03, art. 8).
 *
 * Prima si poteva disdire solo scrivendo ai contatti. Ora la disdetta è in
 * autonomia fino a 24 ore prima dell'appuntamento; dopo, resta il contatto con
 * il team. Una consulenza disdetta non consuma la quota del mese.
 */
const PREAVVISO_MS = 24 * 3600 * 1000;

export async function cancelConsultationAsArtist(consultationId: string) {
  const idOk = z.string().uuid().safeParse(consultationId);
  if (!idOk.success) return { ok: false as const, error: "Consulenza non valida" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Devi accedere" };

  const admin = createAdminClient();
  const { data: c, error: readErr } = await admin
    .from("consultations")
    .select("id, user_id, status, slot_id, name")
    .eq("id", idOk.data)
    .maybeSingle();
  if (readErr) return { ok: false as const, error: "Non è stato possibile leggere la consulenza." };
  if (!c || c.user_id !== user.id) return { ok: false as const, error: "Consulenza non trovata" };
  if (c.status !== "requested" && c.status !== "confirmed") {
    return { ok: false as const, error: "Questa consulenza non è più attiva." };
  }

  const { data: slot, error: slotErr } = c.slot_id
    ? await admin.from("consultant_slots").select("slot_at").eq("id", c.slot_id).maybeSingle()
    : { data: null, error: null };
  if (slotErr) return { ok: false as const, error: "Non è stato possibile leggere l'appuntamento." };
  if (slot && new Date(slot.slot_at).getTime() - Date.now() < PREAVVISO_MS) {
    return {
      ok: false as const,
      error: "Mancano meno di 24 ore: per disdire scrivi al team dalla pagina contatti.",
    };
  }

  const { data: aggiornate, error } = await admin
    .from("consultations")
    .update({ status: "cancelled" })
    .eq("id", c.id)
    .in("status", ["requested", "confirmed"])
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "La consulenza è cambiata nel frattempo: ricarica la pagina." };
  }

  const quando = slot
    ? new Date(slot.slot_at).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" })
    : "data da definire";
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Consulenza disdetta dall'artista · ${c.name ?? "Artista"} · ${quando}`,
    template: "ConsultationCancelledByArtist",
    react: createElement(ConsultationRequestEmail, {
      toRole: "admin",
      name: c.name ?? "Artista",
      slotAt: quando,
      needs: "L'artista ha disdetto la consulenza dalla propria area. Lo slot è di nuovo libero.",
    }),
  }).catch(() => undefined);

  revalidatePath("/dashboard/consulenza");
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}
