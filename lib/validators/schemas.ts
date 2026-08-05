import { z } from "zod";
import type { Json } from "@/lib/supabase/types";

/**
 * Valore JSON generico, per colonne jsonb "libere" come `formats.details`.
 * Ricorsivo per costruzione, rispecchia esattamente il tipo `Json` del DB
 * (invece di `z.unknown()`, che produce `Record<string, unknown>` — non
 * assegnabile a `Json` senza cast al call site).
 */
const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

export const leadSchema = z.object({
  artistId: z.string().uuid(),
  eventDate: z.string().min(1, "Data richiesta"),
  eventLocation: z.string().min(2, "Luogo troppo corto").max(120),
  budget: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(20, "Almeno 20 caratteri").max(2000),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(6).max(30).optional().or(z.literal("").transform(() => undefined)),
  // Campi aggiuntivi per tracking (opzionali per compatibilità con form esistenti)
  source: z.enum(["booking", "contatti", "format"]).default("booking"),
  contactName: z.string().min(2).max(120).optional().or(z.literal("").transform(() => undefined)),
});
export type LeadInput = z.infer<typeof leadSchema>;

// Schema per lead flessibili (contatti/format) — artist_id e data/luogo non obbligatori
export const flexLeadSchema = z.object({
  artistId: z.string().uuid().optional(),
  eventDate: z.string().optional().or(z.literal("").transform(() => undefined)),
  eventLocation: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  budget: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(10, "Almeno 10 caratteri").max(2000),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(6).max(30).optional().or(z.literal("").transform(() => undefined)),
  source: z.enum(["booking", "contatti", "format"]).default("booking"),
  contactName: z.string().min(2).max(120).optional().or(z.literal("").transform(() => undefined)),
});
export type FlexLeadInput = z.infer<typeof flexLeadSchema>;

export const artistApplicationSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  stageName: z.string().min(2).max(80),
  genres: z.array(z.string().min(1)).min(1, "Seleziona almeno un genere").max(3, "Massimo 3 generi"),
  instruments: z.array(z.string()).max(3, "Massimo 3 strumenti").optional().default([]),
  bio: z.string().max(2000).optional(),
  instagram: z.string().max(120).optional(),
  spotify: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  video_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  video_path: z.string().max(500).optional().or(z.literal("").transform(() => undefined)),
});
export type ArtistApplicationInput = z.infer<typeof artistApplicationSchema>;

export const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10).max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const eventSchema = z.object({
  title: z.string().min(2).max(120),
  category: z.enum([
    "music",
    "clubs",
    "festivals",
    "dating",
    "culture",
    "art",
    "food",
    "workshops",
    "comedy",
    "business",
  ]),
  date: z.string().min(1),
  endAt: z.string().optional().or(z.literal("").transform(() => undefined)),
  city: z.string().min(2),
  venue: z.string().max(160).optional(),
  price: z.coerce.number().nonnegative().optional(),
  coverImage: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  ticketUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().max(4000).optional(),
  featured: z.boolean().optional(),
  gallery: z.array(z.string().url()).max(40).optional(),
  videos: z.array(z.string().url()).max(20).optional(),
});
export type EventInput = z.infer<typeof eventSchema>;

// =========================================
// Formats
// =========================================
export const formatSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  tagline: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  description: z.string().max(4000).optional().or(z.literal("").transform(() => undefined)),
  cover_image: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  gallery: z.array(z.string().url()).max(20).default([]),
  videos: z.array(z.string().url()).max(10).default([]),
  icon: z.string().max(60).optional().or(z.literal("").transform(() => undefined)),
  order_index: z.coerce.number().int().nonnegative().default(0),
  details: z.record(jsonValueSchema).optional(),
  seo_title: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  seo_description: z.string().max(300).optional().or(z.literal("").transform(() => undefined)),
  published: z.boolean().default(true),
});
export type FormatInput = z.infer<typeof formatSchema>;

