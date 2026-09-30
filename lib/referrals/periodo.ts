/**
 * Mesi di competenza delle segnalazioni del profilo (piano Max).
 *
 * Il conteggio mensile è sul fuso Europe/Rome: una segnalazione inviata alle
 * 00:30 del primo del mese conta per il mese nuovo, non per quello in UTC.
 * Nessuna dipendenza server: importabile anche da componenti client.
 */

export const QUOTA_SEGNALAZIONI_MENSILE = 2;

const TZ = "Europe/Rome";

export function meseCorrente(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

/** Il mese 'YYYY-MM' spostato di `delta` mesi (negativo = passato). */
export function spostaMese(periodo: string, delta: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Gli ultimi `n` mesi, dal più recente, mese corrente incluso. */
export function ultimiMesi(n: number, now: Date = new Date()): string[] {
  const corrente = meseCorrente(now);
  return Array.from({ length: n }, (_, i) => spostaMese(corrente, -i));
}

export function etichettaMese(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** Errore di PostgREST/Postgres per tabella mancante: migration non applicata. */
export function tabellaAssente(code: string | undefined): boolean {
  return code === "42P01" || code === "PGRST205";
}
