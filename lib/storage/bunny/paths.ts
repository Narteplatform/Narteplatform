/**
 * Costruzione delle chiavi degli oggetti su Bunny Storage.
 *
 * Due principi, entrambi con una conseguenza pratica.
 *
 * 1. IL PERCORSO LO SCEGLIE SEMPRE IL SERVER, MAI IL CLIENT.
 *    Con la PUT presigned l'URL firmato autorizza la scrittura su quel solo
 *    percorso: è l'invariante di sicurezza dell'intero flusso, l'equivalente
 *    del prefisso `user.id` usato oggi su Supabase Storage. Per questo il nome
 *    del file scelto dall'utente non entra qui: l'estensione arriva da una
 *    mappa MIME chiusa e il resto è generato.
 *
 * 2. IL PREFISSO È L'ENTITÀ, NON L'UTENTE.
 *    Oggi le chiavi Supabase iniziano con `user.id`, e questo rende impossibile
 *    ripulire i media di un artista cancellato senza sapere chi era il suo
 *    proprietario al momento del caricamento. Con `artists/{artistId}/...` una
 *    cancellazione a cascata diventa la rimozione di un prefisso.
 */

export type MediaScope = "artists" | "events" | "venues" | "formats" | "blog" | "users";
/**
 * Cartella dentro l'entità. È una stringa e non un'unione chiusa perché i
 * chiamanti hanno già insiemi chiusi propri (la mappa BUCKETS di /api/upload),
 * e duplicarli qui li farebbe divergere al primo kind nuovo. La sicurezza la dà
 * la normalizzazione in mediaKey, non il tipo.
 */
export type MediaKind = string;

/**
 * ⚠️ Lo scope `users` esiste per una ragione concreta e non aggirabile: quando
 * si carica la copertina di un evento o di un articolo, quell'evento spesso NON
 * ESISTE ANCORA — il form è aperto in creazione e l'id nascerà solo al
 * salvataggio. Non c'è nessuna entità a cui agganciare il file.
 *
 * In quei casi il prefisso resta l'utente, esattamente come oggi su Supabase, e
 * la tracciabilità la garantisce la tabella `media_assets`. Gli scope per
 * entità si usano dove l'id è certo — l'audio, la cui rotta di firma riceve già
 * `artistId`.
 */

/**
 * Mappe MIME → estensione, volutamente chiuse.
 *
 * Un MIME non in elenco non produce una chiave: il chiamante deve rifiutare la
 * richiesta. Dedurre l'estensione dal MIME dichiarato dal client (come fa oggi
 * `app/api/upload/route.ts` con `file.type.split("/")[1]`) significa lasciar
 * scegliere a lui con che estensione il file verrà poi servito dal CDN.
 */
const IMAGE_EXT: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const AUDIO_EXT: Readonly<Record<string, string>> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

export function imageExtForMime(mime: string): string | null {
  return IMAGE_EXT[mime.toLowerCase().trim()] ?? null;
}

export function audioExtForMime(mime: string): string | null {
  return AUDIO_EXT[mime.toLowerCase().trim()] ?? null;
}

export const ALLOWED_IMAGE_MIME = Object.keys(IMAGE_EXT);
export const ALLOWED_AUDIO_MIME = Object.keys(AUDIO_EXT);

/**
 * Gli identificativi delle entità sono uuid Postgres. Il controllo non è
 * paranoia: `ownerId` arriva dal body della richiesta, e senza vincolo un
 * `../../` trasformerebbe la chiave firmata in una scrittura altrove nella
 * zone.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Slug già normalizzati (usati per il blog), senza separatori di percorso. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

function assertSafeOwner(ownerId: string): string {
  const value = ownerId.trim();
  if (UUID.test(value) || SAFE_SLUG.test(value)) return value.toLowerCase();
  throw new Error("[bunny/paths] identificativo entità non valido");
}

function randomToken(): string {
  // `crypto` è globale sia in Node 20+ sia nei browser moderni.
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * Chiave di un oggetto nella storage zone, senza il nome della zone davanti.
 *
 *   artists/<artistId>/gallery/<token>.jpg
 *   artists/<artistId>/audio/<token>.mp3
 *   events/<eventId>/cover/<token>.jpg
 *   blog/<slug>/inline/<token>.png
 *
 * Il token casuale, e non il nome originale, evita due file diversi che si
 * sovrascrivono a vicenda e non rivela il nome del file di chi carica.
 */
export function mediaKey(input: {
  scope: MediaScope;
  ownerId: string;
  kind: MediaKind;
  ext: string;
}): string {
  const owner = assertSafeOwner(input.ownerId);
  const ext = input.ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!ext) throw new Error("[bunny/paths] estensione non valida");
  const folder =
    input.kind.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32) ||
    "misc";
  return `${input.scope}/${owner}/${folder}/${randomToken()}.${ext}`;
}

/**
 * Prefisso di tutti i media di un'entità. Serve alla riconciliazione e, in
 * futuro, alla cancellazione a cascata.
 */
export function mediaPrefix(scope: MediaScope, ownerId: string): string {
  return `${scope}/${assertSafeOwner(ownerId)}/`;
}
