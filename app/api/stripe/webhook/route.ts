import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { resolvePriceId } from "@/lib/stripe/prices";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe — unico scrittore del ledger `subscriptions`.
 *
 * Il webhook NON tocca mai `artists`. Scrive il fatto (la subscription) e i
 * trigger di 0042/0043 fanno il resto: propagano il tier a tutti i profili
 * dell'account, ricalcolano quali profili restano pubblici, aggiornano il
 * ranking. È quello che rende questo file corto: un solo upsert.
 */

const HANDLED = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

type SubRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  tier: "pro" | "max";
  billing_interval: "month" | "year";
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  stripe_updated_at: string;
};

const iso = (unix: number | null | undefined): string | null =>
  typeof unix === "number" ? new Date(unix * 1000).toISOString() : null;

/**
 * Estrae l'id della subscription dagli eventi che ne parlano indirettamente
 * (checkout.session, invoice) o direttamente.
 */
function subscriptionIdOf(event: Stripe.Event): string | null {
  const o = event.data.object as Record<string, unknown>;
  if (event.type.startsWith("customer.subscription.")) return (o.id as string) ?? null;
  const sub = o.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return (sub as { id: string }).id;
  return null;
}

/** user_id: dai metadata, con fallback su billing_customers via customer id. */
async function resolveUserId(
  sub: Stripe.Subscription,
  event: Stripe.Event
): Promise<string | null> {
  const fromSub = sub.metadata?.user_id;
  if (fromSub) return fromSub;

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.client_reference_id) return s.client_reference_id;
    if (s.metadata?.user_id) return s.metadata.user_id;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

async function upsertSubscription(sub: Stripe.Subscription, event: Stripe.Event) {
  const admin = createAdminClient();

  const userId = await resolveUserId(sub, event);
  if (!userId) throw new Error(`Impossibile risolvere user_id per ${sub.id}`);

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  if (!priceId) throw new Error(`Subscription ${sub.id} senza price`);

  const plan = resolvePriceId(priceId);
  if (!plan) {
    // Price sconosciuto: non è colpa dell'artista, ed è meglio non scrivere
    // nulla che scrivere un tier inventato. Si registra l'anomalia e si
    // risponde 200: ritentare non cambierebbe l'esito.
    console.error("[stripe/webhook] price non mappato, evento ignorato", {
      subscription: sub.id,
      price: priceId,
    });
    return { skipped: true as const };
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Ancoraggio del customer: sopravvive alla disdetta, così un riabbonamento
  // non genera una seconda anagrafica con le fatture divise.
  await admin
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });

  const period = item as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  const row: SubRow = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    tier: plan.tier,
    billing_interval: plan.interval,
    status: sub.status,
    current_period_start: iso(period.current_period_start),
    current_period_end: iso(period.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: iso(sub.canceled_at),
    trial_end: iso(sub.trial_end),
    stripe_updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error(`Upsert subscription fallito: ${error.message}`);

  return { skipped: false as const, tier: plan.tier, status: sub.status };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET non configurato");
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Firma mancante" }, { status: 400 });

  // Body GREZZO: la firma si verifica sui byte esatti. Un request.json() qui
  // riserializzerebbe il payload e ogni evento risulterebbe non autentico.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    console.error("[stripe/webhook] firma non valida", e);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  // --- Idempotenza ---
  // Stripe consegna "at least once": lo stesso evento può arrivare più volte.
  const { error: insErr } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> });

  if (insErr) {
    if (insErr.code !== "23505") {
      console.error("[stripe/webhook] insert evento fallito", insErr);
      return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
    // Già visto. La distinzione che conta: se il tentativo precedente era
    // arrivato in fondo (processed_at valorizzato) si risponde 200 e basta; se
    // era crashato a metà (processed_at null) questo è il retry di Stripe e va
    // ESEGUITO. Marcare "visto" all'ingresso senza questo controllo perderebbe
    // per sempre ogni evento che fallisce a metà — cioè proprio quelli che
    // contano.
    const { data: prev } = await admin
      .from("stripe_webhook_events")
      .select("processed_at")
      .eq("id", event.id)
      .maybeSingle();
    if ((prev as { processed_at: string | null } | null)?.processed_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    const subId = subscriptionIdOf(event);
    if (!subId) {
      // Es. una invoice non legata ad abbonamento: niente da fare.
      await admin
        .from("stripe_webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", event.id);
      return NextResponse.json({ received: true, ignored: "no-subscription" });
    }

    // --- Stato autoritativo ---
    // Non ci si fida del payload: gli eventi possono arrivare fuori ordine, e
    // un `customer.subscription.updated` vecchio sovrascriverebbe uno stato più
    // recente. Rileggendo da Stripe si persiste sempre l'ultimo stato reale, e
    // il problema dell'ordinamento sparisce per costruzione. Costa una chiamata
    // per evento: su questi volumi, un prezzo che vale la correttezza.
    let sub: Stripe.Subscription;
    try {
      sub = await getStripe().subscriptions.retrieve(subId);
    } catch (e) {
      // Subscription inesistente su Stripe (cancellata e purgata, oggetto di
      // un altro account, id malformato). È un errore NON RITENTABILE: rispondere
      // 500 farebbe ritentare Stripe per giorni su qualcosa che non tornerà mai.
      // Si registra e si chiude con 200.
      const err = e as { statusCode?: number; code?: string; message?: string };
      if (err.statusCode === 404 || err.code === "resource_missing") {
        console.error("[stripe/webhook] subscription inesistente, evento chiuso", {
          subscription: subId,
          type: event.type,
        });
        await admin
          .from("stripe_webhook_events")
          .update({ processed_at: new Date().toISOString(), error: `subscription ${subId} inesistente su Stripe` })
          .eq("id", event.id);
        return NextResponse.json({ received: true, skipped: "subscription-missing" });
      }
      throw e; // errore di rete o 5xx di Stripe: quello sì va ritentato
    }

    const result = await upsertSubscription(sub, event);

    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);

    revalidatePath("/dashboard/abbonamento");
    revalidatePath("/dashboard/profili");
    revalidatePath("/artisti");

    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[stripe/webhook] elaborazione fallita", event.type, message);
    await admin
      .from("stripe_webhook_events")
      .update({ error: message })
      .eq("id", event.id);
    // 500 → Stripe ritenta con backoff. processed_at resta null, quindi il
    // retry passa il controllo di idempotenza qui sopra ed esegue davvero.
    return NextResponse.json({ error: "Elaborazione fallita" }, { status: 500 });
  }
}
