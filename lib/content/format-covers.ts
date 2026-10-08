/**
 * Foto di ripiego dei quattro format, in `public/format/`. Valgono finché
 * l'admin non carica una copertina propria (la colonna `cover_image` vince
 * sempre).
 */
export const FORMAT_COVERS: Record<string, string> = {
  nulive: "/format/nulive.webp",
  najam: "/format/najam.webp",
  naband: "/format/naband.webp",
  nacena: "/format/nacena.webp",
};

/** Copertina da mostrare: quella caricata, altrimenti la foto di ripiego, altrimenti niente. */
export function formatCover(slug: string, coverImage: string | null | undefined): string | null {
  return coverImage || FORMAT_COVERS[slug] || null;
}

/** Legge `details.prezzo` (es. «a partire da 200€») senza fidarsi della forma del JSON. */
export function formatPrezzo(details: unknown): string | null {
  if (typeof details !== "object" || details === null || Array.isArray(details)) return null;
  const prezzo = (details as Record<string, unknown>).prezzo;
  if (typeof prezzo !== "string") return null;
  const pulito = prezzo.trim();
  return pulito === "" ? null : pulito;
}
