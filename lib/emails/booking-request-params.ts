import type { BookingRequestParams } from "@/lib/brevo/registry";
import { formatDateIt, formatEuro, toPlainText } from "@/lib/emails/format";

/**
 * Params delle email «nuova richiesta» (booking e lead) nel formato dei
 * template Brevo. I campi senza una colonna nel database restano vuoti: la
 * riga corrispondente non compare nella scheda.
 */
export function buildBookingRequestParams(o: {
  artistName: string;
  /** Nome del locale o dell'organizzatore, se noto. */
  organizerName?: string | null;
  contactName?: string | null;
  roleLabel?: string;
  eventDate: string;
  eventTime?: string | null;
  location: string;
  budget?: number | null;
  message: string;
  contactEmail: string;
  contactPhone?: string | null;
  baseUrl: string;
  /** Rotta della richiesta lato artista, es. `/dashboard/leads`. */
  requestPath?: string;
  /** Rotta della richiesta lato admin, es. `/admin/richieste?highlight=…`. Default: `/admin/leads`. */
  adminPath?: string;
  /**
   * Rotta della chat. Default `/dashboard/chat` (artista). Passare `""` quando
   * non esiste una chat per chi legge (lead di un visitatore): il template
   * nasconde il bottone se `chatUrl` è vuoto.
   */
  chatPath?: string;
}): BookingRequestParams {
  const name = o.organizerName ?? o.contactName ?? "";
  return {
    artistName: o.artistName,
    organizerName: name,
    contactName: o.contactName ?? name,
    roleLabel: o.roleLabel ?? "",
    eventDate: formatDateIt(o.eventDate),
    eventTime: o.eventTime ?? "",
    soundcheck: "",
    eventType: "",
    city: o.location,
    address: "",
    budgetLabel: formatEuro(o.budget),
    durationLabel: "",
    technicalNotes: "",
    statusLabel: "In attesa di risposta",
    message: toPlainText(o.message),
    chatUrl: o.chatPath === "" ? "" : `${o.baseUrl}${o.chatPath ?? "/dashboard/chat"}`,
    requestUrl: `${o.baseUrl}${o.requestPath ?? "/dashboard/leads"}`,
    contactEmail: o.contactEmail,
    contactPhone: o.contactPhone ?? "",
    adminUrl: `${o.baseUrl}${o.adminPath ?? "/admin/leads"}`,
  };
}
