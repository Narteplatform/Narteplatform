"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/client";
import { priceIdFor } from "@/lib/stripe/prices";
import type { BillingInterval, PaidTier } from "@/lib/billing/plans";

/**
 * Checkout e fatturazione.
 *
 * ⚠️  L'abbonamento è dell'ACCOUNT, non del singolo profilo artista (0042): la
 *     chiave è `user.id`. Un account Max paga una volta e i suoi 5 profili
 *     ereditano il piano.
 */

const checkoutSchema = z.object({
  tier: z.enum(["pro", "max"]),
  interval: z.enum(["month", "year"]),
});

async function requireArtistUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "artist" && role !== "superadmin") return null;
  return user;
}

/** Customer Stripe dell'account, creato una volta sola e riusato per sempre. */
async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  const found = (existing as { stripe_customer_id: string } | null)?.stripe_customer_id;
  if (found) return found;

  const customer = await getStripe().customers.create({
    email,
    metadata: { user_id: userId },
  });
  await admin
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: "user_id" });
  return customer.id;
}

async function liveSubscription(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("id, tier, status, stripe_subscription_id")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due"])
    .limit(1);
  return ((data ?? []) as unknown as { tier: string; status: string }[])[0] ?? null;
}

export async function createCheckoutSession(input: {
  tier: PaidTier;
  interval: BillingInterval;
}) {
  const user = await requireArtistUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Piano non valido" };

  // Doppio abbonamento prevenuto ALLA RADICE, non con un unique constraint sul
  // ledger: un vincolo farebbe fallire il webhook (500 in loop) invece di
  // fermare l'utente qui, dove si può spiegare cosa fare. Chi ha già un piano
  // attivo lo cambia dal Portal, che gestisce proration e switch.
  const live = await liveSubscription(user.id);
  if (live) {
    return {
      ok: false as const,
      error: "Hai già un abbonamento attivo. Usa «Gestisci fatturazione» per cambiare piano.",
      redirectToPortal: true as const,
    };
  }

  let url: string;
  try {
    const customer = await getOrCreateCustomer(user.id, user.email ?? undefined);
    const price = priceIdFor(parsed.data.tier, parsed.data.interval);
    const site = getSiteUrl();

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      // client_reference_id + metadata su ENTRAMBI: gli eventi
      // customer.subscription.* non portano la session, quindi senza i metadata
      // sulla subscription il webhook dovrebbe risalire per customer. Ridondanza
      // voluta.
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      locale: "it",
      allow_promotion_codes: true,
      success_url: `${site}/dashboard/abbonamento?checkout=success`,
      cancel_url: `${site}/dashboard/abbonamento?checkout=cancelled`,
    });
    if (!session.url) return { ok: false as const, error: "Stripe non ha restituito un URL" };
    url = session.url;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[abbonamento] createCheckoutSession", message);
    return { ok: false as const, error: "Impossibile avviare il pagamento. Riprova." };
  }

  redirect(url);
}

export async function createBillingPortalSession() {
  const user = await requireArtistUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  let url: string;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customer = (data as { stripe_customer_id: string } | null)?.stripe_customer_id;
    if (!customer) {
      return { ok: false as const, error: "Nessun abbonamento da gestire." };
    }
    // Cambio piano, disdetta, metodo di pagamento e fatture: tutto delegato al
    // Portal. Meno codice nostro, meno superficie su cui sbagliare con i soldi.
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${getSiteUrl()}/dashboard/abbonamento`,
      locale: "it",
    });
    url = session.url;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[abbonamento] createBillingPortalSession", message);
    return { ok: false as const, error: "Impossibile aprire la gestione fatturazione." };
  }

  redirect(url);
}
