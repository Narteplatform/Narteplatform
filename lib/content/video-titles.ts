/**
 * Titoli dei video di eventi e format (migration 0074).
 *
 * `videos` resta un elenco di URL; il titolo sta accanto, in `video_titles`,
 * come mappa URL → titolo. Così i video già caricati non vanno convertiti, e un
 * URL senza voce è semplicemente un video senza titolo.
 */

export type TitoliVideo = Record<string, string>;

/** Legge la colonna senza fidarsi della forma del JSON. */
export function leggiTitoliVideo(raw: unknown): TitoliVideo {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: TitoliVideo = {};
  for (const [url, titolo] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof titolo === "string" && titolo.trim()) out[url] = titolo.trim();
  }
  return out;
}

/**
 * Tiene solo i titoli dei video ancora presenti e non vuoti: rimuovendo un
 * video dal modulo se ne va anche il suo titolo.
 */
export function titoliPerVideo(titoli: TitoliVideo, videos: string[]): TitoliVideo {
  const presenti = new Set(videos);
  const out: TitoliVideo = {};
  for (const [url, titolo] of Object.entries(titoli)) {
    const t = titolo.trim();
    if (presenti.has(url) && t) out[url] = t.slice(0, 120);
  }
  return out;
}

/** Titolo proposto per un file appena caricato: il nome senza estensione. */
export function titoloDaNomeFile(nome: string): string {
  return nome.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 120);
}
