/**
 * Limiti dei video caricati dall'artista — condivisi client e server.
 *
 * Ci sono DUE insiemi di limiti perché ci sono due destinazioni, e finché
 * l'interruttore `BUNNY_UPLOADS_ENABLED` esiste convivono entrambe.
 */

export type UploadTarget = "supabase" | "bunny";

/**
 * RAMO SUPABASE — 50 MB.
 *
 * ⚠️ Non è una nostra scelta: il `file_size_limit` di un bucket non può
 * superare il limite globale del progetto, che sul piano FREE è 50 MB ed è
 * FISSO (non alzabile né via SQL né da dashboard). Alzare il numero qui non
 * servirebbe: l'upload arriverebbe a Supabase e verrebbe rifiutato a fine
 * trasferimento. Per portarlo a 500 MB servirebbero, in quest'ordine: piano
 * Supabase Pro, Dashboard → Storage → Settings → "Upload file size limit", e
 * una migration che allinei il bucket (vedi 0036_artist_videos_limits.sql).
 */
export const MAX_VIDEO_BYTES_SUPABASE = 50 * 1024 * 1024;

/**
 * RAMO BUNNY — 500 MB.
 *
 * Il file non transita né da Vercel né da Supabase: va in TUS a chunk
 * direttamente su Bunny Stream. Il tetto del piano Supabase non c'entra più,
 * e i 25 $/mese di Supabase Pro che sarebbero serviti per superarlo non
 * servono più.
 */
export const MAX_VIDEO_BYTES_BUNNY = 500 * 1024 * 1024;

/**
 * RAMO SUPABASE — solo formati davvero riproducibili in `<video>` ovunque.
 *
 * `video/quicktime` è escluso di proposito: i .mov girati da iPhone usano quasi
 * sempre HEVC/H.265, che non si riproduce su Chrome, Firefox e Android.
 * Supabase Storage non transcodifica, quindi un .mov accettato qui diventerebbe
 * un video invisibile a metà del pubblico.
 */
export const ALLOWED_VIDEO_MIME_SUPABASE = ["video/mp4", "video/webm"] as const;

/**
 * RAMO BUNNY — l'elenco si allarga, ed è il motivo principale per cui questa
 * integrazione esiste.
 *
 * Bunny Stream accetta in ingresso H.264, H.265/HEVC, VP9, VP8, AV1, MPEG-2 e
 * ProRes, e ne esce sempre H.264 riproducibile ovunque. Il muro dei .mov
 * dell'iPhone — che oggi fa arrendere l'artista che gira col telefono — sparisce
 * senza chiedergli di riesportare niente.
 */
export const ALLOWED_VIDEO_MIME_BUNNY = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-m4v",
  "video/mpeg",
  "video/x-msvideo",
] as const;

/**
 * Tetto per artista usato SOLO come ripiego quando il piano non è noto.
 *
 * La fonte vera è `ent.videoMax` (1 Free / 3 Pro / 3 Max). Questa costante
 * mostrava a tutti il limite del piano più alto: un artista Free leggeva
 * "max 3 video" e scopriva il vero limite solo quando il server lo bloccava.
 */
export const MAX_VIDEO_PER_ARTIST = 3;

export const ARTIST_VIDEO_BUCKET = "artist-videos";

export type VideoLimits = {
  maxBytes: number;
  mime: readonly string[];
  accept: string;
};

export function videoLimitsFor(target: UploadTarget): VideoLimits {
  const mime = target === "bunny" ? ALLOWED_VIDEO_MIME_BUNNY : ALLOWED_VIDEO_MIME_SUPABASE;
  return {
    maxBytes: target === "bunny" ? MAX_VIDEO_BYTES_BUNNY : MAX_VIDEO_BYTES_SUPABASE,
    mime,
    accept: mime.join(","),
  };
}

export function isAllowedVideoMime(mime: string, target: UploadTarget): boolean {
  return videoLimitsFor(target).mime.includes(mime);
}

export function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
}

/**
 * Alcuni file picker (soprattutto Android) restituiscono `file.type` vuoto:
 * senza questo ripiego l'upload verrebbe rifiutato per un file valido.
 */
export function guessVideoMime(file: File): string | null {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  if (ext === "mkv") return "video/x-matroska";
  if (ext === "avi") return "video/x-msvideo";
  return null;
}
