"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { allowByIp, checkRateLimit, emailFingerprint } from "@/lib/security/rate-limit";
import { LIMITI_AUTH } from "@/lib/auth/limiti";
import { percorsoSicuro } from "@/lib/auth/percorso";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

type Esito = { ok: true } | { ok: false; error: string };

/**
 * Nuovo invio dell'email di conferma della registrazione (pulsante sotto
 * l'errore «Email not confirmed» del login).
 *
 * La risposta è la stessa che l'indirizzo esista o no, sia già confermato o
 * no: il pulsante non deve diventare un modo per scoprire chi è iscritto.
 * Freni: per IP e per indirizzo (lib/auth/limiti.ts), oltre a quello di
 * Supabase. Il mailer resta quello di Supabase (SMTP da configurare nel
 * pannello: vedi report).
 */
export async function reinviaEmailConferma(email: string, next?: string | null): Promise<Esito> {
  const parsed = schema.safeParse({ email });
  if (!parsed.success) return { ok: false, error: "Inserisci un indirizzo email valido." };
  const indirizzo = parsed.data.email;

  if (!(await allowByIp(LIMITI_AUTH.reinvioConfermaIp))) {
    return { ok: false, error: "Troppe richieste ravvicinate. Riprova fra un'ora." };
  }
  // Oltre la soglia per indirizzo si tace: stessa risposta del caso riuscito.
  if (!(await checkRateLimit(LIMITI_AUTH.reinvioConfermaEmail, emailFingerprint(indirizzo)))) {
    return { ok: true };
  }

  const destinazione = percorsoSicuro(next ?? null);
  const redirect = `${getSiteUrl()}/auth/confirm${destinazione ? `?next=${encodeURIComponent(destinazione)}` : ""}`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: indirizzo,
      options: { emailRedirectTo: redirect },
    });
    if (error) {
      // Errori di Supabase (freno interno, indirizzo sconosciuto): nel log,
      // non all'utente.
      logger.warn("auth/reinvio-conferma", error.message);
    }
  } catch (e) {
    logger.warn("auth/reinvio-conferma", e instanceof Error ? e.message : String(e));
  }
  return { ok: true };
}
