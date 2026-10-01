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
  /** Rotta della richiesta lato artista, es. `/dashboard/richieste`. */
  requestPath?: string;
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
    chatUrl: `${o.baseUrl}/dashboard/chat`,
    requestUrl: `${o.baseUrl}${o.requestPath ?? "/dashboard/richieste"}`,
    contactEmail: o.contactEmail,
    contactPhone: o.contactPhone ?? "",
    adminUrl: `${o.baseUrl}/admin/leads`,
  };
}
