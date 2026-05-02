import { Resend } from "resend";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "N'arte <noreply@narte.it>";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY mancante — email non inviata", opts.subject);
    return { ok: false as const, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      react: opts.react,
      replyTo: opts.replyTo,
    });
    if (error) {
      console.error("[email] errore Resend", error);
      return { ok: false as const, error };
    }
    return { ok: true as const, id: data?.id };
  } catch (err) {
    console.error("[email] eccezione", err);
    return { ok: false as const, error: err };
  }
}
