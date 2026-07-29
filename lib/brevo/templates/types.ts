/**
 * Tipi del manifest dei template, in un modulo a parte.
 *
 * Sta separato da `index.ts` per non creare un ciclo: `index.ts` importa i
 * file di famiglia, e i file di famiglia hanno bisogno di `defineTemplate`.
 * Se il tipo vivesse in `index.ts` i due si importerebbero a vicenda.
 */

import type { EmailKey, EmailParamsMap } from "../registry.ts";

export interface TemplateDef<K extends EmailKey = EmailKey> {
  key: K;
  /** Nome del template dentro Brevo. */
  name: string;
  /** Oggetto dell'email. Può contenere `{{params.x}}`. */
  subject: string;
  /** HTML completo, con i placeholder Brevo ancora dentro. */
  html: string;
  /**
   * Valori di esempio: alimentano la preview e, soprattutto, la validazione.
   * Essendo tipizzati su `EmailParamsMap`, elencano esattamente i parametri
   * ammessi per quella chiave; `brevo-sync` blocca il push se nell'HTML
   * compare un `{{params.x}}` che qui non esiste.
   */
  sample: EmailParamsMap[K];
}

/** Unione discriminata: ogni voce resta legata al proprio tipo di params. */
export type AnyTemplateDef = { [K in EmailKey]: TemplateDef<K> }[EmailKey];

/** Aiuta l'inferenza: senza, il `sample` verrebbe allargato all'unione. */
export function defineTemplate<K extends EmailKey>(def: TemplateDef<K>): TemplateDef<K> {
  return def;
}
