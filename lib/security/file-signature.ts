/**
 * Riconoscimento del tipo di un file dai suoi primi byte ("magic number").
 *
 * PERCHÉ. `File.type` lo dichiara il browser, cioè chi carica: un client
 * qualunque può spedire un SVG con dentro uno <script> dichiarandolo
 * `image/png`. Il tipo con cui il file viene poi SERVITO dal CDN è quello che
 * gli diamo noi al salvataggio, quindi va dedotto dal contenuto, non creduto.
 *
 * Si guardano solo le firme dei formati ammessi: tutto il resto è `null`, e
 * il chiamante rifiuta. Nessuna dipendenza: bastano i primi 32 byte.
 */

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";

/** Byte da leggere per riconoscere qualunque formato qui sotto. */
export const SIGNATURE_BYTES = 64;

function ascii(b: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function startsWith(b: Uint8Array, sig: readonly number[], offset = 0): boolean {
  if (b.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (b[offset + i] !== sig[i]) return false;
  return true;
}

/** Brand ISO-BMFF (`ftyp`): major brand + compatible brands del primo box. */
function ftypBrands(b: Uint8Array): string[] | null {
  if (ascii(b, 4, 4) !== "ftyp") return null;
  const size = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  const end = Math.min(size || b.length, b.length);
  const brands = [ascii(b, 8, 4)];
  for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(b, i, 4));
  return brands;
}

/**
 * Tipo reale di un'immagine fra quelli ammessi (JPEG, PNG, WebP, GIF, AVIF).
 * SVG, HEIC, BMP, TIFF, HTML travestito e tutto il resto → `null`.
 */
export function detectImageMime(b: Uint8Array): ImageMime | null {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  const gif = ascii(b, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  const brands = ftypBrands(b);
  if (brands && brands.some((x) => x === "avif" || x === "avis")) return "image/avif";
  return null;
}

/**
 * Vero se i primi byte sono quelli di un contenitore audio ammesso: MP3 (ID3 o
 * frame MPEG), AAC ADTS, WAV, OGG, FLAC, M4A/MP4.
 */
export function looksLikeAudio(b: Uint8Array): boolean {
  if (ascii(b, 0, 3) === "ID3") return true; // MP3 (e qualche AAC/FLAC) con tag ID3v2
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return true; // frame MPEG / ADTS
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WAVE") return true;
  if (ascii(b, 0, 4) === "OggS") return true;
  if (ascii(b, 0, 4) === "fLaC") return true;
  if (ftypBrands(b)) return true; // M4A / MP4 audio
  return false;
}

/** Vero se i primi byte sono quelli di un MP4/MOV (ISO-BMFF) o di un WebM (EBML). */
export function looksLikeVideo(b: Uint8Array): boolean {
  if (ftypBrands(b)) return true;
  if (startsWith(b, [0x1a, 0x45, 0xdf, 0xa3])) return true;
  return false;
}
