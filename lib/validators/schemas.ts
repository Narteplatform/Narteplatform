import { z } from "zod";

export const leadSchema = z.object({
  artistId: z.string().uuid(),
  eventDate: z.string().min(1, "Data richiesta"),
  eventLocation: z.string().min(2, "Luogo troppo corto").max(120),
  budget: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(20, "Almeno 20 caratteri").max(2000),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(6).max(30).optional().or(z.literal("").transform(() => undefined)),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const artistApplicationSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  stageName: z.string().min(2).max(80),
  genre: z.string().min(2).max(120),
  bio: z.string().max(2000).optional(),
  instagram: z.string().max(120).optional(),
  spotify: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("").transform(() => undefined)),
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
  city: z.string().min(2),
  venue: z.string().max(160).optional(),
  price: z.coerce.number().nonnegative().optional(),
  coverImage: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().max(4000).optional(),
  featured: z.boolean().optional(),
});
export type EventInput = z.infer<typeof eventSchema>;

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Almeno 8 caratteri"),
  fullName: z.string().min(2).max(80).optional(),
});
export type AuthInput = z.infer<typeof authSchema>;
