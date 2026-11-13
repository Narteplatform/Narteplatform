/**
 * Costanti condivise dell'autenticazione. Senza dipendenze: le importano il
 * middleware (edge), i route handler e le pagine.
 */

/** «Benvenuto già visto»: chi l'ha già vista non viene rimandato a /benvenuto a ogni accesso. */
export const COOKIE_BENVENUTO = "narte-benvenuto";

/**
 * Intestazione con il percorso richiesto (pathname + query), scritta dal
 * middleware sulla richiesta. Serve a `requireUser()` per rimandare al login
 * con `?next=` anche dai Server Component, che il percorso non lo conoscono.
 * Il middleware la sovrascrive sempre: un valore mandato dal client non passa.
 */
export const HEADER_PERCORSO = "x-narte-percorso";

/** Pagina della verifica a due fattori (TOTP). */
export const PERCORSO_MFA = "/auth/mfa";

/** Pagina della sicurezza dell'account (attivazione TOTP). */
export const PERCORSO_SICUREZZA = "/account/sicurezza";

/**
 * Entro quanti giorni dalla creazione un account si considera «nuovo»: decide
 * il testo della schermata dei consensi e l'invio dell'email di benvenuto.
 */
export const GIORNI_ACCOUNT_NUOVO = 14;

export function isAccountNuovo(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && Date.now() - t < GIORNI_ACCOUNT_NUOVO * 24 * 60 * 60 * 1000;
}
