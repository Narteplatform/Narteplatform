/**
 * Formattazione dei valori che finiscono nei `params` delle email Brevo.
 *
 * Il templating di Brevo non sa formattare date, orari o valute: i parametri
 * devono arrivare già pronti da mostrare. Tenere queste funzioni in un solo
 * posto evita che la stessa data compaia scritta in tre modi diversi in tre
 * email diverse.
 */

const IT = "it-IT";

/** "Sabato 21 Settembre 2026" — come nei mockup, con le iniziali maiuscole. */
export function formatDateIt(value: string | Date): string {
  const d = typeof value === "string" ? parseDate(value) : value;
  if (!d) return "";
  const s = d.toLocaleDateString(IT, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // it-IT restituisce "sabato 21 settembre 2026": i mockup capitalizzano
  // giorno e mese.
  return s.replace(/(^|\s)(\p{Ll})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** "15:30" */
export function formatTimeIt(value: string | Date): string {
  const d = typeof value === "string" ? parseDate(value) : value;
  if (!d) return "";
  return d.toLocaleTimeString(IT, { hour: "2-digit", minute: "2-digit" });
}

/**
 * "€450" oppure "€1.250,50". Stringa vuota se il valore non c'è.
 * Attenzione: `0` è un importo valido e va reso come "€0", non scartato —
 * è il motivo per cui il controllo è su `null`/`undefined` e non sul falsy.
 */
export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const hasCents = !Number.isInteger(value);
  return `€${value.toLocaleString(IT, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "60 minuti" · "1 minuto" · stringa vuota se non definito. */
export function formatMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return `${value} ${value === 1 ? "minuto" : "minuti"}`;
}

/**
 * Testo libero dell'utente pronto per un parametro Brevo.
 *
 * Deliberatamente NON fa escaping e NON trasforma gli a capo in `<br />`.
 * Verificato sull'API: Brevo fa già l'escaping dei valori che sostituisce
 * (`<b>x</b>` arriva come `&lt;b&gt;x&lt;/b&gt;`), quindi
 *  - non c'è rischio di injection, nemmeno con testo scritto dagli utenti;
 *  - un `<br />` inserito qui verrebbe consegnato visibile come testo.
 * Gli a capo restano `\n` e li rende `white-space:pre-wrap` nel template.
 *
 * Serve comunque a normalizzare: `null` diventa stringa vuota (che per
 * Brevo significa "riga condizionale nascosta") e i fine riga di Windows
 * vengono uniformati.
 */
export function toPlainText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\r\n|\r/g, "\n").trim();
}

/** Etichetta leggibile dello stato di una richiesta di booking. */
export function bookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "In attesa di risposta",
    in_trattativa: "In trattativa",
    confermata: "Confermata",
    rifiutata: "Rifiutata",
    annullata: "Annullata",
  };
  return labels[status] ?? status;
}

/** "Organizzatore" o "Locale", secondo `organizers.is_private`. */
export function organizerRoleLabel(isPrivate: boolean | null | undefined): string {
  return isPrivate ? "Organizzatore privato" : "Organizzatore";
}

/**
 * Link "Aggiungi al calendario". Usa il formato template di Google Calendar,
 * che funziona senza allegati e senza generare un file .ics: per un bottone
 * dentro un'email è l'unica strada che non richiede infrastruttura.
 */
export function googleCalendarUrl(o: {
  title: string;
  start: Date;
  durationMin: number;
  details?: string;
  location?: string;
}): string {
  const end = new Date(o.start.getTime() + o.durationMin * 60_000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: o.title,
    dates: `${stamp(o.start)}/${stamp(end)}`,
  });
  if (o.details) q.set("details", o.details);
  if (o.location) q.set("location", o.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
