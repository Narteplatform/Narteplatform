import "server-only";

/**
 * Interruttore del programma «Invita un artista» (variabile `INVITI_ATTIVI`).
 *
 *   vuoto / 0  → spento: nessuna voce di menu, /invito/* porta alla candidatura
 *                normale, il cron non fa nulla, nessun codice registrato.
 *   conta      → tutto visibile e tracciato, ma il cron NON assegna premi né
 *                scrive crediti su Stripe: conta e riferisce al root. Serve a
 *                verificare il percorso in produzione senza effetti economici.
 *   1          → attivo.
 *
 * Il ritorno indietro è questa variabile più un redeploy.
 */
export type ModalitaInviti = "spento" | "conta" | "attivo";

export function modalitaInviti(): ModalitaInviti {
  const v = (process.env.INVITI_ATTIVI ?? "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "attivo") return "attivo";
  if (v === "conta") return "conta";
  return "spento";
}

export function invitiVisibili(): boolean {
  return modalitaInviti() !== "spento";
}
