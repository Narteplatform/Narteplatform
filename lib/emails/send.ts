import { Resend } from "resend";
import type { ReactElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const FROM = process.env.RESEND_FROM_EMAIL || "N'arte <noreply@narte.it>";

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
}) {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert({
      to_addresses: row.to,
      subject: row.subject,
      template: row.template ?? null,
      status: row.status,
      provider_id: row.providerId ?? null,
      error: row.error ?? null,
      meta: row.meta ?? {},
    });
  } catch (e) {
    console.error("[email_log] impossibile salvare riga", e);
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
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: toArr,
      subject: opts.subject,
      react: opts.react,
      replyTo: opts.replyTo,
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
    });
    return { ok: false as const, error: err };
  }
}
