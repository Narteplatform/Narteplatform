/**
 * Conversioni fra ora di Roma (con l'ora legale) e istanti UTC.
 * Dati puri, senza dipendenze: si usano per i confini del mese dell'export
 * incassi e per le date inserite a mano nell'area admin.
 */

const FUSO = "Europe/Rome";

/** Differenza in ms fra l'ora di Roma e UTC nell'istante `ts`. */
export function scartoRomaMs(ts: number): number {
  const parti = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const v = (t: Intl.DateTimeFormatPartTypes) => Number(parti.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - ts;
}

/** Istante (ms) corrispondente a un'ora «da orologio» di Roma. */
export function istanteRoma(anno: number, mese: number, giorno: number, ora = 0, minuto = 0): number {
  const comeUtc = Date.UTC(anno, mese - 1, giorno, ora, minuto, 0);
  let ts = comeUtc - scartoRomaMs(comeUtc);
  // Ricontrollo: vicino al cambio d'ora lo scarto nell'istante trovato può
  // essere diverso da quello della prima stima.
  const scarto = scartoRomaMs(ts);
  if (comeUtc - scarto !== ts) ts = comeUtc - scarto;
  return ts;
}

/** Mezzanotte del 1° del mese (ora di Roma) come timestamp Unix in secondi. */
export function inizioMeseRoma(anno: number, mese: number): number {
  return Math.floor(istanteRoma(anno, mese, 1) / 1000);
}

/** Data AAAA-MM-GG nel fuso di Roma. */
export function giornoRoma(unix: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(unix * 1000),
  );
}

/** "AAAA-MM-GGTHH:mm" (campo datetime-local) inteso come ora di Roma → ISO UTC. null se non valido. */
export function localeRomaAIso(valore: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(valore.trim());
  if (!m) return null;
  const [anno, mese, giorno, ora, minuto] = [m[1], m[2], m[3], m[4] ?? "12", m[5] ?? "00"].map(Number);
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > 31 || ora > 23 || minuto > 59) return null;
  const ts = istanteRoma(anno, mese, giorno, ora, minuto);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}
