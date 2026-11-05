/**
 * Preavviso delle modifiche ai documenti contrattuali.
 *
 * Il Reg. UE 2019/1150 (art. 3) chiede di comunicare agli utenti commerciali le
 * modifiche alle condizioni con almeno 15 giorni di anticipo; i Termini lo
 * promettono a tutti (parere legale, novembre 2026).
 *
 * PROCEDURA quando si cambia un documento in modo sostanziale:
 *  1. compilare MODIFICHE_IN_ARRIVO con una data di entrata in vigore ad
 *     almeno 15 giorni da oggi e una sintesi in parole semplici, e pubblicare:
 *     compare il banner nelle aree riservate;
 *  2. da /admin/impostazioni/avviso-modifiche (solo root) inviare l'email a
 *     tutti gli utenti attivi;
 *  3. il giorno dell'entrata in vigore pubblicare i testi nuovi e, se serve una
 *     nuova accettazione, alzare LEGAL_CONSENT_VERSION;
 *  4. riportare MODIFICHE_IN_ARRIVO a `null`.
 *
 * Correzioni non sostanziali (refusi, dati di contatto): basta LEGAL_VERSION.
 */

export type ModificheInArrivo = {
  /** Data di entrata in vigore, AAAA-MM-GG, ad almeno 15 giorni dall'avviso. */
  inVigoreDal: string;
  /** Cosa cambia, in una o due frasi. */
  sintesi: string;
  /** Pagina dove leggere le condizioni nuove o la sintesi completa. */
  link: string;
};

export const MODIFICHE_IN_ARRIVO: ModificheInArrivo | null = null;

export const GIORNI_PREAVVISO_MODIFICHE = 15;

/** Le modifiche annunciate, se la data di entrata in vigore non è ancora passata. */
export function modificheAnnunciate(): ModificheInArrivo | null {
  const m = MODIFICHE_IN_ARRIVO;
  if (!m) return null;
  const fine = new Date(`${m.inVigoreDal}T23:59:59+01:00`).getTime();
  return Number.isFinite(fine) && Date.now() <= fine ? m : null;
}

export function dataLeggibile(aaaammgg: string): string {
  return new Date(`${aaaammgg}T12:00:00+01:00`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}
