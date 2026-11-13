"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { guardPublicForm } from "@/lib/security/form-guard";
import { LIMITI } from "@/lib/security/rate-limit";
import { honeypotShape } from "@/lib/validators/schemas";
import { publicFormConsent } from "@/lib/legal/consents";
import {
  registraProvaSuIubendaInBackground,
  TESTO_CASELLA,
} from "@/lib/legal/iubenda-consent";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { buildConsultationParams } from "@/lib/emails/consultation-params";
import ConsultationRequestEmail from "@/lib/emails/templates/ConsultationRequestEmail";
import { createElement } from "react";
import { adminRecipients } from "@/lib/emails/admin-recipients";
import { logger } from "@/lib/logger";

// Notifiche al team: la casella interna configurata, altrimenti il recapito unico.
const ADMIN_EMAIL = adminRecipients({ fallback: true });

const consultationSchema = z.object({
  ...honeypotShape,
  // Nessuna casella: informativa mostrata come frase, presa visione in `publicFormConsent()`.
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

  // Modulo pubblico: prima di questa riga non c'era nulla — né trappola
  // anti-bot né soglia di invii — su un'azione che scrive a database e fa
  // partire due email. La regola di progetto vuole `guardPublicForm` su ogni
  // modulo pubblico, e questo era rimasto indietro.
  const guard = await guardPublicForm(input, LIMITI.form, {
    email: data.email,
    area: "richiesta-consulenza",
  });
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Verifica slot disponibile
  const { data: slot } = await admin
    .from("consultant_slots")
    .select("id, slot_at, duration_min, consultant_id, is_active")
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
    ...publicFormConsent(),
  });
  if (error) return { ok: false as const, error: error.message };

  registraProvaSuIubendaInBackground({
    soggettoId: user?.id,
    email: data.email,
    nomeCompleto: data.name,
    documenti: ["privacy_policy"],
    preferenze: { privacy_policy: true },
    modulo: "Richiesta di consulenza",
    testoCasella: TESTO_CASELLA.privacy,
  });

  const slotAt = new Date(slot.slot_at).toLocaleString("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
  });

  // Email al richiedente + admin
  const mailParams = await buildConsultationParams(admin, {
    slotAt: slot.slot_at,
    durationMin: slot.duration_min,
    consultantId: slot.consultant_id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    notes: data.needs,
    statusLabel: "In attesa di conferma",
    panelPath: "/",
  });
  await Promise.all([
    dispatchEmail({
      key: "consultation_request_user",
      to: data.email,
      params: mailParams,
      fallback: {
        subject: `Richiesta chiamata gratuita con N'arte · ${slotAt}`,
        template: "ConsultationRequestUser",
        react: createElement(ConsultationRequestEmail, {
          toRole: "user",
          name: data.name,
          slotAt,
          needs: data.needs,
        }),
      },
    }).catch((e) => console.error("[email] consultation user:", e)),
    dispatchEmail({
      key: "consultation_request_admin",
      to: ADMIN_EMAIL,
      params: mailParams,
      fallback: {
        subject: `Nuova richiesta consulenza · ${data.name}`,
        template: "ConsultationRequestAdmin",
        react: createElement(ConsultationRequestEmail, {
          toRole: "admin",
          name: data.name,
          email: data.email,
          phone: data.phone,
          slotAt,
          needs: data.needs,
        }),
      },
    }).catch((e) => console.error("[email] consultation admin:", e)),
  ]);

  revalidatePath("/artisti");
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}

// =========================================
// Catalogo: filtro «Libero il»
// =========================================

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export type EsitoOccupati = { ok: true; ids: string[] } | { ok: false; error: string };

/**
 * Artisti con la data segnata come occupata (`artist_availability.status =
 * 'busy'`): il filtro «Libero il» del catalogo li esclude.
 *
 * Solo lettura. Il calendario degli artisti è riservato a chi ha un account
 * (come sulla pagina profilo), quindi serve una sessione. In caso di errore si
 * restituisce un errore e il catalogo NON filtra: un elenco vuoto farebbe
 * passare per liberi anche gli artisti occupati.
 *
 * La pagina del catalogo la chiama anche lato server, per la data arrivata
 * nell'URL.
 */
export async function artistiOccupatiIl(data: string): Promise<EsitoOccupati> {
  if (typeof data !== "string" || !DATA_RE.test(data)) {
    return { ok: false, error: "Data non valida" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Accedi per filtrare per data" };

  return leggiOccupati(data);
}

// Non esportata: in un file "use server" ogni export è un endpoint pubblico,
// e questa non controlla la sessione.
async function leggiOccupati(data: string): Promise<EsitoOccupati> {
  if (!DATA_RE.test(data)) return { ok: false, error: "Data non valida" };
  try {
    const admin = createAdminClient();
    const { data: righe, error } = await admin
      .from("artist_availability")
      .select("artist_id")
      .eq("date", data)
      .eq("status", "busy");
    if (error) {
      logger.error("catalogo", "disponibilità non lette:", error.message);
      return { ok: false, error: "Non riesco a leggere le disponibilità. Riprova." };
    }
    return { ok: true, ids: [...new Set((righe ?? []).map((r) => r.artist_id))] };
  } catch (e) {
    logger.error("catalogo", "disponibilità:", e instanceof Error ? e.message : String(e));
    return { ok: false, error: "Non riesco a leggere le disponibilità. Riprova." };
  }
}
