/**
 * Registry tipizzato delle email transazionali gestite via Brevo.
 *
 * Ogni `EmailKey` è mappata a:
 *  - un `templateId` numerico su Brevo (letto da env, `null` finché il
 *    template non è stato creato lato Brevo)
 *  - un tipo di `params` dedicato, così il chiamante non può passare
 *    parametri sbagliati per quella chiave.
 *
 * Convenzione sui valori: **i params trasportano stringhe già pronte da
 * mostrare**. Il templating di Brevo non sa formattare date, valute o
 * numeri, quindi la formattazione resta in TypeScript. È anche il motivo per
 * cui il budget viaggia come `budgetLabel: string | null` e non come
 * numero: con `budget: 0` un `{% if %}` lo tratterebbe come vuoto e la riga
 * sparirebbe dalla scheda.
 *
 * I parametri sono SEMPRE testo semplice, mai HTML. Verificato sull'API:
 * Brevo fa l'escaping dei valori che sostituisce, quindi da un lato non
 * esiste rischio di injection anche con testo scritto dagli utenti,
 * dall'altro un `<br />` dentro un parametro arriverebbe visibile come
 * testo. Gli a capo si ottengono lasciando i `\n` nel valore: le righe
 * lunghe della scheda dati usano `white-space:pre-wrap`.
 */

export type EmailKey =
  // --- candidatura artista ---
  | "application_received"
  | "application_received_admin"
  | "artist_approved"
  // --- registrazione organizzatore ---
  | "organizer_registration_received"
  | "organizer_approved"
  // --- booking ---
  | "booking_request_artist"
  | "booking_request_admin"
  | "booking_request_receipt"
  | "lead_artist"
  | "lead_admin"
  | "booking_accepted"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_cancelled_admin"
  // --- chat ---
  | "chat_new_message"
  // --- consulenze ---
  | "consultation_request_user"
  | "consultation_request_admin"
  | "consultation_confirmed_artist"
  | "consultation_confirmed_admin"
  // --- contatti ---
  | "contact_message";

/** Candidatura artista ricevuta (versione candidato e copia interna). */
export interface ApplicationReceivedParams {
  applicantName: string;
  stageName: string;
}

/** Candidatura approvata: `actionUrl` è il link monouso valido 24 ore. */
export interface ArtistApprovedParams {
  applicantName: string;
  stageName: string;
  actionUrl: string;
  profileUrl: string;
}

/** Registrazione organizzatore ricevuta. */
export interface OrganizerRegistrationParams {
  organizerName: string;
  /** "Organizzatore" oppure "Locale", derivato da `organizers.is_private`. */
  roleLabel: string;
}

/** Account organizzatore attivo. */
export interface OrganizerApprovedParams {
  organizerName: string;
  actionUrl: string;
  profileUrl: string;
}

/**
 * Richiesta di booking. Copre sia la richiesta vera (`booking_requests`) sia
 * il lead dalla pagina pubblica dell'artista: il contenuto renderizzato è lo
 * stesso, cambia solo la chiave con cui viene tracciato in `email_log`.
 *
 * I campi opzionali corrispondono a righe condizionali della scheda: se il
 * valore manca, la riga non viene stampata. Alcuni non hanno ancora una
 * colonna nel database (soundcheck, tipologia, durata, note tecniche) e
 * restano vuoti finché non verranno aggiunti al form di richiesta.
 */
export interface BookingRequestParams {
  artistName: string;
  /** Nome del locale o dell'organizzatore. */
  organizerName: string;
  /** Persona di riferimento. */
  contactName: string;
  roleLabel: string;
  /** Già formattata in italiano, es. "Sabato 21 Settembre 2026". */
  eventDate: string;
  eventTime: string;
  soundcheck: string;
  eventType: string;
  city: string;
  address: string;
  /** Es. "€450". Stringa vuota se non indicato. */
  budgetLabel: string;
  durationLabel: string;
  technicalNotes: string;
  /** Stato leggibile, es. "In attesa di risposta". */
  statusLabel: string;
  /** Messaggio dell'organizzatore, testo semplice: gli a capo restano \n. */
  message: string;
  chatUrl: string;
  requestUrl: string;
}

/** Aggiornamenti di stato di una richiesta già esistente. */
export interface BookingStatusParams {
  artistName: string;
  organizerName: string;
  contactName: string;
  roleLabel: string;
  eventDate: string;
  eventTime: string;
  soundcheck: string;
  eventType: string;
  city: string;
  address: string;
  /** Cachet concordato, se già definito. */
  priceLabel: string;
  durationLabel: string;
  statusLabel: string;
  /** Note dell'artista, motivazione dell'annullamento o messaggio finale. */
  message: string;
  chatUrl: string;
  bookingUrl: string;
}

/** Notifica di un messaggio non letto in chat. */
export interface ChatNewMessageParams {
  chatUrl: string;
}

/** Consulenza: richiesta, conferma e copia interna. */
export interface ConsultationParams {
  /** Nome di chi ha prenotato. */
  name: string;
  consultantName: string;
  /** Già formattata, es. "Mercoledì 25 Settembre 2026". */
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  /** Es. "Videochiamata". */
  modeLabel: string;
  meetingUrl: string;
  topic: string;
  statusLabel: string;
  notes: string;
  panelUrl: string;
  calendarUrl: string;
  /** Solo nelle copie interne. */
  email: string;
  phone: string;
}

