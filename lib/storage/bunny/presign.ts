import "server-only";
import { bunnyStorageConfig } from "./config";
import { presignS3Url } from "./sigv4";

/**
 * URL firmato per una PUT diretta dal browser su Bunny Storage.
 *
 * PERCHÉ ESISTE QUESTO PERCORSO
 * Il body di una funzione Vercel si ferma a 4,5 MB, ed è un limite di
 * piattaforma. Una traccia audio arriva a 25 MB: non può passare dal server, in
 * nessun modo. Oggi infatti non ci passa — `/api/upload` dichiara 25 MB ma
 * qualunque file sopra 4,5 MB riceve un 413 opaco prima ancora di raggiungere
 * il nostro codice. Questa rotta firma e non trasporta, esattamente come fa già
 * `/api/upload/video` con i signed URL di Supabase.
 *
 * L'INVARIANTE DI SICUREZZA
 * La chiave la sceglie il server (lib/storage/bunny/paths.ts). L'URL firmato
 * autorizza la scrittura su QUEL SOLO percorso e su nient'altro: il client non
 * può sovrascrivere un file che non è suo. È l'equivalente del prefisso
 * `user.id` usato oggi sui bucket Supabase.
 *
 * Si firma anche `content-type`, non solo `host`: lega il tipo dichiarato alla
 * firma, così il browser non può caricare con un tipo diverso da quello
 * autorizzato. Il corpo invece NON è firmato (UNSIGNED-PAYLOAD): firmarlo
 * obbligherebbe il browser a leggere l'intero file per calcolarne lo SHA-256
 * prima di poter cominciare. La difesa contro byte arbitrari non è la firma, è
 * il fatto che l'estensione — e quindi il tipo con cui il CDN servirà il file —
 * la decide il server, con `nosniff` attivo sulla pull zone.
 */

/**
 * Quindici minuti.
 *
 * Volutamente diverso dalle 24 ore della firma TUS di Stream, e non per
 * distrazione: la firma S3 copre l'APERTURA della connessione, non l'intero
 * trasferimento, quindi una finestra corta non fa fallire gli upload lenti e
 * riduce la finestra in cui l'URL è riutilizzabile.
 */
const DEFAULT_EXPIRES_SECONDS = 900;

export type PresignedUpload = {
  /** URL su cui il browser deve fare la PUT. Contiene già la firma. */
  uploadUrl: string;
  /** Header che il browser DEVE inviare identici, o Bunny risponde 403. */
  headers: Record<string, string>;
  /** Scadenza in millisecondi epoch, per la diagnostica lato client. */
  expiresAt: number;
};

export function presignPut(input: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): PresignedUpload {
  const cfg = bunnyStorageConfig();
  const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS;
  const key = input.key.replace(/^\/+/, "");

  const uploadUrl = presignS3Url({
    method: "PUT",
    host: cfg.s3Host,
    path: `/${cfg.zone}/${key}`,
    accessKeyId: cfg.zone,
    secretAccessKey: cfg.password,
    region: cfg.s3Region,
    expiresInSeconds,
    extraSignedHeaders: { "content-type": input.contentType },
  });

  return {
    uploadUrl,
    headers: { "Content-Type": input.contentType },
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}
