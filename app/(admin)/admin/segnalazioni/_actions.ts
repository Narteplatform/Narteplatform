"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { registraDecisione, MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

// Come per i lead: una Server Action è un endpoint raggiungibile direttamente,
// quindi il permesso per-pagina si controlla qui e non solo nella pagina.

type Esito = { ok: true; notified?: boolean } | { ok: false; error: string };

const idSchema = z.string().uuid();

const decisionSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum(["accolta", "respinta", "archiviata"]),
  note: z
    .string()
    .trim()
    .min(MOTIVAZIONE_MIN, `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.`)
    .max(2000, "La motivazione è troppo lunga (massimo 2000 caratteri)."),
});

const TESTO_ESITO = {
  segnalazione: {
    accolta: "Abbiamo accolto la tua segnalazione e adottato una misura sul contenuto.",
    respinta: "Abbiamo esaminato la tua segnalazione e non abbiamo adottato misure.",
    archiviata: "Abbiamo archiviato la tua segnalazione senza ulteriori azioni.",
  },
  reclamo: {
    accolta: "Abbiamo accolto il tuo reclamo: la decisione contestata viene rivista.",
    respinta: "Abbiamo riesaminato la decisione e la confermiamo.",
    archiviata: "Abbiamo archiviato il tuo reclamo senza ulteriori azioni.",
  },
} as const;

export async function takeReportInCharge(id: string): Promise<Esito> {
  await requireAdminPageAccess("segnalazioni");
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Identificativo non valido." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_reports")
    .update({ status: "in_esame", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "ricevuta")
    .select("id");
  if (error) {
    logger.error("admin/segnalazioni", "presa in carico fallita", error.message);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "La segnalazione non è più in stato «ricevuta»." };
  }
  revalidatePath("/admin/segnalazioni");
  return { ok: true };
}

export async function decideReport(
  id: string,
  outcome: "accolta" | "respinta" | "archiviata",
  note: string
): Promise<Esito> {
  const user = await requireAdminPageAccess("segnalazioni");
  const parsed = decisionSchema.safeParse({ id, outcome, note });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const { outcome: esito, note: motivazione } = parsed.data;

  const admin = createAdminClient();

  // Lettura con errore controllato: senza la riga non si decide niente.
  const { data: report, error: readErr } = await admin
    .from("content_reports")
    .select("id, reference, kind, status, reporter_name, reporter_email")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readErr) {
    logger.error("admin/segnalazioni", "lettura fallita", readErr.message);
    return { ok: false, error: readErr.message };
  }
  if (!report) return { ok: false, error: "Segnalazione non trovata." };
  if (report.status !== "ricevuta" && report.status !== "in_esame") {
    return { ok: false, error: "Questa segnalazione ha già un esito." };
  }

  const now = new Date().toISOString();
  const { data: aggiornate, error: updErr } = await admin
    .from("content_reports")
    .update({
      status: esito,
      decision_note: motivazione,
      decided_by: user.id,
      decided_at: now,
      updated_at: now,
    })
    .eq("id", report.id)
    .in("status", ["ricevuta", "in_esame"])
    .select("id");
  if (updErr) {
    logger.error("admin/segnalazioni", "aggiornamento fallito", updErr.message);
    return { ok: false, error: updErr.message };
  }
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false, error: "Un altro amministratore ha già deciso su questa segnalazione." };
  }

  // Registro delle decisioni (art. 17 DSA). Non blocca: la decisione è già
  // salvata, e registraDecisione degrada da sola se la 0065 manca.
  const reg = await registraDecisione({
    actorId: user.id,
    targetType: "segnalazione",
    targetId: report.id,
    action: "esito_segnalazione",
    reason: motivazione,
    notify: false,
    reportId: report.id,
  });
  if (!reg.ok) logger.warn("admin/segnalazioni", "decisione non registrata:", reg.error);

  const kind = report.kind === "reclamo" ? "reclamo" : "segnalazione";
  const outcomeText = TESTO_ESITO[kind][esito];
  // Contro l'esito di un reclamo non c'è un secondo reclamo interno.
  const contestUrl =
    kind === "reclamo"
      ? ""
      : `${getSiteUrl()}/segnalazioni?reclamo=${encodeURIComponent(report.reference)}`;

  const res = await dispatchEmail({
    key: "report_outcome",
    to: report.reporter_email,
    params: {
      name: report.reporter_name,
      reference: report.reference,
      outcome: outcomeText,
      reason: motivazione,
      contestUrl,
    },
    meta: { reference: report.reference, outcome: esito },
    fallback: {
      subject: `Esito della tua ${kind} ${report.reference} — N'arte`,
      template: "report_outcome",
      react: createElement(NoticeEmail, {
        preview: `Cosa abbiamo deciso sulla tua ${kind}, e perché.`,
        heading: `L'esito della tua ${kind}`,
        paragraphs: [`Ciao ${report.reporter_name}, abbiamo esaminato la ${kind} ${report.reference}.`],
        rows: [
          { label: "Decisione", value: outcomeText },
          { label: "Motivo", value: motivazione },
        ],
        button: contestUrl ? { label: "Contesta l'esito", href: contestUrl } : undefined,
      }),
    },
  });

  if (res.ok) {
    const { error: notErr } = await admin
      .from("content_reports")
      .update({ reporter_notified_at: new Date().toISOString() })
      .eq("id", report.id);
    if (notErr) logger.warn("admin/segnalazioni", "notifica non annotata:", notErr.message);
  }

  revalidatePath("/admin/segnalazioni");
  return { ok: true, notified: res.ok };
}
