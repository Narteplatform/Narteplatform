/**
 * PUT di un file con avanzamento reale, via XMLHttpRequest.
 *
 * Perché non `fetch`: non espone il progresso dell'UPLOAD. Servirebbe un
 * ReadableStream come request body con `duplex: "half"`, che Safari e Firefox
 * non supportano. L'unica via cross-browser per `xhr.upload.onprogress` è
 * XMLHttpRequest.
 *
 * Due destinazioni, due formati di richiesta diversi, la stessa macchina:
 *   - Supabase Storage vuole un multipart che replica storage-js;
 *   - Bunny Storage (PUT presigned S3) vuole il file come binario grezzo.
 */

export type UploadProgress = { loaded: number; total: number; pct: number };

export class UploadAbortedError extends Error {
  constructor() {
    super("Caricamento annullato");
    this.name = "UploadAbortedError";
  }
}

type XhrPutInput = {
  url: string;
  body: XMLHttpRequestBodyInit;
  headers?: Record<string, string>;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
  parseError: (responseText: string, status: number) => string;
};

function xhrPut({ url, body, headers, onProgress, signal, parseError }: XhrPutInput): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadAbortedError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    // Un timeout su un file grande sarebbe fatale: 0 = nessun timeout.
    xhr.timeout = 0;
    for (const [name, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }

    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort);
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        pct: Math.round((e.loaded / e.total) * 100),
      });
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(parseError(xhr.responseText, xhr.status)));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Connessione interrotta durante il caricamento."));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new UploadAbortedError());
    };

    xhr.send(body);
  });
}

/**
 * Supabase Storage, su signed upload URL.
 *
 * Il formato replica storage-js 2.105.1 (uploadToSignedUrl): PUT sul signedUrl,
 * che porta già il token in query string, con body multipart che contiene
 * `cacheControl` e il file sotto il campo di nome vuoto.
 */
export function putWithProgress(input: {
  signedUrl: string;
  file: File;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", input.file);

  return xhrPut({
    url: input.signedUrl,
    body,
    // Nessun Content-Type manuale: con un FormData il browser deve generare da
    // sé il boundary del multipart.
    headers: { "x-upsert": "false" },
    onProgress: input.onProgress,
    signal: input.signal,
    parseError: parseStorageError,
  });
}

/**
 * Bunny Storage, su URL presigned S3.
 *
 * ⚠️ Il `Content-Type` inviato deve coincidere ESATTAMENTE con quello che il
 * server ha firmato, o Bunny risponde 403. Per questo si imposta a mano invece
 * di lasciarlo dedurre dal Blob: il tipo di un File può differire da quello
 * dichiarato al momento della firma.
 */
export function putPresignedWithProgress(input: {
  uploadUrl: string;
  file: File;
  headers: Record<string, string>;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return xhrPut({
    url: input.uploadUrl,
    body: input.file,
    headers: input.headers,
    onProgress: input.onProgress,
    signal: input.signal,
    parseError: parseS3Error,
  });
}

function parseStorageError(responseText: string, status: number): string {
  try {
    const parsed = JSON.parse(responseText) as { message?: string; error?: string };
    const raw = parsed.message ?? parsed.error;
    if (raw) {
      // Il messaggio di Supabase sul limite di dimensione è in inglese e cita il
      // limite del progetto: tradurlo evita di mostrare gergo all'artista.
      if (/exceeded the maximum allowed size|payload too large/i.test(raw)) {
        return "Il file supera il limite di dimensione consentito dal server.";
      }
      if (/mime type .* is not supported/i.test(raw)) {
        return "Formato non supportato dal server.";
      }
      return raw;
    }
  } catch {
    // corpo non JSON: si ricade sul messaggio generico
  }
  if (status === 413) return "Il file è troppo grande per il server.";
  return `Caricamento fallito (errore ${status}).`;
}

/**
 * L'API S3 risponde in XML, non in JSON: un JSON.parse fallirebbe sempre e
 * mostrerebbe il messaggio generico anche quando la causa è nota.
 */
function parseS3Error(responseText: string, status: number): string {
  const code = responseText.match(/<Code>([^<]+)<\/Code>/)?.[1];
  if (code === "SignatureDoesNotMatch" || status === 403) {
    return "Il permesso di caricamento è scaduto. Riprova.";
  }
  if (code === "NoSuchBucket") {
    return "Archivio non raggiungibile. Riprova fra poco.";
  }
  if (status === 413) return "Il file è troppo grande.";
  return code
    ? `Caricamento fallito (${code}).`
    : `Caricamento fallito (errore ${status}).`;
}
