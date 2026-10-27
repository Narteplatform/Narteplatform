import { Resend } from "resend";
import { render } from "@react-email/components";
import { TITOLARE } from "@/lib/legal/titolare";
import type { ReactElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import { corpoResend, corpoRiservato, type CorpoDaSalvare } from "@/lib/emails/corpo";

const FROM = process.env.RESEND_FROM_EMAIL || "N'arte <noreply@narteofficial.it>";

// Lazy init: il client Resend richiede la chiave nel constructor. Durante
// la build di Vercel (collect page data) il modulo viene valutato senza
// env runtime → istanziarlo top-level rompe il build se la chiave manca.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

type SendEmailOpts = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  template?: string;
  meta?: Json;
};

async function logEmail(row: {
  to: string[];
  subject: string;
  template?: string;
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  error?: string | null;
  meta?: Json;
  corpo?: CorpoDaSalvare | null;
}) {
  try {
    const admin = createAdminClient();
    const riga = {
      to_addresses: row.to,
      subject: row.subject,
      template: row.template ?? null,
      status: row.status,
      provider_id: row.providerId ?? null,
      error: row.error ?? null,
      meta: row.meta ?? {},
    };
    let { error } = await admin.from("email_log").insert(row.corpo ? { ...riga, ...row.corpo } : riga);
    // Migration 0075 non ancora applicata: la riga si scrive senza il corpo.
    if (row.corpo && (colonnaAssente(error, "body_html") || colonnaAssente(error, "body_source"))) {
      ({ error } = await admin.from("email_log").insert(riga));
    }
    if (error) console.error("[email_log] riga non salvata", error.message);
  } catch (e) {
    console.error("[email_log] impossibile salvare riga", e);
  }
}

/** HTML per il registro: se non si genera, la riga si scrive senza corpo. */
async function toHtml(react: ReactElement): Promise<string | null> {
  try {
    return await render(react);
  } catch (e) {
    console.error("[email] HTML per il registro non generato", e);
    return null;
  }
}

/** Chiave Brevo dell'invio, se passa da dispatchEmail (meta.key). */
function chiaveDaMeta(meta: Json | undefined): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const k = (meta as Record<string, Json | undefined>).key;
  return typeof k === "string" ? k : null;
}

/** Versione solo testo: migliora la consegna e serve ai client senza HTML. */
async function toPlainText(react: ReactElement): Promise<string | undefined> {
  try {
    const text = await render(react, { plainText: true });
    return text.trim() ? text : undefined;
  } catch (e) {
    console.error("[email] versione testo non generata", e);
    return undefined;
  }
}

export async function sendEmail(opts: SendEmailOpts) {
  const toArr = Array.isArray(opts.to) ? opts.to : [opts.to];
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY mancante — email non inviata", opts.subject);
    await logEmail({
      to: toArr,
      subject: opts.subject,
      template: opts.template,
      status: "skipped",
      error: "RESEND_API_KEY mancante",
      meta: opts.meta,
    });
    return { ok: false as const, skipped: true };
  }
  const chiave = chiaveDaMeta(opts.meta);
  // Le email riservate (link d'accesso) non si trasformano nemmeno in HTML.
  const corpo = corpoRiservato(opts.template, chiave)
    ? corpoResend(null, opts.template, chiave)
    : corpoResend(await toHtml(opts.react));
  try {
    const text = await toPlainText(opts.react);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: toArr,
      subject: opts.subject,
      react: opts.react,
      ...(text ? { text } : {}),
      replyTo: opts.replyTo || TITOLARE.emailContatti,
      headers: { "List-Unsubscribe": `<mailto:${TITOLARE.emailContatti}>` },
    });
    if (error) {
      console.error("[email] errore Resend", error);
      await logEmail({
        to: toArr,
        subject: opts.subject,
        template: opts.template,
        status: "failed",
        error: typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : JSON.stringify(error),
        meta: opts.meta,
        corpo,
      });
      return { ok: false as const, error };
    }
    await logEmail({
      to: toArr,
      subject: opts.subject,
      template: opts.template,
      status: "sent",
      providerId: data?.id ?? null,
      meta: opts.meta,
      corpo,
    });
    return { ok: true as const, id: data?.id };
  } catch (err) {
    console.error("[email] eccezione", err);
    await logEmail({
      to: toArr,
      subject: opts.subject,
      template: opts.template,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      meta: opts.meta,
      corpo,
    });
    return { ok: false as const, error: err };
  }
}
