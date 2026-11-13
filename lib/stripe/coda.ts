import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { funzioneAssente, rpcSenzaTipi } from "@/lib/billing/rpc";

/**
 * Registro degli eventi Stripe (`stripe_webhook_events`): presa in carico,
 * chiusura, errore. Condiviso fra il webhook e il cron di riconciliazione.
 *
 * PRESA IN CARICO ATOMICA (0082). Stripe consegna «almeno una volta»: due
 * consegne dello stesso evento possono arrivare insieme. `stripe_evento_prendi`
 * è un UPDATE condizionale: vince una sola richiesta, l'altra risponde 200 senza
 * eseguire (niente email doppie). Se la vincitrice muore a metà, il lease
 * scade e un retry di Stripe, o il cron, riprende l'evento.
 *
 * Prima della 0082 la funzione non esiste: si torna al comportamento di prima
 * (insert come «visto», esecuzione se processed_at è null).
 */

/** Secondi di lease: più della durata massima di un'elaborazione. */
const LEASE_SECONDI = 180;

export type PresaInCarico = "presa" | "occupata" | "senza_lease" | "errore";

export async function prendiEvento(id: string): Promise<PresaInCarico> {
  const { data, error } = await rpcSenzaTipi<boolean>("stripe_evento_prendi", {
    p_id: id,
    p_lease_secondi: LEASE_SECONDI,
  });
  if (error) {
    if (funzioneAssente(error)) return "senza_lease";
    logger.error("stripe/coda", "presa in carico fallita:", error.message);
    return "errore";
  }
  return data === true ? "presa" : "occupata";
}

/** L'evento è già stato elaborato? `null` = lettura fallita. */
export async function eventoElaborato(id: string): Promise<boolean | null> {
  const { data, error } = await createAdminClient()
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logger.error("stripe/coda", "lettura evento fallita:", error.message);
    return null;
  }
  return Boolean(data?.processed_at);
}

/**
 * Chiude l'evento: elaborato, oppure chiuso con una nota per un esito non
 * ritentabile (subscription inesistente, price sconosciuto, account cancellato).
 */
export async function chiudiEvento(id: string, nota: string | null): Promise<void> {
  const { error } = await createAdminClient()
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString(), error: nota })
    .eq("id", id);
  if (error) logger.error("stripe/coda", `evento ${id} non chiuso:`, error.message);
}

/** Errore ritentabile: si annota e si libera il lease per il prossimo tentativo. */
export async function segnaErroreEvento(id: string, messaggio: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").update({ error: messaggio.slice(0, 2000) }).eq("id", id);
  if (error) logger.error("stripe/coda", `errore dell'evento ${id} non annotato:`, error.message);
  const { error: relErr } = await rpcSenzaTipi<null>("stripe_evento_rilascia", { p_id: id });
  if (relErr && !funzioneAssente(relErr)) logger.warn("stripe/coda", "lease non rilasciato:", relErr.message);
}
