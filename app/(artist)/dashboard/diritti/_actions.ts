"use server";

import { createClient } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/legal/consents";

/**
 * Registra la dichiarazione «ho i diritti sui contenuti che pubblico» per la
 * versione legale in vigore.
 *
 * Passa da `recordConsent`, che usa il client con i cookie (MAI l'admin client:
 * `record_consent` ricava l'identità da `auth.uid()`) e scrive una riga nello
 * storico `user_consents`. Non cancella niente.
 */
export async function dichiaraDirittiContenuti(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const esito = await recordConsent("diritti_contenuti", true);
  return esito.ok ? { ok: true } : { ok: false, error: esito.error };
}
