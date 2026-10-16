/**
 * Bozza di un modulo in sessionStorage.
 *
 * Serve quando una Server Action non risponde perché il sito è stato
 * ridistribuito nel frattempo (version skew: «Failed to find Server Action»):
 * si salvano i valori, si ricarica la pagina e al ritorno il modulo si
 * ripopola, così chi stava compilando non perde niente.
 *
 * Solo client. Ogni accesso è in try/catch: sessionStorage può essere
 * indisponibile (navigazione privata, quota piena).
 */

const PREFIX = "narte:bozza:";
/** Una bozza più vecchia di così non è più «il lavoro di un attimo fa». */
const MAX_AGE_MS = 10 * 60 * 1000;

type Stored = { at: number; values: Record<string, unknown> };

export function saveDraft(key: string, values: Record<string, unknown>): void {
  try {
    const payload: Stored = { at: Date.now(), values };
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(payload));
  } catch {
    // niente da fare: si ricarica comunque
  }
}

/** Legge e CANCELLA la bozza (consumo unico). */
export function takeDraft(key: string): Record<string, unknown> | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    window.sessionStorage.removeItem(PREFIX + key);
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (
      !parsed ||
      typeof parsed.at !== "number" ||
      Date.now() - parsed.at > MAX_AGE_MS ||
      !parsed.values ||
      typeof parsed.values !== "object"
    ) {
      return null;
    }
    return parsed.values;
  } catch {
    return null;
  }
}

export const MSG_SITO_AGGIORNATO =
  "Il sito è stato aggiornato: ricarico la pagina, i tuoi dati restano";
export const MSG_BOZZA_RECUPERATA = "Abbiamo recuperato le modifiche non salvate";
export const RELOAD_DELAY_MS = 1200;
