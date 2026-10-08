/**
 * Stato di approvazione di un organizzatore (migration 0071). Modulo senza
 * dipendenze: lo importano le guardie di accesso e la pagina di attesa.
 */
export type StatoOrganizzatore = "approved" | "pending" | "rejected";

/** Dove si manda chi non è (ancora) approvato. Sta FUORI dal layout /organizzatore per non creare cicli di redirect. */
export const PERCORSO_IN_ATTESA = "/in-attesa-di-approvazione";

/**
 * `undefined`/`null` = colonna assente (migration non ancora applicata) →
 * «approved», il comportamento di prima. Un valore presente ma inatteso non
 * apre nessuna porta: «pending».
 */
export function normalizzaStato(valore: unknown): StatoOrganizzatore {
  if (valore === undefined || valore === null) return "approved";
  if (valore === "approved" || valore === "pending" || valore === "rejected") return valore;
  return "pending";
}
