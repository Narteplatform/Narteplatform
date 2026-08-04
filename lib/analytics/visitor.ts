import "server-only";
import { createHash } from "node:crypto";

/**
 * Pseudonimizzazione dei visitatori del profilo pubblico.
 *
 * Il criterio è che dal dato archiviato non si possa risalire alla persona
 * NEMMENO avendo accesso al database. Per questo l'unica cosa che finisce in
 * `artist_profile_views` è un hash che dipende da un segreto tenuto fuori dal
 * database, e che cambia ogni giorno.
 *
 * La motivazione completa dello schema sta in
 * supabase/migrations/0046_artist_profile_views.sql. Qui c'è l'implementazione.
 */

/**
 * Il segreto che rende l'hash non ricostruibile.
 *
 * Senza, chiunque conosca un IP potrebbe ricalcolare l'hash e verificare se
 * quella persona ha visitato un dato profilo: la premessa privacy dell'intero
 * schema crollerebbe. Per questo, se manca, NON si traccia.
 */
const SALT = process.env.VISIT_HASH_SALT ?? "";
const MIN_SALT_LEN = 16;

/** Data odierna a Roma, `YYYY-MM-DD`. Stesso approccio di currentMonthStartRome. */
export function romeDateISO(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * IP del chiamante dietro il proxy di Vercel.
 * `x-forwarded-for` è una catena: il primo elemento è il client originale.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|scrap|curl|wget|headless|lighthouse|monitor|uptime|pingdom|python-requests|axios|node-fetch/i;

export function isBotUserAgent(ua: string | null): boolean {
  if (!ua) return true; // Un browser vero manda sempre uno user-agent.
  return BOT_RE.test(ua);
}

/**
 * Pseudonimo giornaliero del visitatore, o `null` se non è possibile calcolarlo
 * in modo sicuro — nel qual caso il chiamante deve rinunciare a tracciare.
 *
 * ⚠️  Lo USER-AGENT non entra nell'impasto, ed è una scelta, non una svista.
 *     Includerlo permetterebbe a chi lo ruota di gonfiare le proprie visite:
 *     l'hash cambierebbe a ogni richiesta e la PRIMARY KEY non deduplicherebbe
 *     più niente. Con il solo IP, una macchina vale una visita al giorno per
 *     artista, punto. Il prezzo è un sotto-conteggio dietro i NAT aziendali e
 *     il CGNAT mobile: accettato, ed è il motivo per cui la UI parla di
 *     "visitatori unici" e non di numeri esatti.
 */
export function visitorHash(ip: string, slug: string, day: string): string | null {
  if (SALT.length < MIN_SALT_LEN) return null;
  if (!ip || !slug) return null;
  return createHash("sha256").update(`${SALT}|${day}|${ip}|${slug}`).digest("hex");
}

/** `true` se il tracking è configurato. Serve alla pagina statistiche per spiegare i vuoti. */
export function isVisitTrackingConfigured(): boolean {
  return SALT.length >= MIN_SALT_LEN;
}
