/**
 * Costruzione e riconoscimento degli URL pubblici di bunny.net.
 *
 * ⚠️ Questo modulo NON è `server-only` di proposito: lo importano anche i
 * Client Component che rendono il player e le anteprime. Per questo non deve
 * mai importare `config.ts` né toccare un segreto: legge solo variabili
 * `NEXT_PUBLIC_*`, che per definizione finiscono nel bundle del browser.
 *
 * Le `process.env.NEXT_PUBLIC_*` vanno scritte come letterali per esteso: Next
 * le sostituisce staticamente a build time, e un accesso dinamico
 * (`process.env[nome]`) nel bundle client resterebbe `undefined`.
 */

/**
 * Un hostname mancante è un errore di configurazione, non un caso da gestire:
 * si preferisce fallire subito e a voce alta piuttosto che produrre un URL
 * `https://undefined/...` che il browser tenta davvero di caricare.
 *
 * Non è un rischio per la convivenza: finché non esistono contenuti su Bunny,
 * nessuna di queste funzioni viene chiamata.
 */
function requireHost(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`[bunny/urls] variabile d'ambiente mancante: ${name}`);
  }
  return trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function streamCdnHost(): string {
  return requireHost("NEXT_PUBLIC_BUNNY_STREAM_CDN", process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN);
}

function storageCdnHost(): string {
  return requireHost("NEXT_PUBLIC_BUNNY_STORAGE_CDN", process.env.NEXT_PUBLIC_BUNNY_STORAGE_CDN);
}

function playerHost(): string {
  // Ha un default perché è l'unico valore che la documentazione Bunny e il
  // pannello hanno storicamente riportato in due forme diverse
  // (player.mediadelivery.net e iframe.mediadelivery.net). Resta una variabile
  // proprio per poterlo allineare a quello che espone la tab Embed della
  // library, senza ricompilare.
  return requireHost(
    "NEXT_PUBLIC_BUNNY_PLAYER_HOST",
    process.env.NEXT_PUBLIC_BUNNY_PLAYER_HOST || "player.mediadelivery.net"
  );
}

function streamLibraryId(): string {
  const id = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim();
  if (!id) {
    throw new Error("[bunny/urls] variabile d'ambiente mancante: NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID");
  }
  return id;
}

// --- Bunny Stream -----------------------------------------------------------
// Struttura verificata sulla documentazione ufficiale (stream/storage-structure).

export type StreamMp4Resolution = "240p" | "360p" | "480p" | "720p" | "1080p";

/** Manifest HLS a bitrate adattivo. */
export function streamHlsUrl(guid: string): string {
  return `https://${streamCdnHost()}/${guid}/playlist.m3u8`;
}

/** Poster del video. È anche la facciata mostrata prima del click sul player. */
export function streamThumbnailUrl(guid: string): string {
  return `https://${streamCdnHost()}/${guid}/thumbnail.jpg`;
}

/** Anteprima animata, utile al passaggio del mouse. */
export function streamPreviewUrl(guid: string): string {
  return `https://${streamCdnHost()}/${guid}/preview.webp`;
}

/** Rendition MP4 singola, per i contesti in cui HLS non è praticabile. */
export function streamMp4Url(guid: string, resolution: StreamMp4Resolution): string {
  return `https://${streamCdnHost()}/${guid}/play_${resolution}.mp4`;
}

/** File originale caricato, conservato da Bunny accanto alle rendition. */
export function streamOriginalUrl(guid: string): string {
  return `https://${streamCdnHost()}/${guid}/original`;
}

export type StreamEmbedOptions = {
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** Riproduzione in linea su mobile invece del fullscreen forzato. */
  playsinline?: boolean;
  /** Prescarica i file: da lasciare spento, la facciata esiste apposta. */
  preload?: boolean;
};

/**
 * URL dell'iframe del player Bunny.
 *
 * `preload` è false per difetto: il senso della facciata (BunnyVideoFacade) è
 * proprio non scaricare niente finché qualcuno non preme play.
 */
