import "server-only";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { convertiGiorniInCredito, registraPrimoPagamento } from "@/lib/inviti/ciclo";

/**
 * Agganci del webhook Stripe al programma «Invita un artista», su `invoice.paid`:
 *   - prima fattura di un abbonamento nuovo → i giorni di Pro dei premi non
 *     ancora goduti diventano credito;
 *   - prima fattura con importo > 0 di un account invitato → invito in attesa.
 * Non lancia mai: il ledger degli abbonamenti è già scritto e un errore qui non
 * deve far ritentare Stripe.
 */
export async function invitiDaFatturaPagata(invoice: Stripe.Invoice, userId: string): Promise<void> {
  try {
    if (invoice.billing_reason === "subscription_create") {
      await convertiGiorniInCredito(userId);
    }
    if (!invoice.id) return;
    const pagataIl = invoice.status_transitions?.paid_at;
    await registraPrimoPagamento({
      userId,
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid ?? 0,
      paidAt: typeof pagataIl === "number" ? new Date(pagataIl * 1000) : new Date(),
    });
  } catch (e) {
    logger.error("inviti", "webhook:", e instanceof Error ? e.message : String(e));
  }
}
