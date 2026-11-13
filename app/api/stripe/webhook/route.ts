import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { EVENTI_GESTITI, elaboraEvento } from "@/lib/stripe/eventi";
import { chiudiEvento, eventoElaborato, prendiEvento, segnaErroreEvento } from "@/lib/stripe/coda";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Webhook Stripe — unico ingresso degli eventi.
 *
 * Il webhook NON tocca mai `artists`. Scrive il fatto (la subscription, letta
 * da Stripe e non dal payload) e i trigger di 0042/0043 fanno il resto. La
 * logica di elaborazione sta in lib/stripe/eventi.ts, condivisa con il cron
 * /api/cron/abbonamenti che riprende gli eventi rimasti a metà.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("stripe/webhook", "STRIPE_WEBHOOK_SECRET non configurato");
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
    logger.error("stripe/webhook", "firma non valida", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  if (!EVENTI_GESTITI.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  // --- Registro ---
  // L'evento Stripe, serializzato in jsonb, è genuinamente un valore Json:
  // `Stripe.Event` non ha una firma indice, da qui il passaggio da `unknown`.
  const { error: insErr } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type, payload: event as unknown as Json });
  if (insErr && insErr.code !== "23505") {
    logger.error("stripe/webhook", "insert evento fallito", insErr.message);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }

  // --- Presa in carico atomica (0082) ---
  // Una sola richiesta esegue l'evento: una consegna simultanea dello stesso
  // evento trova il lease occupato e risponde 200 senza rifare nulla (niente
  // email doppie). Se la richiesta che lo esegue fallisce, risponde 500 e
  // Stripe ritenta; se muore a metà, il lease scade e il cron lo riprende.
  const presa = await prendiEvento(event.id);
  if (presa === "errore") {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
  if (presa === "occupata") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (presa === "senza_lease" && insErr) {
    // Prima della 0082: già visto. Se il tentativo precedente era arrivato in
    // fondo si risponde 200; se era crashato a metà, questo retry va eseguito.
    const fatto = await eventoElaborato(event.id);
    if (fatto === null) return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    if (fatto) return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const esito = await elaboraEvento(event);
    await chiudiEvento(event.id, esito.nota);
    // Senza l'id utente: la risposta finisce nei log di Stripe.
    return NextResponse.json({ received: true, ...esito.dettagli });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("stripe/webhook", "elaborazione fallita", event.type, message);
    await segnaErroreEvento(event.id, message);
    // 500 → Stripe ritenta con backoff. processed_at resta null: il retry (o il
    // cron, dopo 15 minuti) esegue davvero.
    return NextResponse.json({ error: "Elaborazione fallita" }, { status: 500 });
  }
}
