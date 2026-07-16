/**
 * PUT di un file su un signed upload URL di Supabase Storage, con progress reale.
 *
 * Perché non `supabase.storage.uploadToSignedUrl()`: internamente usa `fetch`,
 * che non espone il progress dell'upload (servirebbe un ReadableStream come
 * request body con `duplex: "half"`, non supportato da Safari e Firefox).
 * L'unica via cross-browser per `xhr.upload.onprogress` è XMLHttpRequest.
 *
 * Il formato della richiesta replica quello di storage-js 2.105.1
 * (src/packages/StorageFileApi.ts → uploadToSignedUrl): PUT sul signedUrl, che
 * contiene già il token in query string, con body multipart che porta
 * `cacheControl` e il file sotto il campo di nome vuoto.
 */

export type UploadProgress = { loaded: number; total: number; pct: number };

export class UploadAbortedError extends Error {
  constructor() {
    super("Caricamento annullato");
    this.name = "UploadAbortedError";
  }
}

export function putWithProgress({
  signedUrl,
  file,
  onProgress,
  signal,
}: {
  signedUrl: string;
  file: File;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadAbortedError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);

    // Un timeout su un file grande sarebbe fatale: 0 = nessun timeout.
    xhr.timeout = 0;
    xhr.setRequestHeader("x-upsert", "false");
    // Nessun Content-Type manuale: con un FormData il browser deve generare da
    // sé il boundary del multipart.

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
      reject(new Error(parseStorageError(xhr.responseText, xhr.status)));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Connessione interrotta durante il caricamento."));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new UploadAbortedError());
    };

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
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
        return "Il video supera il limite di dimensione consentito dal server.";
      }
      if (/mime type .* is not supported/i.test(raw)) {
        return "Formato video non supportato dal server.";
      }
      return raw;
    }
  } catch {
    // corpo non JSON: si ricade sul messaggio generico
  }
  if (status === 413) return "Il video è troppo grande per il server.";
  return `Caricamento fallito (errore ${status}).`;
}