export interface ContactMessageParams {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Mappa chiave → tipo dei parametri. Fonte di verità per `sendTransactional`. */
export interface EmailParamsMap {
  application_received: ApplicationReceivedParams;
  application_received_admin: ApplicationReceivedParams;
  artist_approved: ArtistApprovedParams;
  organizer_registration_received: OrganizerRegistrationParams;
  organizer_approved: OrganizerApprovedParams;
  booking_request_artist: BookingRequestParams;
  booking_request_admin: BookingRequestParams;
  booking_request_receipt: BookingRequestParams;
  lead_artist: BookingRequestParams;
  lead_admin: BookingRequestParams;
  booking_accepted: BookingStatusParams;
  booking_confirmed: BookingStatusParams;
  booking_declined: BookingStatusParams;
  booking_cancelled_admin: BookingStatusParams;
  chat_new_message: ChatNewMessageParams;
  consultation_request_user: ConsultationParams;
  consultation_request_admin: ConsultationParams;
  consultation_confirmed_artist: ConsultationParams;
  consultation_confirmed_admin: ConsultationParams;
  contact_message: ContactMessageParams;
}

interface RegistryEntry {
  /** Id del template su Brevo. `null` finché non è stato creato/configurato. */
  templateId: number | null;
  /**
   * Riusa il template HTML di un'altra chiave. Serve ai lead, che mostrano
   * esattamente la stessa email della richiesta di booking ma vanno tracciati
   * a parte in `email_log`. Se un giorno il copy dovrà divergere, basta
   * valorizzare la env var dedicata: nessun call site cambia.
   */
  aliasOf?: EmailKey;
  /** Etichetta leggibile, usata nei log e nel pannello admin. */
  label: string;
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
  application_received: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_APPLICATION_RECEIVED),
    label: "Candidatura ricevuta",
  },
  application_received_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_APPLICATION_RECEIVED_ADMIN),
    label: "Candidatura ricevuta — copia interna",
  },
  artist_approved: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_ARTIST_APPROVED),
    label: "Benvenuto artista",
  },
  organizer_registration_received: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_ORGANIZER_REGISTRATION_RECEIVED),
    label: "Registrazione organizzatore ricevuta",
  },
  organizer_approved: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_ORGANIZER_APPROVED),
    label: "Benvenuto organizzatore",
  },
  booking_request_artist: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_REQUEST_ARTIST),
    label: "Nuova richiesta — artista",
  },
  booking_request_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_REQUEST_ADMIN),
    label: "Nuova richiesta — copia interna",
  },
  booking_request_receipt: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_REQUEST_RECEIPT),
    label: "Richiesta inviata — organizzatore",
  },
  lead_artist: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_LEAD_ARTIST),
    aliasOf: "booking_request_artist",
    label: "Nuovo lead — artista",
  },
  lead_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_LEAD_ADMIN),
    aliasOf: "booking_request_admin",
    label: "Nuovo lead — copia interna",
  },
  booking_accepted: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_ACCEPTED),
    label: "Trattativa aperta",
  },
  booking_confirmed: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_CONFIRMED),
    label: "Data confermata",
  },
  booking_declined: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_DECLINED),
    label: "Artista non disponibile",
  },
  booking_cancelled_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_BOOKING_CANCELLED_ADMIN),
    label: "Data annullata da N'arte",
  },
  chat_new_message: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CHAT_NEW_MESSAGE),
    label: "Nuovo messaggio in chat",
  },
  consultation_request_user: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONSULTATION_REQUEST_USER),
    label: "Richiesta consulenza",
  },
  consultation_request_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONSULTATION_REQUEST_ADMIN),
    label: "Richiesta consulenza — copia interna",
  },
  consultation_confirmed_artist: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONSULTATION_CONFIRMED_ARTIST),
    label: "Consulenza confermata",
  },
  consultation_confirmed_admin: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONSULTATION_CONFIRMED_ADMIN),
    label: "Consulenza confermata — copia interna",
  },
  contact_message: {
    templateId: parseTemplateId(process.env.BREVO_TEMPLATE_CONTACT_MESSAGE),
    label: "Messaggio dal form contatti",
  },
};

/**
 * Id del template su Brevo per una chiave, `null` se non ancora creato.
 * Se la chiave è un alias e non ha un id proprio, ricade su quello della
 * chiave di origine.
 */
export function getTemplateId(key: EmailKey): number | null {
  const entry = BREVO_REGISTRY[key];
  if (entry.templateId != null) return entry.templateId;
  return entry.aliasOf ? BREVO_REGISTRY[entry.aliasOf].templateId : null;
}

/** Etichetta leggibile della chiave. */
export function getEmailLabel(key: EmailKey): string {
  return BREVO_REGISTRY[key].label;
}

/** Tutte le chiavi conosciute, utile per validare `BREVO_ENABLED_KEYS`. */
export const ALL_EMAIL_KEYS = Object.keys(BREVO_REGISTRY) as EmailKey[];

/** Type guard per le stringhe che arrivano da env o da input esterni. */
export function isEmailKey(value: string): value is EmailKey {
  return value in BREVO_REGISTRY;
}
