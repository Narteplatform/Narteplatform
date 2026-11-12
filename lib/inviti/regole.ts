/**
 * «Invita un artista» — regole e testi condivisi.
 *
 * Dati puri: importabile da server e client. Le regole sono quelle concordate
 * con il cliente (novembre 2026):
 *   - premio a chi invita quando l'invitato PAGA (importo > 0);
 *   - conferma dopo 14 giorni, se non c'è stato recesso o rimborso;
 *   - 1 mese di Pro: 30 giorni (chi è Free) o 9,99 € di credito (chi paga già);
 *   - cumulabile fino a 12 premi per anno solare.
 */
import type { InviteStatus } from "@/lib/supabase/types";
import { PLAN_PRICES_CENTS } from "@/lib/billing/plans";

export const GIORNI_PREMIO = 30;
/** Valore di un mese di Pro mensile, in centesimi (listino: 9,99 €). */
export const CREDITO_PREMIO_CENT = PLAN_PRICES_CENTS.pro.month;
export const TETTO_ANNUO = 12;
/** Giorni fra il primo pagamento dell'invitato e la conferma del premio (recesso). */
export const GIORNI_ATTESA = 14;

export const COOKIE_INVITO = "narte_invito";
export const COOKIE_INVITO_GIORNI = 30;

const GIORNO_MS = 24 * 60 * 60 * 1000;

/** Valore in centesimi di un numero di giorni di Pro (per la conversione in credito). */
export function centDaGiorni(giorni: number): number {
  if (giorni <= 0) return 0;
  return Math.round((CREDITO_PREMIO_CENT * giorni) / GIORNI_PREMIO);
}

/** Giorni interi (per eccesso) fra due istanti; 0 se `fine` non è dopo `inizio`. */
export function giorniFra(inizio: Date, fine: Date): number {
  const ms = fine.getTime() - inizio.getTime();
  return ms > 0 ? Math.ceil(ms / GIORNO_MS) : 0;
}

export function aggiungiGiorni(d: Date, giorni: number): Date {
  return new Date(d.getTime() + giorni * GIORNO_MS);
}

/**
 * Inizio dell'anno solare in Italia. A gennaio vale CET (UTC+1), quindi la
 * mezzanotte del 1° gennaio è alle 23:00 UTC del 31 dicembre.
 */
export function inizioAnnoItalia(adesso: Date = new Date()): Date {
  // L'anno "italiano" di un istante: si sposta l'istante di un'ora avanti.
  const anno = new Date(adesso.getTime() + 60 * 60 * 1000).getUTCFullYear();
  return new Date(Date.UTC(anno, 0, 1) - 60 * 60 * 1000);
}

/** Formato del codice: minuscole, cifre e trattini singoli (vedi il check in 0078). */
const FORMATO_CODICE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizzaCodice(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toLowerCase();
  if (c.length < 4 || c.length > 48 || !FORMATO_CODICE.test(c)) return null;
  return c;
}

/** Etichette mostrate a chi invita. Linguaggio semplice, nessun giudizio del Team. */
export const ETICHETTA_STATO: Record<InviteStatus, string> = {
  candidatura: "Candidatura inviata",
  approvato: "Entrato su N'arte · non ancora abbonato",
  in_attesa: "Abbonato · premio in arrivo",
  confermato: "+1 mese di Pro",
  annullato: "Abbonamento annullato",
  oltre_limite: "Oltre i 12 mesi dell'anno",
};

export type VarianteBadge = "muted" | "outline" | "warning" | "success";

export const BADGE_STATO: Record<InviteStatus, VarianteBadge> = {
  candidatura: "muted",
  approvato: "outline",
  in_attesa: "warning",
  confermato: "success",
  annullato: "muted",
  oltre_limite: "muted",
};

export function formatEuro(cent: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cent / 100);
}

export function formatData(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(d);
}
