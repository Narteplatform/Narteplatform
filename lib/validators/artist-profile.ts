import { z } from "zod";
import { BUDGET_RANGES } from "@/lib/constants/budget-ranges";

/**
 * Contratto dei blocchi dell'editor "Profilo artista".
 *
 * Sta qui e non in lib/validators/schemas.ts perché quel file serve i form
 * pubblici e l'editor admin: `artistSchema` lì dentro modella i generi come
 * stringa CSV e non copre nessun campo di booking, quindi non è riusabile.
 *
 * Due livelli, deliberatamente separati:
 *   • *SectionSchema  — i VALORI DEL FORM (stringhe, textarea, select), usati
 *                       da React Hook Form via zodResolver.
 *   • PROFILE_SECTION_PAYLOAD_SCHEMAS — la SHAPE DB, ri-validata dalla Server
 *                       Action: il client non è una fonte di verità.
 *
 * La normalizzazione (split per riga, CSV, clamp dei minuti, lookup della
 * fascia di prezzo) vive nei `to*Payload` e non nei componenti: prima stava
 * solo lato client e il server accettava qualunque cosa arrivasse.
 *
 * Nessun `.default()` negli schemi del form: i blocchi passano sempre valori
 * completi, e così z.input e z.output coincidono (RHF non deve gestire due tipi
 * diversi per lo stesso form).
 *
 * Client-safe: nessun import `server-only`.
 */

// ─── helper di normalizzazione ────────────────────────────────────────────────

export type PersonnelMember = { name: string; role: string };
export type AudioTrack = { url: string; title: string };

export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function splitCsv(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
}

/** I minuti hanno un check 0..1440 in SQL (0029): superarlo sarebbe un 500. */
function clampMinutes(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1440, Math.round(n)));
}

// ─── informazioni artista ─────────────────────────────────────────────────────

export const PERCORSO_VALUES = ["cover_artist", "tribute_band", "progetto_inedito"] as const;
export type PercorsoValue = (typeof PERCORSO_VALUES)[number];

export const infoSectionSchema = z.object({
  stage_name: z.string().trim().min(2, "Il nome d'arte deve avere almeno 2 caratteri").max(80),
  city: z.string().trim().max(80),
  genre: z.array(z.string()).min(1, "Seleziona almeno un genere").max(3, "Massimo 3 generi"),
  instruments: z.array(z.string()),
  bio: z.string().max(4000, "La bio non può superare i 4000 caratteri"),
  cover_image: z.string(),
  percorso_artistico: z.enum(["", "cover_artist", "tribute_band", "progetto_inedito"]),
});

export type InfoSectionValues = z.infer<typeof infoSectionSchema>;

/**
 * @param canSetPercorso quando è false la chiave viene OMESSA dal payload, non
 * azzerata: il downgrade nasconde il percorso, non lo cancella (0040).
 */
export function toInfoPayload(v: InfoSectionValues, canSetPercorso: boolean) {
  const base = {
    stage_name: v.stage_name,
    city: emptyToNull(v.city),
    genre: v.genre,
    instruments: v.instruments,
    bio: emptyToNull(v.bio),
    cover_image: emptyToNull(v.cover_image),
  };
  if (!canSetPercorso) return base;
  return {
    ...base,
    percorso_artistico: v.percorso_artistico === "" ? null : v.percorso_artistico,
  };
}

// ─── galleria foto ────────────────────────────────────────────────────────────

export const gallerySectionSchema = z.object({
  gallery: z.array(z.string()),
});
export type GallerySectionValues = z.infer<typeof gallerySectionSchema>;

export function toGalleryPayload(v: GallerySectionValues) {
  return { gallery: v.gallery.filter(Boolean) };
}

// ─── galleria video (solo gli URL: i file caricati hanno action proprie) ───────

export const videosSectionSchema = z.object({
  videos: z.string().max(4000),
});
export type VideosSectionValues = z.infer<typeof videosSectionSchema>;

export function toVideosPayload(v: VideosSectionValues) {
  return { videos: splitLines(v.videos) };
}

// ─── tracce audio ─────────────────────────────────────────────────────────────

export const audioTrackSchema = z.object({
  url: z.string().min(1),
  title: z.string().max(200),
});

export const audioSectionSchema = z.object({
  audio_files: z.array(audioTrackSchema),
});
export type AudioSectionValues = z.infer<typeof audioSectionSchema>;

