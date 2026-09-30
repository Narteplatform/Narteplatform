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
