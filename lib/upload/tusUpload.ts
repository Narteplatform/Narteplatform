import * as tus from "tus-js-client";
import { UploadAbortedError } from "@/lib/upload/putWithProgress";

/**
 * Caricamento di un video su Bunny Stream con il protocollo TUS.
 *
 * PERCHÉ TUS E NON UNA PUT. Un video da centinaia di MB caricato da uno
 * smartphone in 4G è minuti di trasferimento, e la connessione cade. Con una PUT
 * unica una caduta al 90% significa ricominciare da zero — che è esattamente
 * ciò che succede oggi con `putWithProgress` e `xhr.timeout = 0`. TUS carica a
 * pezzi e riprende da dove si era interrotto, anche dopo aver chiuso e
 * riaperto la pagina.
 *
 * ⚠️ La firma NON contiene la API key: la API key è ciò che viene *firmato*
 * lato server. Al browser arrivano solo guid, libraryId, scadenza e firma.
 */
export async function uploadViaTus(input: {
  file: File;
  endpoint: string;
  libraryId: string;
  videoGuid: string;
  signature: string;
  expire: number;
  title: string;
  contentType: string;
  onProgress?: (pct: number) => void;
  /** Riceve la funzione per annullare: il chiamante decide dove metterla. */
  registerAbort?: (abort: () => void) => void;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(input.file, {
      endpoint: input.endpoint,
      // Un chunk esplicito è ciò che rende la ripresa davvero utile: senza,
      // tus-js-client invia un'unica richiesta e una caduta a 400 MB fa
      // ricominciare da capo.
      chunkSize: 8 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
      headers: {
        AuthorizationSignature: input.signature,
        AuthorizationExpire: String(input.expire),
        VideoId: input.videoGuid,
        LibraryId: input.libraryId,
      },
      metadata: { filetype: input.contentType, title: input.title },
      onError: (e) => reject(e instanceof Error ? e : new Error(String(e))),
      onProgress: (uploaded, total) =>
        input.onProgress?.(total > 0 ? Math.round((uploaded / total) * 100) : 0),
      onSuccess: () => resolve(),
    });

    input.registerAbort?.(() => {
      void upload.abort();
      reject(new UploadAbortedError());
    });

    // Se un tentativo precedente sullo stesso file era rimasto a metà, si
    // riparte da lì invece che dall'inizio.
    void upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}