export const formatInterestSchema = z.object({
  name: z.string().min(2, "Almeno 2 caratteri").max(120),
  email: z.string().email("Email non valida"),
  phone: z.string().min(6).max(40).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(10, "Almeno 10 caratteri").max(2000, "Massimo 2000 caratteri"),
});
export type FormatInterestInput = z.infer<typeof formatInterestSchema>;

export const artistSchema = z.object({
  stage_name: z.string().min(2).max(80),
  city: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  // Generi: stringa CSV (compat input form admin)
  genre: z.string().max(400).optional().or(z.literal("").transform(() => undefined)),
  instruments: z.string().max(400).optional().or(z.literal("").transform(() => undefined)),
  bio: z.string().max(4000).optional().or(z.literal("").transform(() => undefined)),
  cover_image: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  instagram: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  facebook: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  tiktok: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  youtube: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  spotify: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  website: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  gallery: z.string().max(4000).optional().or(z.literal("").transform(() => undefined)),
  videos: z.string().max(4000).optional().or(z.literal("").transform(() => undefined)),
});
export type ArtistInput = z.infer<typeof artistSchema>;

export const accountProfileSchema = z.object({
  fullName: z.string().min(2).max(80),
  avatarUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});
export type AccountProfileInput = z.infer<typeof accountProfileSchema>;

export const passwordChangeSchema = z.object({
  password: z.string().min(8, "Almeno 8 caratteri").max(72),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Almeno 8 caratteri"),
  fullName: z.string().min(2).max(80).optional(),
});
export type AuthInput = z.infer<typeof authSchema>;

/** Richiesta del link di recupero: serve la sola email. */
export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

// =========================================
// Organizer / Venues / Booking
// =========================================

export const priceBandEnum = z.enum(["budget", "standard", "premium", "luxury"]);
export type PriceBand = z.infer<typeof priceBandEnum>;

export const venueTypeEnum = z.enum(["club", "pub", "festival", "teatro", "locale", "privato", "altro"]);
export type VenueType = z.infer<typeof venueTypeEnum>;

export const organizerProfileSchema = z.object({
  display_name: z.string().min(2, "Minimo 2 caratteri").max(120),
  bio: z.string().max(800).optional().or(z.literal("").transform(() => undefined)),
  is_brand: z.boolean().optional(),
  is_private: z.boolean().optional(),
  avatar_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  website: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  instagram: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
});
export type OrganizerProfileInput = z.infer<typeof organizerProfileSchema>;

export const venueSchema = z.object({
  name: z.string().min(2, "Minimo 2 caratteri").max(120),
  venue_type: venueTypeEnum.optional(),
  address: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  region: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  postal_code: z.string().max(20).optional().or(z.literal("").transform(() => undefined)),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().max(1500).optional().or(z.literal("").transform(() => undefined)),
  cover_image: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  gallery: z.array(z.string().url()).max(6).optional(),
  website: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  instagram: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
});
export type VenueInput = z.infer<typeof venueSchema>;

export const bookingRequestSchema = z.object({
  artist_id: z.string().uuid(),
  venue_id: z.string().uuid().optional(),
  event_date: z.string().min(1, "Data richiesta"),
  time_slot: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  budget_offer: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(20, "Almeno 20 caratteri").max(2000),
});
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

// Submit dalla pagina pubblica artista. Se l'utente non è loggato include i
// campi di registrazione (auto-confirm + auto-login lato server).
export const requestFromPublicSchema = z.object({
  artist_id: z.string().uuid(),
  event_date: z.string().min(1),
  time_slot: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  budget_offer: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(20).max(2000),
  // Signup (richiesti solo se non loggato — validato lato server)
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  password: z.string().min(8).max(72).optional().or(z.literal("").transform(() => undefined)),
  display_name: z.string().min(2).max(120).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  venue_name: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  venue_city: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  // Se loggato come organizer, riferimento opzionale a venue esistente
  venue_id: z.string().uuid().optional(),
});
export type RequestFromPublicInput = z.infer<typeof requestFromPublicSchema>;

