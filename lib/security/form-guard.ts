import "server-only";
import {
  checkHoneypot,
  MESSAGGIO_BLOCCO,
  type HoneypotFields,
} from "@/lib/security/honeypot";
import {
  allowByIp,
  checkRateLimit,
  emailFingerprint,
  type RateLimitRule,
} from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Guardia unica per i moduli pubblici: un'unica riga all'inizio di ogni server
 * action, invece di ripetere tre controlli in sei posti diversi.
 *
 * Ordine dei controlli, dal più economico al più costoso:
 *
 *  1. TRAPPOLA — solo lettura di due campi già in memoria. Se scatta, si esce
 *     senza aver toccato la rete.
 *  2. FREQUENZA PER IP — una query.
 *  3. FREQUENZA PER EMAIL — una seconda query, solo dove ha senso. Serve contro
 *     chi cambia rete ma continua a usare lo stesso indirizzo.
 *
 * Il messaggio restituito è sempre lo stesso, qualunque controllo sia scattato:
 * spiegare a chi scrive bot *quale* difesa l'ha fermato significa aiutarlo ad
 * aggirarla. L'unico caso con testo dedicato è il superamento della soglia, che
 * capita anche a persone vere e merita un'indicazione utile.
 */

export type GuardEsito = { ok: true } | { ok: false; error: string };

const TROPPI_INVII =
  "Hai inviato troppe richieste ravvicinate. Riprova fra un po', oppure scrivici a mano dalla pagina contatti.";

export async function guardPublicForm(
  input: HoneypotFields,
  rule: RateLimitRule,
  opts?: {
    /** Se presente, applica una seconda soglia legata all'indirizzo email. */
    email?: string;
    /** Etichetta per i log, così si capisce quale modulo ha scattato. */
    area?: string;
  }
): Promise<GuardEsito> {
  const area = opts?.area ?? rule.scope;

  const trappola = checkHoneypot(input);
  if (!trappola.ok) {
    logger.warn("form-guard", `${area}: bloccato (${trappola.motivo})`);
    return { ok: false, error: MESSAGGIO_BLOCCO };
  }

  if (!(await allowByIp(rule))) {
    logger.warn("form-guard", `${area}: soglia IP superata`);
    return { ok: false, error: TROPPI_INVII };
  }

  if (opts?.email) {
    const consentito = await checkRateLimit(
      { ...rule, scope: `${rule.scope}-email` },
      emailFingerprint(opts.email)
    );
    if (!consentito) {
      logger.warn("form-guard", `${area}: soglia email superata`);
      return { ok: false, error: TROPPI_INVII };
    }
  }

  return { ok: true };
}
