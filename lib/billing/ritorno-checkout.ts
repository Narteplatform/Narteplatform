import "server-only";
import { getStripe } from "@/lib/stripe/client";
import { sincronizzaDaStripe, utenteDaCustomer } from "@/lib/stripe/sincronizza";
import { logger } from "@/lib/logger";

/**
 * Ritorno dal checkout di Stripe con `?session_id=cs_...`.
 *
 * Il webhook può arrivare dopo il redirect: invece di mostrare «stiamo
 * attivando il tuo piano» e aspettare, la pagina legge la sessione lato
 * server e sincronizza subito l'abbonamento con la STESSA scrittura del
 * webhook. Idempotente: se il webhook è già passato, riscrive lo stesso stato.
 *
 * Sicurezza: l'id della sessione arriva dall'URL, quindi chiunque potrebbe
 * incollarne uno. Si procede solo se la sessione appartiene all'utente
 * collegato (client_reference_id / metadata / customer) ed è completata.
 */
const FORMATO_SESSIONE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export async function sincronizzaRitornoCheckout(sessionId: string, userId: string): Promise<boolean> {
  if (!FORMATO_SESSIONE.test(sessionId)) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.mode !== "subscription" || session.status !== "complete") return false;

    const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const proprietario =
      session.client_reference_id === userId ||
      session.metadata?.user_id === userId ||
      (customer ? (await utenteDaCustomer(customer)) === userId : false);
    if (!proprietario) {
      logger.warn("billing/checkout", "sessione di checkout di un altro account ignorata");
      return false;
    }

    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subId) return false;

    const sync = await sincronizzaDaStripe(subId, [userId]);
    if (sync.esito !== "ok") {
      // Le anomalie (price sconosciuto, ecc.) le gestisce e le segnala il webhook.
      logger.warn("billing/checkout", `sincronizzazione al ritorno non riuscita: ${sync.esito}`);
      return false;
    }
    if (sync.userId !== userId) {
      logger.error("billing/checkout", "abbonamento con metadata.user_id di un altro account", { subscription: subId });
      return false;
    }
    return true;
  } catch (e) {
    logger.warn("billing/checkout", "ritorno dal checkout:", e instanceof Error ? e.message : String(e));
    return false;
  }
}
