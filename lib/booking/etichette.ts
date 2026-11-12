import type { BookingStatus } from "@/lib/supabase/types";

/**
 * Etichette della trattativa, condivise fra area artista, area organizzatore e
 * pannello admin. Prima ogni pagina aveva la sua copia, e le copie divergevano.
 *
 * Il flusso (novembre 2026):
 *   pending        → l'organizzatore ha inviato la richiesta; l'artista non ha
 *                    ancora risposto («Inizia trattativa» o «Rifiuta»);
 *   in_trattativa  → trattativa aperta: in chat (artista Pro/Max) o via email
 *                    (artista Free);
 *   accettata      → solo richieste precedenti alla 0080: l'artista ha
 *                    accettato un'offerta, manca la conferma dell'organizzatore;
 *   confermata     → doppia conferma del prezzo: data bloccata.
 */

export type CanaleTrattativa = "chat" | "email";

export const FASCE_ORARIE = [
  { v: "mattina", label: "Mattina" },
  { v: "pomeriggio", label: "Pomeriggio" },
  { v: "sera", label: "Sera" },
  { v: "notte", label: "Notte" },
] as const;

export type FasciaOraria = (typeof FASCE_ORARIE)[number]["v"];

export function etichettaFascia(v: string | null | undefined): string {
  if (!v) return "";
  return FASCE_ORARIE.find((f) => f.v === v)?.label ?? v;
}

export function etichettaStatoArtista(status: BookingStatus, canale: CanaleTrattativa): string {
  switch (status) {
    case "pending":
      return "Nuova richiesta";
    case "in_trattativa":
      return canale === "chat" ? "In trattativa in chat" : "In trattativa via email";
    case "accettata":
      return "Hai accettato l'offerta: manca la conferma dell'organizzatore";
    case "confermata":
      return "Confermata";
    case "rifiutata":
      return "Rifiutata";
    case "annullata":
      return "Annullata";
  }
}

export function etichettaStatoOrganizzatore(status: BookingStatus, canale: CanaleTrattativa): string {
  switch (status) {
    case "pending":
      return "In attesa: l'artista deve avviare la trattativa";
    case "in_trattativa":
      return canale === "chat" ? "In trattativa in chat" : "In trattativa via email";
    case "accettata":
      return "Offerta accettata dall'artista: conferma tu la data";
    case "confermata":
      return "Confermata";
    case "rifiutata":
      return "Rifiutata";
    case "annullata":
      return "Annullata";
  }
}

export function formatEuroIt(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

export function formatDataIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Le date evento sono `date` (YYYY-MM-DD): mezzogiorno evita lo slittamento di fuso.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

/** Un accordo registrato dall'organizzatore aspetta la conferma dell'artista? */
export function accordoInAttesa(b: {
  status: BookingStatus;
  final_price: number | string | null;
  final_price_proposed_by: string | null;
  final_price_confirmed_at: string | null;
}): boolean {
  return (
    b.status === "in_trattativa" &&
    b.final_price != null &&
    b.final_price_proposed_by != null &&
    b.final_price_confirmed_at == null
  );
}
