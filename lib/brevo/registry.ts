/**
 * Registry tipizzato delle email transazionali gestite via Brevo.
 *
 * Ogni `EmailKey` è mappata a:
 *  - un `templateId` numerico su Brevo (letto da env, `null` finché il
 *    template non è stato creato lato Brevo)
 *  - un tipo di `params` dedicato, così il chiamante non può passare
 *    parametri sbagliati per quella chiave.
 *
 * Nessun template esiste ancora su Brevo: tutti i `templateId` sono `null`
 * salvo che le relative env var `BREVO_TEMPLATE_*` vengano valorizzate.
 */

export type EmailKey =
  | "booking_request_artist"
  | "booking_request_admin"
  | "booking_accepted"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_cancelled_admin"
  | "application_received"
  | "application_received_admin"
  | "artist_approved"
  | "consultation_request"
  | "contact_message";

/** Parametri condivisi dalla richiesta di booking (artista + copia admin). */
export interface BookingRequestParams {
  artistName: string;
  requesterName?: string;
  eventDate: string;
  eventLocation: string;
  budget?: number | null;
  message: string;
  contactEmail: string;
  contactPhone?: string | null;
}

/** Parametri condivisi dagli aggiornamenti di stato di una booking request. */
export interface BookingStatusParams {
  artistName: string;
  organizerName: string;
  venueName: string | null;
  eventDate: string;
  notesArtist: string | null;
  /** Valorizzato solo per `booking_cancelled_admin`. */
  cancellationReason?: string | null;
}

/** Parametri condivisi dalla candidatura artista (utente + copia admin). */
export interface ApplicationReceivedParams {
  applicantName: string;
  stageName: string;
}

export interface ArtistApprovedParams {
  applicantName: string;
  stageName: string;
  actionUrl: string;
}

export interface ConsultationRequestParams {
  toRole: "user" | "admin";
  name: string;
  email?: string;
  phone?: string;
  slotAt: string;
  needs: string;
}

export interface ContactMessageParams {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}

/** Mappa chiave → tipo dei parametri. Fonte di verità per `sendTransactional`. */
export interface EmailParamsMap {
  booking_request_artist: BookingRequestParams;
  booking_request_admin: BookingRequestParams;
  booking_accepted: BookingStatusParams;
  booking_confirmed: BookingStatusParams;
  booking_declined: BookingStatusParams;
  booking_cancelled_admin: BookingStatusParams;
  application_received: ApplicationReceivedParams;
  application_received_admin: ApplicationReceivedParams;
  artist_approved: ArtistApprovedParams;
  consultation_request: ConsultationRequestParams;
  contact_message: ContactMessageParams;
}

interface RegistryEntry {
  /** Id del template su Brevo. `null` finché non è stato creato/configurato. */
  templateId: number | null;
}

function parseTemplateId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Registry statico: ogni voce legge il proprio templateId dalla env var
 * dedicata, con fallback `null`. Non è una chiamata API — solo lettura di
 * `process.env`, quindi sicura anche a livello di modulo.
 */
export const BREVO_REGISTRY: Record<EmailKey, RegistryEntry> = {
  booking_request_artist: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_REQUEST_ARTIST),
  },
  booking_request_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_REQUEST_ADMIN),
  },
  booking_accepted: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_ACCEPTED),
  },
  booking_confirmed: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_CONFIRMED),
  },
  booking_declined: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_DECLINED),
  },
  booking_cancelled_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_CANCELLED_ADMIN),
  },
  application_received: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_APPLICATION_RECEIVED),
  },
  application_received_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_APPLICATION_RECEIVED_ADMIN),
  },
  artist_approved: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_ARTIST_APPROVED),
  },
  consultation_request: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONSULTATION_REQUEST),
  },
  contact_message: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONTACT_MESSAGE),
  },
};

/** Ritorna il templateId configurato per una chiave, `null` se non ancora creato. */
export function getTemplateId(key: EmailKey): number | null {
  return BREVO_REGISTRY[key].templateId;
}
