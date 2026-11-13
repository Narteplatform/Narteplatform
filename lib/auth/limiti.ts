import type { RateLimitRule } from "@/lib/security/rate-limit";

/**
 * Soglie del limitatore per le azioni dell'account. Stesso meccanismo di
 * `LIMITI` (lib/security/rate-limit.ts, tabella della 0048): qui stanno solo le
 * soglie, tenute vicine al codice che le usa. Generose: devono fermare gli
 * script, non chi sbaglia la password due volte.
 */
export const LIMITI_AUTH = {
  /** Richieste di link di recupero, per IP. */
  recuperoPassword: { scope: "recupero-password", windowSeconds: 3600, max: 10 },
  /** Cambi o impostazioni di password da utente autenticato, per IP. */
  cambioPassword: { scope: "cambio-password", windowSeconds: 3600, max: 10 },
  /** Cambi di indirizzo email, per IP. */
  cambioEmail: { scope: "cambio-email", windowSeconds: 3600, max: 6 },
  /** Nuovo invio dell'email di conferma registrazione, per IP. */
  reinvioConfermaIp: { scope: "reinvio-conferma", windowSeconds: 3600, max: 8 },
  /** Nuovo invio dell'email di conferma registrazione, per indirizzo. */
  reinvioConfermaEmail: { scope: "reinvio-conferma-email", windowSeconds: 3600, max: 3 },
  /** Codici di riautenticazione via email, per IP. */
  codiceRiautenticazione: { scope: "riautenticazione", windowSeconds: 3600, max: 5 },
} as const satisfies Record<string, RateLimitRule>;
