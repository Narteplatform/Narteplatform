import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { resolvePrice } from "@/lib/stripe/prices";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { BillingInterval, PaidTier } from "@/lib/billing/plans";

/**
 * Scrittura del ledger `subscriptions` a partire dallo stato REALE di Stripe.
 *
 * È l'unica funzione che scrive il ledger: la usano il webhook, il cron di
 * riconciliazione (/api/cron/abbonamenti) e il ritorno dal checkout. Avere un
 * solo scrittore significa che le tre strade non possono divergere.
 *
 * Non tocca mai `artists`: i trigger di 0042/0043 propagano il tier ai profili
 * dell'account e ricalcolano le sospensioni.
 */

export const STATI_VIVI = ["trialing", "active", "past_due"] as const;

export function statoVivo(status: string | null | undefined): boolean {
  return (STATI_VIVI as readonly string[]).includes(status ?? "");
}

type SubRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  tier: PaidTier;
  billing_interval: BillingInterval;
  status: Stripe.Subscription.Status;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  stripe_updated_at: string;
};

export type EsitoSync =
  | {
      esito: "ok";
      userId: string;
      tier: PaidTier;
      interval: BillingInterval;
      status: Stripe.Subscription.Status;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      sub: Stripe.Subscription;
    }
  /** Su Stripe la subscription non esiste (404 / resource_missing). */
  | { esito: "mancante"; subscriptionId: string }
  /** Price non riconosciuto: nessuna scrittura, mai un tier inventato. */
  | { esito: "prezzo_sconosciuto"; priceId: string; sub: Stripe.Subscription }
  /** L'account non esiste più (FK verso auth.users): errore non ritentabile. */
  | { esito: "utente_inesistente"; userId: string; sub: Stripe.Subscription };

const iso = (unix: number | null | undefined): string | null =>
  typeof unix === "number" ? new Date(unix * 1000).toISOString() : null;

function customerIdOf(c: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/** Violazione di chiave esterna: l'utente non c'è più in auth.users. */
function fkUtente(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23503";
}

/** user_id dal customer Stripe, via billing_customers. Errore di lettura = eccezione. */
export async function utenteDaCustomer(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(`lettura billing_customers fallita: ${error.message}`);
  return data?.user_id ?? null;
}

/**
 * user_id della subscription: metadata della subscription, poi i candidati del
 * chiamante (es. client_reference_id della sessione di checkout, l'utente della
 * riga di ledger), poi billing_customers.
 */
async function resolveUserId(sub: Stripe.Subscription, candidati: string[]): Promise<string | null> {
  const fromSub = sub.metadata?.user_id;
  if (fromSub) return fromSub;
  const primo = candidati.find((c) => typeof c === "string" && c.length > 0);
  if (primo) return primo;
  const customerId = customerIdOf(sub.customer);
  if (!customerId) return null;
  return utenteDaCustomer(customerId);
}

/**
 * Scrive nel ledger lo stato della subscription. Solleva per gli errori
 * ritentabili (lettura fallita, upsert fallito per motivi diversi dalla FK).
 */
export async function upsertSubscription(
  sub: Stripe.Subscription,
  candidatiUtente: string[] = [],
): Promise<EsitoSync> {
  const admin = createAdminClient();

  const userId = await resolveUserId(sub, candidatiUtente);
  if (!userId) throw new Error(`Impossibile risolvere user_id per ${sub.id}`);

  const item = sub.items.data[0];
  const price = item?.price;
  if (!price?.id) throw new Error(`Subscription ${sub.id} senza price`);

  const plan = resolvePrice(price);
  if (!plan) {
    // Price sconosciuto: non è colpa dell'artista, ed è meglio non scrivere
    // nulla che scrivere un tier inventato. Il chiamante avvisa il root.
    logger.error("stripe/sync", "price non mappato, nessuna scrittura", { subscription: sub.id, price: price.id });
    return { esito: "prezzo_sconosciuto", priceId: price.id, sub };
  }
  if (plan.via !== "env") {
    logger.warn("stripe/sync", `price ${price.id} riconosciuto via ${plan.via}: aggiornare le env STRIPE_PRICE_*`);
  }

  const customerId = customerIdOf(sub.customer);
  if (!customerId) throw new Error(`Subscription ${sub.id} senza customer`);

  // Ancoraggio del customer: sopravvive alla disdetta, così un riabbonamento
  // non genera una seconda anagrafica con le fatture divise.
  const { error: bcErr } = await admin
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
  if (bcErr) {
    if (fkUtente(bcErr)) return { esito: "utente_inesistente", userId, sub };
    // Non bloccante, come prima: il ledger conta di più dell'ancoraggio.
    logger.warn("stripe/sync", `billing_customers non aggiornato per ${sub.id}:`, bcErr.message);
  }

  const row: SubRow = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: price.id,
    tier: plan.tier,
    billing_interval: plan.interval,
    status: sub.status,
    current_period_start: iso(item?.current_period_start),
    current_period_end: iso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: iso(sub.canceled_at),
    trial_end: iso(sub.trial_end),
    stripe_updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) {
    if (fkUtente(error)) return { esito: "utente_inesistente", userId, sub };
    throw new Error(`Upsert subscription fallito: ${error.message}`);
  }

  return {
    esito: "ok",
    userId,
    tier: plan.tier,
    interval: plan.interval,
    status: sub.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    sub,
  };
}

/** 404 / resource_missing di Stripe: errore NON ritentabile. */
export function risorsaMancante(e: unknown): boolean {
  const err = e as { statusCode?: number; code?: string } | null;
  return err?.statusCode === 404 || err?.code === "resource_missing";
}

/**
 * Rilegge la subscription da Stripe e la scrive nel ledger.
 *
 * Non ci si fida mai del payload di un evento: gli eventi arrivano fuori
 * ordine, e rileggendo si persiste sempre l'ultimo stato reale.
 */
export async function sincronizzaDaStripe(subscriptionId: string, candidatiUtente: string[] = []): Promise<EsitoSync> {
  let sub: Stripe.Subscription;
  try {
    sub = await getStripe().subscriptions.retrieve(subscriptionId);
  } catch (e) {
    if (risorsaMancante(e)) return { esito: "mancante", subscriptionId };
    throw e; // rete o 5xx di Stripe: si ritenta
  }
  return upsertSubscription(sub, candidatiUtente);
}
