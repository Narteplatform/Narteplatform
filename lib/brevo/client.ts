/**
 * Client HTTP minimale verso l'API transazionale di Brevo (https://api.brevo.com/v3).
 *
 * Deliberatamente non usa il pacchetto npm `@getbrevo/brevo`: è un semplice
 * wrapper su `fetch`, così restiamo liberi di tipizzare noi request/response
 * senza portarci dietro l'SDK generato.
 */

import { logger } from "@/lib/logger";

const BREVO_BASE_URL = "https://api.brevo.com/v3";

/**
 * Tetto di attesa per una singola chiamata. Senza, una Brevo lenta teneva
 * appesa la Server Action (o il cron) fino al timeout della funzione Vercel:
 * l'utente vedeva un caricamento infinito per un'email di cortesia.
 */
const BREVO_TIMEOUT_MS = 10_000;

// Lazy init: la chiave va letta solo quando serve davvero, non a livello di
// modulo. Stessa logica di `getResend()` in lib/emails/send.ts — durante la
// build di Vercel (collect page data) il modulo viene valutato senza env
// runtime, quindi leggere/validare la chiave top-level romperebbe il build
// se la variabile non è ancora impostata.
let _brevoApiKey: string | null | undefined;
function getBrevoApiKey(): string | null {
  if (_brevoApiKey !== undefined) return _brevoApiKey;
  const key = process.env.BREVO_API_KEY;
  _brevoApiKey = key || null;
  return _brevoApiKey;
}

/** Forma dell'errore restituito da Brevo su risposte non-2xx. */
type BrevoErrorBody = {
  code?: string;
  message?: string;
};

export type BrevoRequestResult<T> =
  | { ok: true; skipped?: false; data: T }
  | { ok: false; skipped: true }
  | { ok: false; skipped?: false; error: string; code?: string };

type BrevoRequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

/**
 * Esegue una richiesta verso l'API Brevo. Non lancia mai eccezioni: ogni
 * esito (successo, chiave mancante, errore HTTP, eccezione di rete) torna
 * come risultato discriminato, sullo stesso modello dell'helper Resend
 * esistente.
 */
export async function brevoRequest<T = unknown>(
  path: string,
  init: BrevoRequestInit = {}
): Promise<BrevoRequestResult<T>> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    logger.warn("brevo", `BREVO_API_KEY mancante — richiesta a "${path}" non eseguita`);
    return { ok: false, skipped: true };
  }

  const method = init.method ?? "GET";

  try {
    const res = await fetch(`${BREVO_BASE_URL}${path}`, {
      method,
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });

    // Alcuni endpoint Brevo (es. DELETE) rispondono 204 senza body.
    const rawText = res.status === 204 ? "" : await res.text();
    let parsed: unknown = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Corpo non JSON: lo trattiamo come assente, non blocchiamo il flusso.
        parsed = null;
      }
    }

    if (!res.ok) {
      const errBody = (parsed ?? null) as BrevoErrorBody | null;
      const message = errBody?.message || `Richiesta Brevo fallita (HTTP ${res.status})`;
      logger.error("brevo", `errore su "${path}"`, {
        status: res.status,
        code: errBody?.code,
        message,
      });
      return { ok: false, error: message, code: errBody?.code };
    }

    return { ok: true, data: (parsed ?? undefined) as T };
  } catch (err) {
    // AbortSignal.timeout rifiuta con un DOMException "TimeoutError": si
    // traduce in un esito leggibile, senza lanciare (il contratto di questa
    // funzione è non lanciare mai).
    const scaduto = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const message = scaduto
      ? `Brevo non ha risposto entro ${BREVO_TIMEOUT_MS / 1000} secondi`
      : err instanceof Error
      ? err.message
      : String(err);
    logger.error("brevo", `eccezione durante la richiesta a "${path}"`, scaduto ? message : err);
    return { ok: false, error: message, code: scaduto ? "timeout" : undefined };
  }
}
