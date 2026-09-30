/**
 * True SOLO se l'errore dice che una colonna non esiste ancora (schema non
 * migrato): 42703 di Postgres o PGRST204 di PostgREST. Qualsiasi altro errore
 * (rete, permessi, vincoli) non autorizza una riprova "ridotta": quella
 * riprova può cambiare il significato della scrittura, per esempio facendo
 * prendere a un video il default 'approved'.
 */
export function isMissingColumnError(
  error: { code?: string | null } | null | undefined
): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}
