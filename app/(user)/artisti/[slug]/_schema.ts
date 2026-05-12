import { z } from "zod";

// Schema condiviso tra Server Action e BookingCalendar (client).
// Mantenuto in un modulo plain perché un file "use server" può esportare
// solo funzioni async — esportare uno schema/zod object da quel file rompe
// la registrazione delle Server Actions su Next.js 15/16.
export const artistInterestSchema = z.object({
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

// Nuovo flow: richiesta da organizzatore (loggato o signup inline).
export const bookingRequestPublicSchema = z.object({
  artistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  timeSlot: z
    .string()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().min(20, "Almeno 20 caratteri").max(2000),
  budgetOffer: z
    .union([z.coerce.number().positive(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "number" ? v : undefined))
    .optional(),
  // Signup (richiesti solo se non loggato — validati lato server)
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  password: z
    .string()
    .min(8, "Password min 8")
    .max(72)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  displayName: z.string().min(2).max(120).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  venueName: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  venueCity: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  // Se organizer loggato, può scegliere una venue esistente
  venueId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export type BookingRequestPublicInput = z.infer<typeof bookingRequestPublicSchema>;
