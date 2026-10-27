import "server-only";

import { Resend } from "resend";
import { brevoRequest } from "@/lib/brevo/client";
import { oscuraLink } from "@/lib/emails/corpo";
import { logger } from "@/lib/logger";

/**
 * Testo di un'email inviata prima che il registro salvasse il corpo (0075),
 * chiesto al provider con l'id dell'invio. Sola lettura: niente viene scritto.
 *
 * Brevo e Resend conservano il contenuto per un periodo limitato: oltre quello
 * il provider non lo restituisce più e la pagina lo dice.
 */

export type EsitoRecupero =
  | { ok: true; html: string }
  | { ok: false; motivo: "non_disponibile" | "non_configurato" | "errore" };

export async function recuperaCorpoDalProvider(
  provider: "brevo" | "resend",
  providerId: string,
): Promise<EsitoRecupero> {
  return provider === "brevo" ? daBrevo(providerId) : daResend(providerId);
}

async function daResend(id: string): Promise<EsitoRecupero> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, motivo: "non_configurato" };
  try {
    const { data, error } = await new Resend(key).emails.get(id);
    if (error) {
      logger.warn("email/recupero", "Resend non restituisce l'email:", error.message);
      return { ok: false, motivo: "non_disponibile" };
    }
    const html = data?.html ?? (data?.text ? `<pre style="white-space:pre-wrap">${escHtml(data.text)}</pre>` : null);
    return html ? { ok: true, html: oscuraLink(html) } : { ok: false, motivo: "non_disponibile" };
  } catch (e) {
    logger.warn("email/recupero", "Resend, eccezione:", e instanceof Error ? e.message : e);
    return { ok: false, motivo: "errore" };
  }
}

type ElencoBrevo = { transactionalEmails?: { uuid?: string }[] };
type DettaglioBrevo = { body?: string };

async function daBrevo(messageId: string): Promise<EsitoRecupero> {
  // Il messageId identifica l'invio; il contenuto si legge per uuid.
  const elenco = await brevoRequest<ElencoBrevo>(
    `/smtp/emails?messageId=${encodeURIComponent(messageId)}&limit=1`,
  );
  if (!elenco.ok) {
    if (elenco.skipped) return { ok: false, motivo: "non_configurato" };
    logger.warn("email/recupero", "Brevo, ricerca dell'invio fallita:", elenco.error);
    return { ok: false, motivo: "errore" };
  }
  const uuid = elenco.data?.transactionalEmails?.[0]?.uuid;
  if (!uuid) return { ok: false, motivo: "non_disponibile" };

  const dettaglio = await brevoRequest<DettaglioBrevo>(`/smtp/emails/${encodeURIComponent(uuid)}`);
  if (!dettaglio.ok) {
    if (dettaglio.skipped) return { ok: false, motivo: "non_configurato" };
    logger.warn("email/recupero", "Brevo, contenuto non letto:", dettaglio.error);
    return { ok: false, motivo: "non_disponibile" };
  }
  const html = dettaglio.data?.body;
  return html ? { ok: true, html: oscuraLink(html) } : { ok: false, motivo: "non_disponibile" };
}

function escHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
