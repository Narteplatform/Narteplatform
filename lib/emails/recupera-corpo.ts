import "server-only";

import { brevoRequest } from "@/lib/brevo/client";
import { oscuraLink } from "@/lib/emails/corpo";
import { logger } from "@/lib/logger";

/**
 * Testo di un'email inviata prima che il registro salvasse il corpo (0075),
 * chiesto al provider con l'id dell'invio. Sola lettura: niente viene scritto.
 *
 * Brevo conserva il contenuto per un periodo limitato: oltre quello
 * il provider non lo restituisce più e la pagina lo dice.
 */

export type EsitoRecupero =
  | { ok: true; html: string }
  | { ok: false; motivo: "non_disponibile" | "non_configurato" | "errore" };

export async function recuperaCorpoDalProvider(
  provider: "brevo" | "resend",
  providerId: string,
): Promise<EsitoRecupero> {
  // Resend non è più in uso (05/11/2026): per i vecchi invii il testo non si recupera.
  return provider === "brevo" ? daBrevo(providerId) : { ok: false, motivo: "non_disponibile" };
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

