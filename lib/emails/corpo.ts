import "server-only";

import { findTemplate } from "@/lib/brevo/templates";
import { renderLocal } from "@/lib/brevo/preview";
import { esc } from "@/lib/brevo/blocks";
import type { EmailBodySource } from "@/lib/supabase/types";

/**
 * Testo delle email nel registro (`email_log.body_html`, 0075), per leggerle
 * per intero da /admin/email.
 *
 * DUE REGOLE, perché il registro lo leggono tutti i superadmin:
 *  1. Le email che contengono un link d'accesso NON si salvano: chi legge il
 *     registro potrebbe usare un link ancora valido (impostare la password di
 *     un artista, confermare la cancellazione di un account).
 *  2. Nelle altre i token nei collegamenti si oscurano (es. il link firmato
 *     per disattivare le segnalazioni): il testo resta leggibile, il link no.
 */

/** Chiavi Brevo e nomi dei template Resend con un link d'accesso. */
const RISERVATE: ReadonlySet<string> = new Set([
  "artist_approved",
  "ArtistApproved",
  "organizer_approved",
  "OrganizerApproved",
  "password_reset",
  "account_deletion_confirm",
  "supabase_invite",
]);

export function corpoRiservato(...chiavi: (string | null | undefined)[]): boolean {
  return chiavi.some((k) => !!k && RISERVATE.has(k));
}

/** Parametri di query che portano un segreto. */
const TOKEN_RE = /([?&](?:t|token|token_hash|code|access_token|refresh_token|key|sig)=)[^&"'\s<>]+/gi;
/** Feed iCal personale: il token è nel percorso. */
const FEED_RE = /(\/api\/calendario\/)[^"'\s<>/?]+/gi;

export function oscuraLink(html: string): string {
  return html.replace(TOKEN_RE, "$1riservato").replace(FEED_RE, "$1riservato");
}

export type CorpoDaSalvare = { body_html: string | null; body_source: EmailBodySource };

/** Corpo di un'email Resend, già trasformata in HTML da chi la invia. */
export function corpoResend(html: string | null, ...chiavi: (string | null | undefined)[]): CorpoDaSalvare | null {
  if (corpoRiservato(...chiavi)) return { body_html: null, body_source: "riservato" };
  if (!html) return null;
  return { body_html: oscuraLink(html), body_source: "salvato" };
}

/**
 * Corpo di un'email Brevo. Il testo lo compone Brevo dal template: qui lo si
 * ricostruisce dallo stesso template del codice (quello che `brevo-sync`
 * pubblica) con i parametri dell'invio. I valori si fanno passare da `esc`:
 * il registro mostra il testo, non esegue markup arrivato dagli utenti.
 */
export function corpoBrevo(key: string, params: unknown): CorpoDaSalvare | null {
  if (corpoRiservato(key)) return { body_html: null, body_source: "riservato" };
  const tpl = findTemplate(key);
  if (!tpl) return null;
  const sicuri: Record<string, unknown> = {};
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
      sicuri[k] = typeof v === "string" ? esc(v) : v;
    }
  }
  return { body_html: oscuraLink(renderLocal(tpl.html, sicuri)), body_source: "salvato" };
}
