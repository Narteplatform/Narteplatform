"use server";

import { createElement } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { guardPublicForm } from "@/lib/security/form-guard";
import { publicFormConsent } from "@/lib/legal/consents";
import { LIMITI } from "@/lib/security/rate-limit";
import {
  contentReportSchema,
  reportKindFor,
  REPORT_CATEGORIES,
  REPORT_TARGET_TYPES,
  type ContentReportInput,
} from "@/lib/validators/schemas";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Invio di una segnalazione o di un reclamo (DSA artt. 16, 17, 20).
 *
 * Scrive con il service role: la tabella non concede INSERT a nessun altro.
 * Se la tabella non esiste ancora (migration 0063 da applicare) risponde con
 * un errore gentile che rimanda alla pagina contatti, senza rompere la pagina.
 */

const SEI_MESI_MS = 1000 * 60 * 60 * 24 * 183;

const MSG_TABELLA_MANCANTE =
  "Al momento non riusciamo a registrare la segnalazione. Scrivici dalla pagina contatti (/contatti) indicando cosa vuoi segnalare e dove si trova: la prendiamo in carico da lì.";
const MSG_GENERICO = "Non siamo riusciti a inviare la segnalazione. Riprova fra un momento.";

function nuovoRiferimento(kind: "segnalazione" | "reclamo"): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${kind === "reclamo" ? "R" : "S"}-${hex}`;
}

export async function submitContentReport(input: ContentReportInput) {
  const parsed = contentReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const data = parsed.data;

  const guard = await guardPublicForm(input, LIMITI.segnalazione, {
    email: data.email,
    area: "segnalazioni",
  });
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const contested = data.contested_reference ? data.contested_reference.toUpperCase() : null;
  const kind = reportKindFor({ contested_reference: contested });
  const targetType = kind === "reclamo" ? "decisione" : data.target_type;
  const category = kind === "reclamo" ? "reclamo_decisione" : data.category;
  const targetUrl = data.target_url ? data.target_url : null;

  // Se l'utente è loggato la segnalazione gli viene legata. L'id arriva dalla
  // sessione, mai dal client.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    userId = auth.user?.id ?? null;
  } catch (e) {
    logger.warn("segnalazioni", "sessione non leggibile, procedo come anonimo", e);
  }

  const admin = createAdminClient();

  // Termine di sei mesi per il reclamo (art. 20 DSA), verificabile solo quando
  // il riferimento è di una segnalazione nostra. Se la lettura fallisce non si
  // blocca nessuno: è un controllo di cortesia, non di sicurezza.
  if (kind === "reclamo" && contested && !contested.startsWith("D-")) {
    const { data: origine, error: origErr } = await admin
      .from("content_reports")
      .select("decided_at")
      .eq("reference", contested)
      .maybeSingle();
    if (origErr) {
      logger.warn("segnalazioni", "controllo dei sei mesi non eseguito:", origErr.message);
    } else if (origine?.decided_at && Date.now() - new Date(origine.decided_at).getTime() > SEI_MESI_MS) {
      return {
        ok: false as const,
        error:
          "Sono trascorsi più di sei mesi dalla decisione: il reclamo non può più essere presentato da qui. Scrivici dalla pagina contatti se ritieni che ci siano ragioni particolari.",
      };
    }
  }

  const consenso = publicFormConsent();
  let reference = "";
  let inserita = false;

  for (let tentativo = 0; tentativo < 3 && !inserita; tentativo++) {
    reference = nuovoRiferimento(kind);
    const { error } = await admin.from("content_reports").insert({
      reference,
      kind,
      reporter_user_id: userId,
      reporter_name: data.name,
      reporter_email: data.email,
      target_type: targetType,
      target_url: targetUrl,
      category,
      description: data.description,
      contested_reference: contested,
      good_faith_at: consenso.consent_at,
      consent_version: consenso.consent_version,
    });
    if (!error) {
      inserita = true;
      break;
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      logger.error("segnalazioni", "tabella content_reports assente: applicare la migration 0063");
      return { ok: false as const, error: MSG_TABELLA_MANCANTE };
    }
    if (error.code === "23505") continue; // riferimento già usato: se ne genera un altro
    logger.error("segnalazioni", "inserimento fallito", error.message);
    return { ok: false as const, error: MSG_GENERICO };
  }
  if (!inserita) return { ok: false as const, error: MSG_GENERICO };

  const kindLabel = kind === "reclamo" ? "reclamo" : "segnalazione";
  const oggetto = REPORT_TARGET_TYPES[targetType];
  const targetLabel = targetUrl ? `${oggetto} — ${targetUrl}` : oggetto;
  const ricevutaIl = new Date().toLocaleString("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  });
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const adminUrl = `${getSiteUrl()}/admin/segnalazioni`;
  const categoriaLabel = REPORT_CATEGORIES[category];

  // Nessun invio blocca la risposta: la segnalazione è già registrata.
  await Promise.allSettled([
    dispatchEmail({
      key: "report_receipt",
      to: data.email,
      params: {
        name: data.name,
        reference,
        receivedAt: ricevutaIl,
        kindLabel,
        targetLabel,
      },
      fallback: {
        subject: `Abbiamo ricevuto la tua ${kindLabel} — N'arte`,
        template: "report_receipt",
        react: createElement(NoticeEmail, {
          preview: `La tua ${kindLabel} è registrata: ti scriveremo con l'esito.`,
          heading: "Ricevuta, grazie",
          paragraphs: [
            `Ciao ${data.name}, abbiamo registrato la tua ${kindLabel}. La esaminiamo e ti scriviamo con la decisione e il motivo.`,
            "Conserva il riferimento: ti servirà se vorrai scriverci di nuovo su questo caso.",
          ],
          rows: [
            { label: "Riferimento", value: reference },
            { label: "Ricevuta il", value: ricevutaIl },
            { label: "Oggetto", value: targetLabel },
          ],
        }),
      },
    }),
    adminEmail
      ? dispatchEmail({
          key: "report_admin",
          to: adminEmail,
          replyTo: data.email,
          params: {
            reference,
            kindLabel,
            category: categoriaLabel,
            targetLabel: oggetto,
            targetUrl: targetUrl ?? "",
            description: data.description,
            reporterLabel: `${data.name} · ${data.email}`,
            adminUrl,
          },
          fallback: {
            subject: `Nuova ${kindLabel} ${reference}: ${categoriaLabel}`,
            template: "report_admin",
            react: createElement(NoticeEmail, {
              preview: "Da prendere in carico nei tempi indicati nella politica di moderazione.",
              heading: `Nuova ${kindLabel}`,
              paragraphs: [data.description],
              rows: [
                { label: "Riferimento", value: reference },
                { label: "Categoria", value: categoriaLabel },
                { label: "Oggetto", value: targetLabel },
                ...(contested ? [{ label: "Contesta", value: contested }] : []),
                { label: "Segnalante", value: `${data.name} · ${data.email}` },
              ],
              button: { label: "Apri le segnalazioni", href: adminUrl },
            }),
          },
        })
      : Promise.resolve(),
  ]);

  return { ok: true as const, reference };
}
