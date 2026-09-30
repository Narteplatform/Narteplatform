/**
 * `true` se l'utente restituito da `auth.getUser()` è bloccato in questo momento.
 *
 * Senza dipendenze e senza query: lo importa anche il middleware (runtime edge)
 * e legge il campo che Supabase Auth restituisce già con l'utente.
 */
export function isUtenteSospeso(user: { banned_until?: string | null } | null | undefined): boolean {
  const fine = user?.banned_until;
  if (!fine) return false;
  const t = Date.parse(fine);
  return Number.isFinite(t) && t > Date.now();
}

export const MESSAGGIO_ACCOUNT_SOSPESO =
  "Il tuo account è sospeso. Hai ricevuto un'email con il motivo e le istruzioni per contestarlo.";

export const MESSAGGIO_ACCOUNT_CHIUSO =
  "Questo account è stato chiuso su richiesta. Per riattivarlo entro 30 giorni scrivi a info@narteofficial.it.";

export type DatiSospensione = {
  sospeso_il: string;
  motivo: string;
  profili_nascosti: string[];
  attore: string;
  /** `true` finché la sospensione non è completata: l'intenzione è scritta, il resto può essere a metà. */
  in_corso: boolean;
};

/**
 * Legge `app_metadata.sospensione`. Senza dipendenze: la usano anche il
 * middleware (edge) e i moduli che non devono importare `sospensione.ts`.
 */
export function leggiSospensione(appMetadata: unknown): DatiSospensione | null {
  if (!appMetadata || typeof appMetadata !== "object") return null;
  const s = (appMetadata as Record<string, unknown>).sospensione;
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const nascosti = Array.isArray(o.profili_nascosti)
    ? o.profili_nascosti.filter((x): x is string => typeof x === "string")
    : [];
  return {
    sospeso_il: typeof o.sospeso_il === "string" ? o.sospeso_il : "",
    motivo: typeof o.motivo === "string" ? o.motivo : "",
    profili_nascosti: nascosti,
    attore: typeof o.attore === "string" ? o.attore : "",
    in_corso: o.in_corso === true,
  };
}

/**
 * Perché un utente bannato è bloccato: `sospeso` (decisione del Team, ha un
 * registro in `app_metadata.sospensione`) oppure `chiuso` (cancellazione
 * richiesta dall'interessato: ban senza registro di sospensione).
 */
export function tipoBlocco(
  user: { banned_until?: string | null; app_metadata?: unknown } | null | undefined
): "sospeso" | "chiuso" {
  return leggiSospensione(user?.app_metadata) ? "sospeso" : "chiuso";
}

/** Querystring del login per il tipo di blocco. */
export function queryLoginBloccato(
  user: { banned_until?: string | null; app_metadata?: unknown } | null | undefined
): string {
  return tipoBlocco(user) === "chiuso" ? "chiuso=1" : "sospeso=1";
}
