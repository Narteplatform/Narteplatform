import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { bunnyStreamConfig } from "./config";

/**
 * Bunny Stream — creazione, interrogazione e cancellazione dei video, più la
 * firma degli upload TUS e la verifica della firma dei webhook.
 *
 * Bunny è disco e CDN, non diventa la fonte di verità: i metadati restano su
 * Postgres. Questo modulo non sa cosa sia un artista e non tocca Supabase.
 */

const API = "https://video.bunnycdn.com";
export const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

/**
 * Stati del ciclo di vita di un video, come li manda Bunny.
 *
 * ⚠️ NON È UNA SCALA MONOTONA, ed è la trappola principale dell'integrazione:
 *   - RESOLUTION_FINISHED (4) arriva PRIMA di FINISHED (3): appena una
 *     risoluzione è pronta il video si guarda già, e aspettare il 3
 *     allungherebbe l'attesa percepita senza alcun motivo;
 *   - CAPTIONS_GENERATED (9) e TITLE_GENERATED (10) arrivano DOPO il 3.
 *
 * Da qui la regola: questo valore si conserva solo per diagnostica, e la
 * riproducibilità vive in una colonna separata che non regredisce mai. Se si
 * filtrasse il profilo pubblico su `status === 3 || 4`, l'arrivo di un 9
 * farebbe sparire il video dalla pagina.
 */
export const StreamStatus = {
  QUEUED: 0,
  PROCESSING: 1,
  ENCODING: 2,
  FINISHED: 3,
  RESOLUTION_FINISHED: 4,
  FAILED: 5,
  PRESIGNED_UPLOAD_STARTED: 6,
  PRESIGNED_UPLOAD_FINISHED: 7,
  PRESIGNED_UPLOAD_FAILED: 8,
  CAPTIONS_GENERATED: 9,
  TITLE_GENERATED: 10,
} as const;

/** Il video è guardabile: basta UNA risoluzione pronta. */
export function isPlayable(status: number): boolean {
  return status === StreamStatus.FINISHED || status === StreamStatus.RESOLUTION_FINISHED;
}

/** L'encoding è fallito: è l'unico caso in cui l'artista ha perso il lavoro fatto. */
export function isFailed(status: number): boolean {
  return status === StreamStatus.FAILED;
}

export type StreamVideo = {
  guid: string;
  title: string;
  status: number;
  /** Durata in secondi. Autorevole solo dopo l'encoding. */
  length: number;
  width: number;
  height: number;
  /** Somma di originale e rendition, non il peso del file caricato. */
  storageSize: number;
  encodeProgress: number;
};

async function streamFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cfg = bunnyStreamConfig();
  return fetch(`${API}/library/${cfg.libraryId}${path}`, {
    ...init,
    headers: {
      AccessKey: cfg.apiKey,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function describeFailure(res: Response, action: string): Promise<never> {
  const body = await res.text().catch(() => "");
  throw new Error(`[bunny/stream] ${action} fallita (${res.status}): ${body.slice(0, 300)}`);
}

function toStreamVideo(raw: Record<string, unknown>): StreamVideo {
  return {
    guid: String(raw.guid ?? ""),
    title: String(raw.title ?? ""),
    status: Number(raw.status ?? 0),
    length: Number(raw.length ?? 0),
    width: Number(raw.width ?? 0),
    height: Number(raw.height ?? 0),
    storageSize: Number(raw.storageSize ?? 0),
    encodeProgress: Number(raw.encodeProgress ?? 0),
  };
}

/**
 * Crea l'oggetto video e restituisce il suo GUID.
 *
 * Il GUID esiste PRIMA che venga trasferito un byte: è il TUS a caricarci
 * sopra. Sostituisce lo `storage_path` del percorso Supabase.
 */
export async function createStreamVideo(input: {
  title: string;
  collectionId?: string;
}): Promise<{ guid: string }> {
  const res = await streamFetch("/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title.slice(0, 200),
      ...(input.collectionId ? { collectionId: input.collectionId } : {}),
    }),
  });
  if (!res.ok) await describeFailure(res, "createVideo");

  const raw = (await res.json()) as Record<string, unknown>;
  const guid = String(raw.guid ?? "");
  if (!guid) throw new Error("[bunny/stream] createVideo: risposta senza guid");
  return { guid };
}

