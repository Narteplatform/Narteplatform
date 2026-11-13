import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { funzioneAssente, rpcSenzaTipi } from "@/lib/billing/rpc";

/**
 * Shooting fotografico del piano Max annuale (decisione del 05/11/2026).
 *
 *  - 1 ora presso Hangarram (Napoli), 5 foto;
 *  - uno per ACCOUNT (vincolo unico in `photo_shoots`, 0077), su un solo
 *    profilo artista scelto dall'account;
 *  - solo nel primo anno di abbonamento;
 *  - richiedibile solo dal 15° giorno: così non cade mai nei 14 giorni di
 *    recesso e non serve detrarne il valore dal rimborso.
 *
 * Il «primo anno» si conta dal primo momento in cui l'account ha avuto un Max
 * annuale: con la 0082 è `piano_corrente_dal` (un Pro mensile passato al Max
 * annuale dal Portal resta la stessa riga, e `created_at` è la data del Pro).
 * Prima della 0082 si ripiega su `subscriptions.created_at`.
 */

export const SHOOTING = { durata: "1 ora", luogo: "Hangarram (Napoli)", foto: 5 } as const;
export const GIORNO_MINIMO_SHOOTING = 15;
const GIORNO_MS = 86_400_000;

export type StatoShooting =
  | { stato: "non_incluso" }
  | { stato: "troppo_presto"; dal: string }
  | { stato: "scaduto" }
  | { stato: "richiedibile"; entro: string; subscriptionId: string }
  | {
      stato: "richiesto";
      artistName: string;
      requestedAt: string;
      scheduledAt: string | null;
      doneAt: string | null;
    }
  | { stato: "non_disponibile" }
  | { stato: "errore" };

function tabellaMancante(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function statoShooting(userId: string): Promise<StatoShooting> {
  const admin = createAdminClient();

  // Una richiesta già fatta vale anche se l'abbonamento nel frattempo è cambiato.
  const { data: richiesta, error: rErr } = await admin
    .from("photo_shoots")
    .select("artist_name, requested_at, scheduled_at, done_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (rErr) {
    if (tabellaMancante(rErr)) return { stato: "non_disponibile" };
    logger.error("shooting", "richiesta non letta:", rErr.message);
    return { stato: "errore" };
  }
  if (richiesta) {
    return {
      stato: "richiesto",
      artistName: richiesta.artist_name,
      requestedAt: richiesta.requested_at,
      scheduledAt: richiesta.scheduled_at,
      doneAt: richiesta.done_at,
    };
  }

  const { data: subs, error: sErr } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, tier, billing_interval, status, created_at")
    .eq("user_id", userId)
    .eq("tier", "max")
    .eq("billing_interval", "year")
    .order("created_at", { ascending: true });
  if (sErr) {
    logger.error("shooting", "abbonamenti non letti:", sErr.message);
    return { stato: "errore" };
  }
  const tutte = subs ?? [];
  const attiva = tutte.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due");
  if (!attiva) return { stato: "non_incluso" };

  let inizio = new Date(tutte[0].created_at).getTime();
  const { data: dalPiano, error: dalErr } = await rpcSenzaTipi<string>("abbonamento_shooting_dal", { p_user_id: userId });
  if (dalErr) {
    if (!funzioneAssente(dalErr)) {
      logger.error("shooting", "inizio del Max annuale non letto:", dalErr.message);
      return { stato: "errore" };
    }
  } else if (dalPiano) {
    const t = new Date(dalPiano).getTime();
    if (Number.isFinite(t)) inizio = t;
  }
  const dal = inizio + (GIORNO_MINIMO_SHOOTING - 1) * GIORNO_MS;
  const entro = inizio + 365 * GIORNO_MS;
  const ora = Date.now();
  if (ora < dal) return { stato: "troppo_presto", dal: new Date(dal).toISOString() };
  if (ora >= entro) return { stato: "scaduto" };
  return { stato: "richiedibile", entro: new Date(entro).toISOString(), subscriptionId: attiva.stripe_subscription_id };
}
