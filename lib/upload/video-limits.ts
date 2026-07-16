/**
 * Limiti dei video caricati dall'artista — condivisi client e server.
 *
 * ⚠️  IL LIMITE È VINCOLATO AL PIANO SUPABASE, non a questa costante.
 * Il `file_size_limit` di un bucket non può superare il limite globale del
 * progetto: sul piano FREE è 50MB ed è FISSO (non alzabile né via SQL né da
 * dashboard). Alzare solo il numero qui sotto non funziona: l'upload arriverebbe
 * a Supabase e verrebbe rifiutato a fine trasferimento.
 *
 * Per portare il limite a 500MB servono, in quest'ordine:
 *   1. piano Supabase Pro;
 *   2. Dashboard → Storage → Settings → "Upload file size limit" → 500 MB;
 *   3. MAX_VIDEO_BYTES = 500 * 1024 * 1024 qui sotto;
 *   4. una migration che allinei il bucket (vedi 0036_artist_videos_limits.sql).
 */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Tetto per artista: l'egress di Supabase si paga a consumo e un video
 * effettivamente guardato costa la sua intera dimensione in banda.
 */
export const MAX_VIDEO_PER_ARTIST = 3;

/**
 * Solo formati davvero riproducibili in <video> su tutti i browser.
 * `video/quicktime` (.mov) è escluso di proposito: i .mov girati da iPhone
 * usano quasi sempre HEVC/H.265, che non si riproduce su Chrome, Firefox e
 * Android. Supabase Storage non transcodifica, quindi un .mov accettato qui
 * diventerebbe un video invisibile a metà del pubblico.
 */
export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm"] as const;

export const VIDEO_ACCEPT_ATTR = ALLOWED_VIDEO_MIME.join(",");

export const ARTIST_VIDEO_BUCKET = "artist-videos";

export function isAllowedVideoMime(mime: string): boolean {
  return (ALLOWED_VIDEO_MIME as readonly string[]).includes(mime);
}

export function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
}

/**
 * Alcuni file picker (soprattutto Android) restituiscono `file.type` vuoto:
 * senza questo fallback l'upload verrebbe rifiutato per un file valido.
 */
export function guessVideoMime(file: File): string | null {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  return null;
}
