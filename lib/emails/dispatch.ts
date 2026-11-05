import type { ReactElement } from "react";

import { sendTransactional } from "@/lib/brevo/send";
import type { EmailKey, EmailParamsMap } from "@/lib/brevo/registry";
import type { Json } from "@/lib/supabase/types";

/**
 * Unico punto di uscita delle email transazionali: SOLO Brevo.
 *
 * Dal 05/11/2026 Brevo è l'unico provider (decisione del cliente, parere legale
 * sui fornitori). Prima c'era Resend come rete di sicurezza e una lista di
 * chiavi abilitate (BREVO_ENABLED_KEYS): entrambe non esistono più. Ogni chiave
 * ha un template Brevo; gli id hanno un valore predefinito nel registro, così
 * una variabile mancante su Vercel non fa sparire un'email.
 *
 * Se Brevo non invia, `sendTransactional` scrive comunque la riga `failed` o
 * `skipped` in email_log: il mancato invio resta visibile in /admin/email.
 */

export type DispatchResult =
  | { ok: true; provider: "brevo"; fallback: false }
  | { ok: false; provider: "brevo"; skipped: boolean };

export interface DispatchOpts<K extends EmailKey> {
  key: K;
  to: string | string[];
  params: EmailParamsMap[K];
  replyTo?: string;
  meta?: Json;
  /**
   * @deprecated Residuo del ripiego su Resend. Se ne usa solo `subject`, come
   * oggetto leggibile nel registro; il componente React non viene inviato.
   */
  fallback?: {
    subject: string;
    react?: ReactElement;
    template?: string;
  };
  /** Oggetto per il registro: senza, /admin/email mostrerebbe la chiave. */
  subjectPreview?: string;
}

export async function dispatchEmail<K extends EmailKey>(opts: DispatchOpts<K>): Promise<DispatchResult> {
  const result = await sendTransactional({
    key: opts.key,
    to: opts.to,
    params: opts.params,
    replyTo: opts.replyTo,
    subjectPreview: opts.subjectPreview ?? opts.fallback?.subject,
    meta: opts.meta,
  });
  if (result.ok) return { ok: true, provider: "brevo", fallback: false };

  const reason = "skipped" in result && result.skipped ? result.reason : result.error;
  console.warn(`[dispatch] "${opts.key}" non inviata da Brevo: ${reason}`);
  return { ok: false, provider: "brevo", skipped: "skipped" in result && result.skipped === true };
}
