"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { MOTIVAZIONE_MIN, registraAzione, registraDecisione } from "@/lib/moderation/decisioni";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { MOTIVO_ESCLUSO, STATI_ESCLUDIBILI } from "@/lib/inviti/regole";

/**
 * Gestione del programma «Invita un artista» dal pannello.
 *
 * Tre interventi, tutti motivati e registrati:
 *   - disattivare un link (abuso, spam): chi lo apre arriva alla candidatura
 *     normale; gli inviti già registrati proseguono;
 *   - riattivarlo;
 *   - escludere un singolo invito PRIMA del premio: non darà il mese di Pro.
 *
 * Il premio già assegnato non si revoca da qui: è un credito Stripe o un
 * periodo di Pro già goduto, e toglierlo è una decisione da prendere a mano.
 *
 * Disattivazione ed esclusione sono decisioni che toccano l'artista: passano
 * da registraDecisione (registro + email con motivo e reclamo), come ogni
 * altra decisione del team.
 */

const AREA = "admin/inviti";

export type EsitoInviti = { ok: true; notified: boolean } | { ok: false; error: string };

const uuid = z.string().uuid();
const motivazione = z
  .string()
  .trim()
  .min(MOTIVAZIONE_MIN, `Scrivi una motivazione di almeno ${MOTIVAZIONE_MIN} caratteri.`)
  .max(1000, "La motivazione può avere al massimo 1000 caratteri.");

function rinfresca(userId: string) {
  revalidatePath("/admin/inviti");
  revalidatePath(`/admin/inviti/${userId}`);
}

export async function disattivaLinkAction(userId: string, motivo: string): Promise<EsitoInviti> {
  const attore = await requireAdminPageAccess("inviti");
  const id = uuid.safeParse(userId);
  const m = motivazione.safeParse(motivo);
  if (!id.success) return { ok: false, error: "Account non valido." };
  if (!m.success) return { ok: false, error: m.error.issues[0]?.message ?? "Motivazione non valida." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invite_codes")
    .update({ disabled_at: new Date().toISOString() })
    .eq("user_id", id.data)
    .is("disabled_at", null)
    .select("code");
  if (error) {
    logger.error(AREA, "disattivazione link:", error.message);
    return { ok: false, error: "Non riesco a disattivare il link. Riprova fra un momento." };
  }
  const riga = (data ?? [])[0];
  if (!riga) return { ok: false, error: "Il link è già disattivato, oppure non esiste. Ricarica la pagina." };

  const esito = await registraDecisione({
    actorId: attore.id,
    targetType: "invite_code",
    targetId: id.data,
    targetName: riga.code,
    action: "disattiva_link_invito",
    reason: m.data,
    affectedUserId: id.data,
    notify: {
      decision: "abbiamo disattivato il tuo link «Invita un artista».",
      target: `Link d'invito ${getSiteUrl()}/invito/${riga.code}`,
      consequences:
        "Chi apre il link arriva alla candidatura normale e non risulta più invitato da te. Gli inviti già registrati restano validi e seguono le regole del programma.",
    },
  });
  rinfresca(id.data);
  if (!esito.ok) return { ok: false, error: `Link disattivato, ma la decisione non è stata registrata: ${esito.error}` };
  return { ok: true, notified: esito.notified };
}

export async function riattivaLinkAction(userId: string, motivo: string): Promise<EsitoInviti> {
  const attore = await requireAdminPageAccess("inviti");
  const id = uuid.safeParse(userId);
  if (!id.success) return { ok: false, error: "Account non valido." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invite_codes")
    .update({ disabled_at: null })
    .eq("user_id", id.data)
    .not("disabled_at", "is", null)
    .select("code");
  if (error) {
    logger.error(AREA, "riattivazione link:", error.message);
    return { ok: false, error: "Non riesco a riattivare il link. Riprova fra un momento." };
  }
  const riga = (data ?? [])[0];
  if (!riga) return { ok: false, error: "Il link è già attivo, oppure non esiste. Ricarica la pagina." };

  await registraAzione({
    actorId: attore.id,
    targetType: "invite_code",
    targetId: id.data,
    action: "riattiva_link_invito",
    descrizione: motivo.trim() || `Link d'invito ${riga.code} riattivato`,
    affectedUserId: id.data,
  });
  rinfresca(id.data);
  return { ok: true, notified: false };
}

export async function escludiInvitoAction(inviteId: string, motivo: string): Promise<EsitoInviti> {
  const attore = await requireAdminPageAccess("inviti");
  const id = uuid.safeParse(inviteId);
  const m = motivazione.safeParse(motivo);
  if (!id.success) return { ok: false, error: "Invito non valido." };
  if (!m.success) return { ok: false, error: m.error.issues[0]?.message ?? "Motivazione non valida." };

  const admin = createAdminClient();
  const { data: invito, error: errLettura } = await admin
    .from("artist_invites")
    .select("id, inviter_user_id, invitee_stage_name, status")
    .eq("id", id.data)
    .maybeSingle();
  if (errLettura) {
    logger.error(AREA, "lettura invito da escludere:", errLettura.message);
    return { ok: false, error: "Non riesco a leggere l'invito. Riprova fra un momento." };
  }
  if (!invito) return { ok: false, error: "Invito non trovato." };
  if (!STATI_ESCLUDIBILI.includes(invito.status)) {
    return { ok: false, error: "Questo invito è già chiuso: non si può più escludere." };
  }

  // Transizione condizionata allo stato letto: se nel frattempo il cron l'ha
  // confermato, non si tocca.
  const { data: agg, error: errAgg } = await admin
    .from("artist_invites")
    .update({ status: "annullato", cancel_reason: MOTIVO_ESCLUSO, updated_at: new Date().toISOString() })
    .eq("id", invito.id)
    .eq("status", invito.status)
    .select("id");
  if (errAgg) {
    logger.error(AREA, "esclusione invito:", errAgg.message);
    return { ok: false, error: "Non riesco a escludere l'invito. Riprova fra un momento." };
  }
  if ((agg ?? []).length !== 1) {
    return { ok: false, error: "Lo stato dell'invito è appena cambiato. Ricarica la pagina e controlla." };
  }

  const esito = await registraDecisione({
    actorId: attore.id,
    targetType: "artist_invite",
    targetId: invito.id,
    targetName: invito.invitee_stage_name,
    action: "escludi_invito",
    reason: m.data,
    affectedUserId: invito.inviter_user_id,
    notify: {
      decision: `abbiamo escluso dal programma «Invita un artista» l'invito di ${invito.invitee_stage_name}: non darà diritto al mese di Pro.`,
      target: `Invito di «${invito.invitee_stage_name}»`,
      consequences: "Gli altri tuoi inviti e i premi già ricevuti non cambiano.",
    },
  });
  rinfresca(invito.inviter_user_id);
  if (!esito.ok) return { ok: false, error: `Invito escluso, ma la decisione non è stata registrata: ${esito.error}` };
  return { ok: true, notified: esito.notified };
}
