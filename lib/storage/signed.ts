import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * URL firmati per i bucket privati.
 *
 * Due bucket contengono roba che non deve stare su un indirizzo pubblico:
 * gli allegati delle trattative in chat e i video delle candidature, che sono
 * dati personali di chi si candida. Da quando sono privati, l'indirizzo di un
 * file va firmato: la firma scade, quindi un link copiato e incollato altrove
 * smette di funzionare da solo.
 *
 * CONVIVENZA CON IL PREGRESSO. In colonna può esserci l'una o l'altra cosa:
 * - un percorso relativo (`<cartella>/<file>`), che è ciò che si salva adesso;
 * - un URL assoluto `https://…`, che è ciò che si salvava prima.
 * Il secondo caso si lascia passare com'è. Oggi non esiste nemmeno una riga di
 * quel tipo — i due bucket erano vuoti quando sono stati chiusi — ma il costo
 * di reggere entrambi i formati è una riga, e il costo di sbagliarsi è un
 * allegato che non si apre più.
 */

/** Quanto vive un link firmato. Un'ora basta a guardare un video e a scaricare un file. */
const DURATA_SECONDI = 60 * 60;

export type BucketPrivato = "chat-attachments" | "application-videos";

/** È già un indirizzo completo, o un percorso da firmare? */
export function isUrlAssoluto(valore: string): boolean {
  return /^https?:\/\//i.test(valore);
}

/**
 * Trasforma il valore salvato in colonna in un indirizzo apribile dal browser.
 * Ritorna `null` se la firma non riesce: meglio non mostrare l'allegato che
 * mostrare un riquadro rotto.
 */
export async function resolveMediaUrl(
  bucket: BucketPrivato,
  valore: string | null | undefined
): Promise<string | null> {
  if (!valore) return null;
  if (isUrlAssoluto(valore)) return valore;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(valore, DURATA_SECONDI);

  if (error || !data?.signedUrl) {
    logger.error("[storage/signed] firma non riuscita", {
      bucket,
      path: valore,
      error: error?.message,
    });
    return null;
  }
  return data.signedUrl;
}

/**
 * Versione per gli elenchi: firma più percorsi in parallelo e restituisce una
 * mappa valore-salvato → indirizzo firmato. Serve a non fare una chiamata per
 * riga dentro un ciclo, che su una conversazione lunga si sentirebbe.
 */
export async function resolveMediaUrls(
  bucket: BucketPrivato,
  valori: readonly (string | null | undefined)[]
): Promise<Map<string, string>> {
  const daFirmare = [
    ...new Set(valori.filter((v): v is string => Boolean(v) && !isUrlAssoluto(v as string))),
  ];
  const mappa = new Map<string, string>();
  if (daFirmare.length === 0) return mappa;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrls(daFirmare, DURATA_SECONDI);

  if (error || !data) {
    logger.error("[storage/signed] firma multipla non riuscita", {
      bucket,
      quanti: daFirmare.length,
      error: error?.message,
    });
    return mappa;
  }

  for (const riga of data) {
    if (riga.signedUrl && riga.path) mappa.set(riga.path, riga.signedUrl);
  }
  return mappa;
}
