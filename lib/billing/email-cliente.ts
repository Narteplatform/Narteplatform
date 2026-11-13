import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";

/**
 * Dopo un cambio email confermato: il customer Stripe dell'account (se c'è)
 * prende il nuovo indirizzo, così ricevute e avvisi di pagamento non
 * continuano ad arrivare a quello vecchio.
 *
 * Best effort, mai lancia. Scrive solo l'email di QUEL customer, e solo se la
 * lettura del collegamento account → customer è riuscita.
 */
export async function allineaEmailCliente(userId: string, email: string): Promise<void> {
  try {
    if (!isStripeConfigured()) return;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      logger.error("billing", "email cliente: collegamento non leggibile:", error.message);
      return;
    }
    const customerId = data?.stripe_customer_id;
    if (!customerId) return;

    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || customer.email === email) return;
    await stripe.customers.update(customerId, { email });
  } catch (e) {
    logger.error("billing", "email cliente non aggiornata su Stripe:", e instanceof Error ? e.message : String(e));
  }
}
