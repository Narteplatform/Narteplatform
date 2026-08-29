import { createHash, createHmac } from "node:crypto";

/**
 * Firma AWS Signature Version 4 in query string (presigned URL).
 *
 * Funzione PURA: riceve le credenziali come argomenti e non legge mai
 * `process.env`. È quello che la rende verificabile dallo script
 * `scripts/check-bunny.mjs` contro il vettore di prova pubblicato da AWS, senza
 * dover avviare Next.
 *
 * PERCHÉ SCRITTA A MANO E NON `@aws-sdk/s3-request-presigner`
 * La superficie che serve è una sola: un PUT presigned a parte singola, senza
 * multipart, senza listing, senza copy. L'SDK porterebbe una quarantina di
 * pacchetti transitivi dentro ogni funzione serverless che lo importa, in un
 * progetto che oggi non ha nessuna dipendenza AWS e che gira su Vercel, dove il
 * peso del bundle si paga in avvio a freddo.
 *
 * Il punto decisivo però è un altro: una firma sbagliata restituisce
 * `403 SignatureDoesNotMatch` al primo tentativo, PRIMA che venga scritto un
 * byte e PRIMA che esista una riga su Postgres. Non c'è nessun percorso di
 * corruzione silenziosa, e l'argomento abituale a favore di un SDK maturo —
 * «ci sono sottigliezze che non noteresti» — qui non regge: qualunque
 * sottigliezza sbagliata si manifesta al primo `npm run bunny:check`.
 *
 * L'algoritmo è congelato dal 2012: non c'è deriva da inseguire.
 *
 * ⚠️ Usa `node:crypto`, quindi non è importabile da un Client Component. Non è
 * marcata `server-only` solo perché lo script di verifica deve poterla
 * importare fuori da Next; un import sbagliato fallisce comunque a build time.
 */

const ALGORITHM = "AWS4-HMAC-SHA256";

/** S3 non firma il corpo dei presigned URL: sarebbe da leggere tutto prima di partire. */
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

/** Limite di S3, non nostro: 7 giorni. */
export const MAX_PRESIGN_SECONDS = 604_800;

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * Codifica RFC 3986.
 *
 * `encodeURIComponent` è quasi corretta ma lascia scoperti `!'()*`, che RFC 3986
 * considera riservati: senza questa correzione una chiave che contenga uno di
 * quei caratteri produrrebbe una firma valida su una stringa diversa da quella
 * che il server ricostruisce, cioè un 403 inspiegabile.
 */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/** Il separatore `/` non va codificato nella canonical URI di S3. */
function uriEncodePath(path: string): string {
  return path.split("/").map(uriEncode).join("/");
}

function canonicalQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

function amzTimestamps(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export type PresignInput = {
  method: "PUT" | "GET" | "HEAD" | "DELETE";
  host: string;
  /** Percorso non codificato, con lo slash iniziale. Path-style: `/{zone}/{key}`. */
  path: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  expiresInSeconds: number;
  /** Header da firmare oltre a `host`. Il client DEVE inviarli identici. */
  extraSignedHeaders?: Record<string, string>;
  /** Iniettabile per rendere la firma riproducibile nei test. */
  now?: Date;
};

export function presignS3Url(input: PresignInput): string {
  const service = input.service ?? "s3";
  if (input.expiresInSeconds < 1 || input.expiresInSeconds > MAX_PRESIGN_SECONDS) {
    throw new Error(`[sigv4] scadenza fuori intervallo: 1..${MAX_PRESIGN_SECONDS} secondi`);
  }

  const { amzDate, dateStamp } = amzTimestamps(input.now ?? new Date());
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;

  // `host` è sempre firmato; gli altri header arrivano dal chiamante e vanno
  // in minuscolo, che è la forma canonica.
  const headers: Record<string, string> = { host: input.host };
  for (const [name, value] of Object.entries(input.extraSignedHeaders ?? {})) {
    headers[name.toLowerCase()] = value;
  }
  const headerNames = Object.keys(headers).sort();
  const canonicalHeaders = headerNames
    .map((name) => `${name}:${headers[name].trim().replace(/\s+/g, " ")}\n`)
    .join("");
  const signedHeaders = headerNames.join(";");

  const query: Record<string, string> = {
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": `${input.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const cqs = canonicalQueryString(query);
  const encodedPath = uriEncodePath(input.path);

  // L'ordine e i ritorni a capo sono normativi: `canonicalHeaders` finisce già
  // con \n, e il join ne aggiunge un altro producendo la riga vuota richiesta
  // fra gli header e la lista degli header firmati.
  const canonicalRequest = [
    input.method,
    encodedPath,
    cqs,
    canonicalHeaders,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join("\n");

  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${input.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  return `https://${input.host}${encodedPath}?${cqs}&X-Amz-Signature=${signature}`;
}