/** Stato autorevole di un video. `null` se non esiste più su Bunny. */
export async function getStreamVideo(guid: string): Promise<StreamVideo | null> {
  const res = await streamFetch(`/videos/${encodeURIComponent(guid)}`);
  if (res.status === 404) return null;
  if (!res.ok) await describeFailure(res, "getVideo");
  return toStreamVideo((await res.json()) as Record<string, unknown>);
}

/**
 * Cancella un video.
 *
 * Un 404 è un successo, non un errore: se il video non c'è più, il risultato
 * voluto è già stato raggiunto. Senza questa distinzione `deleteArtistVideo`
 * resterebbe bloccata per sempre su una riga il cui file era già sparito.
 */
export async function deleteStreamVideo(guid: string): Promise<"deleted" | "not-found"> {
  const res = await streamFetch(`/videos/${encodeURIComponent(guid)}`, { method: "DELETE" });
  if (res.status === 404) return "not-found";
  if (!res.ok) await describeFailure(res, "deleteVideo");
  return "deleted";
}

/**
 * Ventiquattro ore.
 *
 * La firma copre l'INTERO upload, non la sua apertura: 500 MB da uno smartphone
 * in 4G sono minuti, e l'utente può mettere in pausa. Una finestra corta farebbe
 * fallire a metà proprio gli upload lunghi, con un errore opaco lato TUS.
 */
const TUS_TTL_SECONDS = 86_400;

export type TusCredentials = {
  libraryId: string;
  videoId: string;
  signature: string;
  expire: number;
  endpoint: string;
};

/**
 * Credenziali per l'upload TUS dal browser.
 *
 * ⚠️ Al client vanno SOLO questi campi. La API key non lascia mai il server:
 * è ciò che viene firmato, non ciò che viene spedito.
 */
export function signTusUpload(guid: string, ttlSeconds = TUS_TTL_SECONDS): TusCredentials {
  const cfg = bunnyStreamConfig();
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHash("sha256")
    .update(`${cfg.libraryId}${cfg.apiKey}${expire}${guid}`)
    .digest("hex");
  return { libraryId: cfg.libraryId, videoId: guid, signature, expire, endpoint: TUS_ENDPOINT };
}

export type StreamWebhookPayload = {
  VideoLibraryId: number;
  VideoGuid: string;
  Status: number;
};

/**
 * Verifica la firma di un webhook Bunny.
 *
 * ⚠️ `rawBody` deve essere il corpo GREZZO, letto con `await request.text()`
 * prima di qualsiasi parsing. Un `request.json()` seguito da `JSON.stringify`
 * produce byte diversi e la firma non tornerà mai. È lo stesso vincolo del
 * webhook Stripe (app/api/stripe/webhook/route.ts).
 *
 * La chiave è la Read-Only API key della library, che è un segreto DIVERSO
 * dalla API key read/write usata per creare e cancellare i video.
 */
export function verifyStreamWebhook(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !/^[0-9a-f]{64}$/.test(signatureHeader)) return false;

  const expected = createHmac("sha256", bunnyStreamConfig().webhookKey)
    .update(rawBody, "utf8")
    .digest("hex");

  // Le lunghezze sono già uguali per costruzione (64 esadecimali entrambe), ma
  // timingSafeEqual lancia su lunghezze diverse: il controllo sopra è anche
  // quello che glielo garantisce.
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signatureHeader, "utf8"));
}

/**
 * NOTA — `fetchStreamVideoFromUrl` non è qui di proposito.
 *
 * Serve solo alla migrazione del pregresso (Fase 6), che è un'operazione
 * separata e da autorizzare a parte, e la forma esatta dell'endpoint di fetch
 * da URL remoto non è documentata in modo univoco sui doc pubblici Bunny.
 * Si aggiunge quando servirà, dopo averla verificata con una chiamata reale:
 * meglio assente che indovinata.
 */