// =========================================
// Chat v2 (conversations + messages)
// =========================================
export const chatMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().trim().min(1, "Messaggio vuoto").max(2000, "Massimo 2000 caratteri"),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const chatTimeSlotEnum = z.enum(["mattina", "pomeriggio", "sera", "notte"]);
export type ChatTimeSlot = z.infer<typeof chatTimeSlotEnum>;

export const chatOfferSchema = z.object({
  conversation_id: z.string().uuid(),
  event_date: z.string().min(1, "Data richiesta"),
  time_slot: chatTimeSlotEnum,
  budget_cents: z.coerce.number().int().min(0, "Budget non valido").max(100_000_000),
  description: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type ChatOfferInput = z.infer<typeof chatOfferSchema>;

// =========================================
// Superadmin: invito + permessi pagine admin
// =========================================
export const ADMIN_PAGE_KEYS = [
  "overview",
  "eventi",
  "format",
  "artisti",
  "generi",
  "leads",
  "richieste",
  "chat",
  "consulenza",
  "blog",
  "email",
  "profilo",
  "impostazioni",
  "feedback",
] as const;
export type AdminPageKey = (typeof ADMIN_PAGE_KEYS)[number];

export const inviteSuperadminSchema = z.object({
  email: z.string().email("Email non valida"),
  full_name: z
    .string()
    .min(2)
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type InviteSuperadminInput = z.infer<typeof inviteSuperadminSchema>;

export const pagePermissionsSchema = z.object({
  user_id: z.string().uuid(),
  page_keys: z.array(z.enum(ADMIN_PAGE_KEYS)).max(ADMIN_PAGE_KEYS.length),
});
export type PagePermissionsInput = z.infer<typeof pagePermissionsSchema>;

// =========================================
// Artist videos
// =========================================
export const artistVideoSchema = z.object({
  artist_id: z.string().uuid(),
  url: z.string().url(),
  storage_path: z.string().min(1),
  title: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  size_bytes: z.coerce.number().int().positive().max(50 * 1024 * 1024).optional(),
  mime_type: z.string().max(80).optional(),
});
export type ArtistVideoInput = z.infer<typeof artistVideoSchema>;

// =========================================
// Mass availability editing
// =========================================
export const bulkAvailabilitySchema = z.object({
  artist_id: z.string().uuid(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  status: z.enum(["available", "busy"]),
  slot_ids: z.array(z.string().uuid()).max(20).optional(),
});
export type BulkAvailabilityInput = z.infer<typeof bulkAvailabilitySchema>;

// =========================================
// Final price (booking confermata)
// =========================================
export const finalPriceProposeSchema = z.object({
  booking_id: z.string().uuid(),
  price: z.coerce.number().positive("Prezzo non valido").max(1_000_000),
});
export type FinalPriceProposeInput = z.infer<typeof finalPriceProposeSchema>;

// =========================================
// Feedback (organizer -> artist post evento)
// =========================================
export const feedbackSchema = z.object({
  booking_request_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Voto minimo 1").max(5, "Voto massimo 5"),
  body: z
    .string()
    .min(10, "Almeno 10 caratteri")
    .max(2000, "Massimo 2000 caratteri"),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

// =========================================
// Platform feedback (artisti/organizzatori -> N'arte)
// =========================================
export const platformFeedbackCategory = z.enum([
  "generale",
  "bug",
  "suggerimento",
  "altro",
]);
export type PlatformFeedbackCategory = z.infer<typeof platformFeedbackCategory>;

export const platformFeedbackSchema = z.object({
  category: platformFeedbackCategory.default("generale"),
  subject: z
    .string()
    .max(160)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  body: z
    .string()
    .min(10, "Almeno 10 caratteri")
    .max(4000, "Massimo 4000 caratteri"),
  rating: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type PlatformFeedbackInput = z.infer<typeof platformFeedbackSchema>;
