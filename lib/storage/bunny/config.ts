import "server-only";

/**
 * Lettura e validazione delle variabili d'ambiente di bunny.net.
 *
 * È l'UNICO punto del progetto che legge `process.env.BUNNY_*`. Chi ha bisogno
 * di una credenziale la chiede qui e la riceve già validata: così un refuso nel
 * nome di una variabile si manifesta in un posto solo.
 *
 * ⚠️ La validazione avviene alla CHIAMATA, non all'import. Un throw a
 * import-time romperebbe `next build` su un ambiente (preview, CI) in cui le
 * chiavi non sono configurate, anche per le pagine che con Bunny non c'entrano
 * niente. Stesso schema di `createAdminClient()` in lib/supabase/server.ts.
 *
 * ⚠️ SONO QUATTRO SEGRETI DISTINTI, ed è l'errore più facile da fare:
 *   - API key dell'ACCOUNT Bunny  → non serve a questo progetto, non va qui;
 *   - API key della LIBRARY Stream (read/write) → BUNNY_STREAM_API_KEY,
 *     crea e cancella i video e firma gli upload TUS;
 *   - Read-Only key della LIBRARY → BUNNY_STREAM_WEBHOOK_KEY, serve SOLO a
 *     verificare l'HMAC dei webhook;
 *   - password della STORAGE ZONE → BUNNY_STORAGE_PASSWORD, è insieme
 *     l'AccessKey dell'API nativa e la Secret Access Key dell'API S3.
 * Scambiarne due produce un 401 che sembra un bug del codice.
 */

export type BunnyStreamConfig = {
  libraryId: string;
  apiKey: string;
  webhookKey: string;
};

export type BunnyStorageConfig = {
  /** Nome della storage zone. È anche l'Access Key ID per l'API S3. */
  zone: string;
  /** Password della zone. È anche la Secret Access Key per l'API S3. */
  password: string;
  /** Host dell'API HTTP nativa, es. storage.bunnycdn.com (Francoforte). */
  host: string;
  /** Host dell'API S3-compatibile, es. de-s3.storage.bunnycdn.com. */
  s3Host: string;
  /** Region usata nello scope della firma SigV4, es. "de". */
  s3Region: string;
};

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`[bunny] variabile d'ambiente mancante: ${name}`);
  }
  return trimmed;
}

export function bunnyStreamConfig(): BunnyStreamConfig {
  return {
    libraryId: required("BUNNY_STREAM_LIBRARY_ID", process.env.BUNNY_STREAM_LIBRARY_ID),
    apiKey: required("BUNNY_STREAM_API_KEY", process.env.BUNNY_STREAM_API_KEY),
    webhookKey: required("BUNNY_STREAM_WEBHOOK_KEY", process.env.BUNNY_STREAM_WEBHOOK_KEY),
  };
}

export function bunnyStorageConfig(): BunnyStorageConfig {
  return {
    zone: required("BUNNY_STORAGE_ZONE", process.env.BUNNY_STORAGE_ZONE),
    password: required("BUNNY_STORAGE_PASSWORD", process.env.BUNNY_STORAGE_PASSWORD),
    host: required("BUNNY_STORAGE_HOST", process.env.BUNNY_STORAGE_HOST),
    s3Host: required("BUNNY_STORAGE_S3_HOST", process.env.BUNNY_STORAGE_S3_HOST),
    s3Region: required("BUNNY_STORAGE_S3_REGION", process.env.BUNNY_STORAGE_S3_REGION),
  };
}

/**
 * Interruttore di cutover.
 *
 * Spento (assente o "0"): ogni percorso di upload si comporta ESATTAMENTE come
 * prima dell'integrazione, e scrive su Supabase Storage. Acceso ("1"): i NUOVI
 * caricamenti vanno su Bunny.
 *
 * In entrambi i casi i contenuti già caricati continuano a funzionare: gli URL
 * sono assoluti in colonna, quindi i due mondi convivono senza escludersi.
 *
 * È il principale strumento di controllo del rischio di questa integrazione:
 * il ritorno indietro è questa variabile più un redeploy, non un revert di
 * codice. Stesso schema di BREVO_ENABLED_KEYS in lib/emails/dispatch.ts.
 *
 * Il client non decide mai la destinazione: la sceglie il server e la comunica
 * nella risposta della rotta di firma.
 */
export function bunnyUploadsEnabled(): boolean {
  // Accetta più di "1" di proposito. Chi configura una variabile d'ambiente su
  // un pannello scrive naturalmente "true" o "on", e il modo in cui questo
  // sbaglia è il peggiore: nessun errore, nessun log, semplicemente i
  // caricamenti continuano ad andare dove andavano prima e ci si chiede perché.
  // Qualunque altro valore — vuoto, "0", "false" — resta spento.
  const raw = process.env.BUNNY_UPLOADS_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes" || raw === "si";
}