export function toAudioPayload(v: AudioSectionValues) {
  return { audio_files: v.audio_files.filter((t) => t && t.url) };
}

// ─── informazioni di booking ──────────────────────────────────────────────────

export const bookingSectionSchema = z
  .object({
    price_range: z.string(),
    languages: z.array(z.string()),
    gig_min_minutes: z.string(),
    gig_max_minutes: z.string(),
    what_to_expect: z.string().max(4000),
    about_extended: z.string().max(4000),
    personnel: z.array(z.object({ name: z.string().max(120), role: z.string().max(120) })),
    set_list: z.string().max(4000),
    influences: z.string().max(1000),
    setup_requirements: z.string().max(4000),
  })
  // Vincolo che prima non esisteva da nessuna parte: si poteva salvare un set
  // "minimo 120 minuti, massimo 30".
  .refine(
    (v) =>
      !v.gig_min_minutes ||
      !v.gig_max_minutes ||
      Number(v.gig_min_minutes) <= Number(v.gig_max_minutes),
    { message: "La durata minima non può superare la massima", path: ["gig_max_minutes"] }
  );

export type BookingSectionValues = z.infer<typeof bookingSectionSchema>;

export function toBookingPayload(v: BookingSectionValues) {
  return {
    // In DB si salva la LABEL della fascia, non il value: la pagina pubblica la
    // rende così com'è.
    price_range: v.price_range.trim()
      ? (BUDGET_RANGES.find((r) => r.value === v.price_range)?.label ?? v.price_range.trim())
      : null,
    languages: v.languages,
    gig_min_minutes: clampMinutes(v.gig_min_minutes),
    gig_max_minutes: clampMinutes(v.gig_max_minutes),
    what_to_expect: emptyToNull(v.what_to_expect),
    about_extended: emptyToNull(v.about_extended),
    personnel: v.personnel
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() }))
      .filter((m) => m.name.length > 0),
    set_list: emptyToNull(v.set_list),
    influences: splitCsv(v.influences),
    setup_requirements: emptyToNull(v.setup_requirements),
  };
}

// ─── social ───────────────────────────────────────────────────────────────────

const socialField = z.string().trim().max(200);

export const socialSectionSchema = z.object({
  instagram: socialField,
  facebook: socialField,
  tiktok: socialField,
  youtube: socialField,
  spotify: socialField,
  website: socialField,
});
export type SocialSectionValues = z.infer<typeof socialSectionSchema>;

export const SOCIAL_KEYS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "spotify",
  "website",
] as const;

/**
 * `social_links` è una colonna jsonb unica: questo blocco la RISCRIVE INTERA.
 * Chi in futuro vi aggiungesse una chiave scritta da un'altra parte la vedrebbe
 * sparire al primo salvataggio dei social.
 */
export function toSocialPayload(v: SocialSectionValues) {
  const links: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    if (v[key]) links[key] = v[key];
  }
  return { social_links: links };
}

// ─── schemi lato DB, usati dalla Server Action per ri-validare ────────────────

const nullableText = z.string().max(4000).nullable();

export const PROFILE_SECTION_PAYLOAD_SCHEMAS = {
  info: z.object({
    stage_name: z.string().trim().min(2).max(80),
    city: z.string().max(80).nullable(),
    genre: z.array(z.string()).min(1).max(3),
    instruments: z.array(z.string()).max(40),
    bio: nullableText,
    cover_image: z.string().nullable(),
    percorso_artistico: z.enum(PERCORSO_VALUES).nullable().optional(),
  }),
  gallery: z.object({ gallery: z.array(z.string()).max(100) }),
  videos: z.object({ videos: z.array(z.string()).max(50) }),
  audio: z.object({ audio_files: z.array(audioTrackSchema).max(50) }),
  booking: z.object({
    price_range: z.string().max(120).nullable(),
    languages: z.array(z.string()).max(20),
    gig_min_minutes: z.number().int().min(0).max(1440).nullable(),
    gig_max_minutes: z.number().int().min(0).max(1440).nullable(),
    what_to_expect: nullableText,
    about_extended: nullableText,
    personnel: z.array(z.object({ name: z.string().max(120), role: z.string().max(120) })).max(50),
    set_list: nullableText,
    influences: z.array(z.string()).max(50),
    setup_requirements: nullableText,
  }),
  social: z.object({ social_links: z.record(z.string().max(200)) }),
} as const;
