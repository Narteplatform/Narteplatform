/**
 * Date di calendario (YYYY-MM-DD) nel fuso di Roma.
 *
 * `new Date().toISOString().slice(0, 10)` dà la data UTC: tra mezzanotte e
 * l'01:00/02:00 italiane è ancora «ieri». Le date degli eventi sono giorni
 * italiani, quindi «oggi» va calcolato qui. Nessuna dipendenza server: si usa
 * anche nei componenti client.
 */

const FORMATO_ROMA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD nel fuso di Roma. */
export function dataRoma(d: Date): string {
  return FORMATO_ROMA.format(d);
}

/** La data di oggi a Roma, YYYY-MM-DD. */
export function oggiRoma(): string {
  return dataRoma(new Date());
}

/** Somma giorni a una data YYYY-MM-DD (aritmetica in UTC: niente salti d'ora legale). */
export function spostaGiorni(ymd: string, giorni: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + giorni)).toISOString().slice(0, 10);
}
