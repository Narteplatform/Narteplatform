import type { AudioTrack, PersonnelMember } from "@/lib/validators/artist-profile";

export type { AudioTrack, PersonnelMember };

/**
 * Riga `artists` così come serve all'editor.
 *
 * `getActiveArtistRow` restituisce un `{ [key: string]: unknown }`: il cast
 * verso questo tipo va fatto UNA volta sola nella pagina, non in ogni blocco.
 */
export type ArtistProfileData = {
  id: string;
  stage_name: string;
  bio: string | null;
  genre: string[] | null;
  instruments: string[] | null;
  city: string | null;
  cover_image: string | null;
  social_links: unknown;
  gallery: string[] | null;
  videos: string[] | null;
  audio_files: AudioTrack[] | null;
  tier: "free" | "pro" | "max";
  percorso_artistico: "cover_artist" | "tribute_band" | "progetto_inedito" | null;
  price_range: string | null;
  gig_min_minutes: number | null;
  gig_max_minutes: number | null;
  languages: string[] | null;
  what_to_expect: string | null;
  about_extended: string | null;
  personnel: PersonnelMember[] | string[] | string | null;
  set_list: string | null;
  influences: string[] | null;
  setup_requirements: string | null;
};

/** Legge una chiave da `social_links`, che in DB è jsonb non tipizzato. */
export function readLink(links: unknown, key: string): string {
  if (links && typeof links === "object" && !Array.isArray(links)) {
    const v = (links as Record<string, unknown>)[key];
    return typeof v === "string" ? v : "";
  }
  return "";
}

/**
 * Migra `personnel` dal vecchio formato (stringa "Nome — Ruolo" per riga, o
 * array di stringhe) al formato oggetto `{ name, role }[]`.
 */
export function normalisePersonnel(
  raw: PersonnelMember[] | string[] | string | null | undefined
): PersonnelMember[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item && typeof item === "object" && "name" in item) {
          const m = item as PersonnelMember;
          return { name: String(m.name ?? "").trim(), role: String(m.role ?? "").trim() };
        }
        if (typeof item === "string") {
          const [name, ...rest] = item.split("—");
          return { name: (name ?? "").trim(), role: rest.join("—").trim() };
        }
        return null;
      })
      .filter((m): m is PersonnelMember => m !== null && m.name.length > 0);
  }

  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split("—");
        return { name: (name ?? "").trim(), role: rest.join("—").trim() };
      })
      .filter((m) => m.name.length > 0);
  }

  return [];
}
