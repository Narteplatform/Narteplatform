/**
 * Generazione di un calendario iCalendar (RFC 5545) per il collegamento a
 * Google Calendar, Apple Calendar e Outlook.
 *
 * Le date confermate hanno una fascia (mattina, pomeriggio, sera, notte), non un
 * orario: si traduce in un orario convenzionale, dichiarato nella descrizione
 * dell'evento così nessuno lo scambia per l'orario concordato.
 */

export type FasciaOraria = "mattina" | "pomeriggio" | "sera" | "notte";

export type EventoCalendario = {
  /** Stabile nel tempo: se cambia, il calendario vede un evento nuovo. */
  uid: string;
  /** YYYY-MM-DD */
  data: string;
  fascia: string | null;
  titolo: string;
  luogo?: string | null;
  descrizione?: string | null;
  url?: string | null;
};

/** Orario convenzionale di ogni fascia, ora locale di Roma. Fine oltre le 24 = giorno dopo. */
const FASCE: Record<FasciaOraria, { etichetta: string; inizio: number; fine: number }> = {
  mattina: { etichetta: "Mattina", inizio: 10, fine: 13 },
  pomeriggio: { etichetta: "Pomeriggio", inizio: 15, fine: 19 },
  sera: { etichetta: "Sera", inizio: 21, fine: 24 },
  notte: { etichetta: "Notte", inizio: 23, fine: 27 },
};

/** Testo di una proprietà: si neutralizzano i separatori del formato. */
function testo(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Righe al massimo di 75 ottetti, continuate con uno spazio (RFC 5545 §3.1). */
function piega(riga: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(riga).length <= 75) return riga;
  const parti: string[] = [];
  let corrente = "";
  for (const ch of riga) {
    const limite = parti.length === 0 ? 75 : 74;
    if (bytes.encode(corrente + ch).length > limite) {
      parti.push(corrente);
      corrente = ch;
    } else {
      corrente += ch;
    }
  }
  parti.push(corrente);
  return parti.join("\r\n ");
}

function compatta(data: string): string {
  return data.replace(/-/g, "");
}

/** Data + ore (anche oltre le 24) → YYYYMMDDTHHMMSS locale. */
function locale(data: string, ore: number): string {
  const [y, m, d] = data.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, ore));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}0000`;
}

function giornoDopo(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Fuso di Roma con le regole correnti dell'ora legale UE. */
const VTIMEZONE_ROMA = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Rome",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function generaIcs(nomeCalendario: string, eventi: EventoCalendario[]): string {
  const ora = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const righe: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//N'arte//Calendario date confermate//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${testo(nomeCalendario)}`,
    "X-WR-TIMEZONE:Europe/Rome",
    // Suggerimento di aggiornamento (Apple/Outlook; Google decide da sé).
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE_ROMA,
  ];

  for (const e of eventi) {
    const fascia = e.fascia && e.fascia in FASCE ? FASCE[e.fascia as FasciaOraria] : null;
    const note = [
      fascia
        ? `Fascia: ${fascia.etichetta.toLowerCase()} (orario indicativo: l'orario esatto si concorda in chat).`
        : null,
      e.descrizione ?? null,
      e.url ?? null,
    ]
      .filter(Boolean)
      .join("\n");

    righe.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${ora}`);
    if (fascia) {
      righe.push(
        `DTSTART;TZID=Europe/Rome:${locale(e.data, fascia.inizio)}`,
        `DTEND;TZID=Europe/Rome:${locale(e.data, fascia.fine)}`,
      );
    } else {
      righe.push(
        `DTSTART;VALUE=DATE:${compatta(e.data)}`,
        `DTEND;VALUE=DATE:${compatta(giornoDopo(e.data))}`,
      );
    }
    righe.push(`SUMMARY:${testo(e.titolo)}`);
    if (e.luogo) righe.push(`LOCATION:${testo(e.luogo)}`);
    if (note) righe.push(`DESCRIPTION:${testo(note)}`);
    if (e.url) righe.push(`URL:${e.url}`);
    righe.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT");
  }

  righe.push("END:VCALENDAR");
  return righe.map(piega).join("\r\n") + "\r\n";
}