export function streamEmbedUrl(guid: string, opts: StreamEmbedOptions = {}): string {
  const params = new URLSearchParams({
    autoplay: String(opts.autoplay ?? false),
    loop: String(opts.loop ?? false),
    muted: String(opts.muted ?? false),
    playsinline: String(opts.playsinline ?? true),
    preload: String(opts.preload ?? false),
  });
  return `https://${playerHost()}/embed/${streamLibraryId()}/${guid}?${params.toString()}`;
}

// --- Bunny Storage ----------------------------------------------------------

/**
 * URL pubblico di un oggetto nella storage zone, servito dalla pull zone
 * collegata. `key` è il percorso SENZA il nome della zone.
 */
export function storageCdnUrl(key: string): string {
  return `https://${storageCdnHost()}/${key.replace(/^\/+/, "")}`;
}

// --- Riconoscimento della provenienza ---------------------------------------
// Servono alla convivenza: durante e dopo l'adozione, negli array `gallery` e
// `audio_files` coesistono URL Supabase, URL Bunny e URL esterni incollati a
// mano dall'artista. Ogni decisione (cancellare, migrare, lasciare stare) parte
// dal saper distinguere le tre cose.

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/** true solo per la NOSTRA pull zone dello storage, non per un `*.b-cdn.net` qualsiasi. */
export function isBunnyStorageUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  try {
    return host === storageCdnHost().toLowerCase();
  } catch {
    return false;
  }
}

/** true solo per la NOSTRA pull zone di Stream. */
export function isBunnyStreamUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  try {
    return host === streamCdnHost().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Poster nostro, estratto dal browser al momento del caricamento e messo su
 * Bunny STORAGE — non su Stream.
 *
 * Due ragioni, entrambe pratiche. È disponibile subito, mentre la thumbnail di
 * Bunny esiste solo a transcodifica finita (nella coda gratuita, da minuti a
 * mezz'ora). E vive su un'altra pull zone, quindi non risente delle
 * impostazioni di sicurezza della library Stream.
 *
 * La chiave è DERIVATA dal guid, non casuale: così non serve una colonna in più
 * per ritrovarla.
 */
export function videoPosterKey(guid: string): string {
  return `video-posters/${guid}.jpg`;
}

export function videoPosterUrl(guid: string): string {
  return storageCdnUrl(videoPosterKey(guid));
}

const GUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/**
 * Estrae il GUID di un video Bunny da un URL, se e solo se l'URL è nostro.
 *
 * Serve dove il video non ha una riga dedicata: gli array `events.videos` e
 * `formats.videos` sono `text[]` e contengono URL misti — YouTube, Vimeo,
 * incollati a mano e ora anche Bunny. Salvare l'URL di embed invece del solo
 * guid evita una migrazione di schema e mantiene la libertà di incollare un
 * link esterno; il guid si rilegge da qui quando serve (cancellazione,
 * riconciliazione).
 *
 * Il controllo sull'hostname NON è formalità: senza, un URL esterno che
 * contenesse un UUID verrebbe scambiato per un nostro video.
 */
export function bunnyStreamGuidFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase();
    let ours = false;
    try {
      ours = host === playerHost().toLowerCase() || host === streamCdnHost().toLowerCase();
    } catch {
      return null;
    }
    if (!ours) return null;
    return u.pathname.match(GUID_RE)?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** true se l'URL è un embed del nostro player Bunny. */
export function isBunnyEmbedUrl(url: string): boolean {
  return bunnyStreamGuidFromUrl(url) !== null && /\/embed\//.test(url);
}

/**
 * true per un URL pubblico dello Storage Supabase di QUESTO progetto.
 *
 * Sostituisce il controllo `startsWith` sparso oggi in
 * app/(artist)/dashboard/_actions.ts: stesso principio, un posto solo.
 */
export function isSupabasePublicUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return false;
  return url.startsWith(`${base}/storage/v1/object/public/`);
}
