import { z } from "zod";

// Schema condiviso tra Server Action e BookingCalendar (client).
// Mantenuto in un modulo plain perché un file "use server" può esportare
// solo funzioni async — esportare uno schema/zod object da quel file rompe
// la registrazione delle Server Actions su Next.js 15/16.
export const artistInterestSchema = z.object({
  // Nessuna casella privacy: come sugli altri moduli pubblici, una frase
  // informativa (doc. 08). La presa visione si registra con consent_version.
  artistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  timeSlot: z
    .string()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z
    .string()
    .max(30)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  location: z
    .string()
    .max(160)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().min(5).max(2000),
});

export type ArtistInterestInput = z.infer<typeof artistInterestSchema>;

// Richiesta di booking da un utente registrato (organizzatore o utente da promuovere).
export const bookingRequestPublicSchema = z.object({
  /**
   * Condizioni per gli organizzatori (doc. 04). Obbligatoria per l'utente
   * semplice che con questa richiesta diventa organizzatore: il server la
   * verifica e la registra. Chi è già organizzatore l'ha accettata prima.
   */
  acceptedOrganizerTerms: z.boolean().optional(),

  artistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  timeSlot: z
    .string()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().min(20, "Almeno 20 caratteri").max(2000),
  budgetOffer: z
    .union([z.coerce.number().nonnegative(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "number" ? v : undefined))
    .optional(),
  budgetRange: z
    .enum(["0-100", "100-300", "300-500", "500-1000", "1000+"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  venueName: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  venueCity: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  // Se organizer loggato, può scegliere una venue esistente
  venueId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export type BookingRequestPublicInput = z.infer<typeof bookingRequestPublicSchema>;
