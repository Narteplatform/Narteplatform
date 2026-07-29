import { createAdminClient } from "@/lib/supabase/server";
import { brevoRequest } from "@/lib/brevo/client";
import { getTemplateId, type EmailKey, type EmailParamsMap } from "@/lib/brevo/registry";
import type { Json } from "@/lib/supabase/types";

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@narte.it";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "N'arte";

type SendTransactionalOpts<K extends EmailKey> = {
  key: K;
  to: string | string[];
  params: EmailParamsMap[K];
  replyTo?: string;
  /**
   * Oggetto da scrivere in `email_log`. L'oggetto vero è definito lato Brevo
   * dentro il template, quindi qui non lo conosciamo: senza questo campo il
   * pannello /admin/email mostrerebbe la chiave (`contact_message`) al posto
   * di "Nuovo messaggio da Mario Rossi" su ogni riga.
   */
  subjectPreview?: string;
  /** Dati aggiuntivi da conservare sulla riga di log. */
  meta?: Json;
};

type SendTransactionalResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

/** Risposta attesa da POST /v3/smtp/email in caso di successo. */
type BrevoSendEmailResponse = {
  messageId?: string;
};

async function logEmail(row: {
  to: string[];
  subject: string;
  template: string;
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  error?: string | null;
  meta?: Json;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert({
      to_addresses: row.to,
      subject: row.subject,
      template: row.template,
      status: row.status,
      provider_id: row.providerId ?? null,
      error: row.error ?? null,
      meta: row.meta ?? {},
    });
  } catch (e) {
    console.error("[email_log] impossibile salvare riga (brevo)", e);
  }
}

/**
 * Invia un'email transazionale tramite Brevo, tipizzata sul registry: la
 * chiave `key` vincola il tipo di `params`, così non è possibile passare
 * parametri sbagliati per quel template.
 *
 * Non lancia mai eccezioni verso il chiamante: ritorna sempre un risultato
 * discriminato (`ok`/`skipped`/`error`), sullo stesso modello dell'helper
 * Resend esistente in `lib/emails/send.ts`.
 */
export async function sendTransactional<K extends EmailKey>(
  opts: SendTransactionalOpts<K>
): Promise<SendTransactionalResult> {
  const toArr = Array.isArray(opts.to) ? opts.to : [opts.to];
  // `subject` è NOT NULL su email_log: se il chiamante non passa un oggetto
  // leggibile si ripiega sulla chiave.
  const subject = opts.subjectPreview || opts.key;
  const baseMeta = { ...(asObject(opts.meta) ?? {}), provider: "brevo", key: opts.key };

  const templateId = getTemplateId(opts.key);
  if (templateId == null) {
    const reason = "template non ancora creato su Brevo";
    console.warn(`[brevo] ${reason} — chiave "${opts.key}", email non inviata`);
    await logEmail({
      to: toArr,
      subject,
      template: opts.key,
      status: "skipped",
      error: reason,
      meta: baseMeta,
    });
    return { ok: false, skipped: true, reason };
  }

  const result = await brevoRequest<BrevoSendEmailResponse>("/smtp/email", {
    method: "POST",
    body: {
      templateId,
      to: toArr.map((email) => ({ email })),
      params: opts.params,
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      ...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
    },
  });

  if (!result.ok) {
    if (result.skipped) {
      // BREVO_API_KEY mancante — comportamento previsto in dev.
      await logEmail({
        to: toArr,
        subject,
        template: opts.key,
        status: "skipped",
        error: "BREVO_API_KEY mancante",
        meta: baseMeta,
      });
      return { ok: false, skipped: true, reason: "BREVO_API_KEY mancante" };
    }
    console.error("[brevo] errore invio email", opts.key, result.error);
    await logEmail({
      to: toArr,
      subject,
      template: opts.key,
      status: "failed",
      error: result.error,
      meta: baseMeta,
    });
    return { ok: false, error: result.error };
  }

  await logEmail({
    to: toArr,
    subject,
    template: opts.key,
    status: "sent",
    providerId: result.data?.messageId ?? null,
    meta: baseMeta,
  });
  return { ok: true, id: result.data?.messageId ?? null };
}

/** `Json` ammette anche array e primitivi: qui serve solo la forma a oggetto. */
function asObject(value: Json | undefined): Record<string, Json> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : null;
}
