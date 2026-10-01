/**
 * Compatibilità con le migration non ancora applicate.
 *
 * PostgREST risponde in modo diverso a seconda di dove si accorge che manca
 * una colonna: `42703` (Postgres, in una select/filtro) oppure `PGRST204`
 * (cache dello schema, in un insert/update). Entrambi significano «la
 * migration non c'è ancora»: il chiamante degrada invece di rompersi.
 */
export function colonnaAssente(error: { code?: string; message?: string } | null | undefined, colonna?: string): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code !== "42703" && code !== "PGRST204") return false;
  if (!colonna) return true;
  return (error.message ?? "").includes(colonna);
}
