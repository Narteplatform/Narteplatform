import "server-only";
import { getStripe } from "@/lib/stripe/client";

/**
 * Credito sul saldo del cliente Stripe: si scala da solo dalle fatture
 * successive (mensili o annuali), senza toccare l'abbonamento.
 *
 * Doppia protezione contro i doppioni, perché è denaro:
 *   1. prima di scrivere si cerca fra i movimenti recenti del cliente uno con
 *      la stessa `chiave` nei metadata (copre i ritentativi oltre le 24 ore
 *      di validità della chiave di idempotenza);
 *   2. la scrittura usa comunque la chiave di idempotenza.
 */
export async function accreditaSuStripe(input: {
  customerId: string;
  cent: number;
  descrizione: string;
  chiave: string;
  metadata: Record<string, string>;
}): Promise<string> {
  if (!Number.isInteger(input.cent) || input.cent <= 0) {
    throw new Error(`importo del credito non valido: ${input.cent}`);
  }
  const stripe = getStripe();

  const recenti = await stripe.customers.listBalanceTransactions(input.customerId, { limit: 100 });
  const gia = recenti.data.find((t) => t.metadata?.chiave === input.chiave);
  if (gia) return gia.id;

  const txn = await stripe.customers.createBalanceTransaction(
    input.customerId,
    {
      // Negativo = credito a favore del cliente.
      amount: -input.cent,
      currency: "eur",
      description: input.descrizione,
      metadata: { ...input.metadata, chiave: input.chiave },
    },
    { idempotencyKey: input.chiave },
  );
  return txn.id;
}
