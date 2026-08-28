/**
 * Logger minimale.
 *
 * CLAUDE.md vieta `console.log` in produzione. La ragione non è estetica: su
 * Vercel ogni riga di log costa e viene conservata, e un `console.log` dentro
 * una Server Action gira a ogni invocazione, per ogni utente. Il rumore
 * seppellisce gli errori veri.
 *
 * Regole:
 *   - `logger.debug` scompare del tutto in produzione. È il sostituto diretto
 *     di `console.log`: usalo per la diagnostica di sviluppo.
 *   - `logger.warn` e `logger.error` restano SEMPRE, anche in produzione. Un
 *     errore silenziato è peggio di un log di troppo.
 *
 * Ogni riga porta un prefisso di area fra parentesi quadre, come già fa il
 * codice esistente (`[keepalive]`, `[dispatch]`, `[chat/notify]`), così i log
 * restano filtrabili.
 */

const isProd = process.env.NODE_ENV === "production";

type Area = string;

function prefix(area: Area): string {
  return `[${area}]`;
}

export const logger = {
  /** Solo in sviluppo. In produzione non emette nulla. */
  debug(area: Area, ...args: unknown[]): void {
    if (isProd) return;
    console.debug(prefix(area), ...args);
  },

  /** Sempre attivo: qualcosa non è andato come previsto ma il flusso prosegue. */
  warn(area: Area, ...args: unknown[]): void {
    console.warn(prefix(area), ...args);
  },

  /** Sempre attivo: qualcosa è fallito. */
  error(area: Area, ...args: unknown[]): void {
    console.error(prefix(area), ...args);
  },
};
