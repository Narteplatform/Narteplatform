import "server-only";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { sincronizzaDaStripe, statoVivo, utenteDaCustomer, type EsitoSync } from "@/lib/stripe/sincronizza";
import { createAdminClient } from "@/lib/supabase/server";
import { notificaEventoAbbonamento } from "@/lib/billing/notify";
import { inviaAvvisiSospensione } from "@/lib/billing/scadenze";
import { formatPrice, PLAN_LABELS } from "@/lib/billing/plans";
import { invitiDaFatturaPagata } from "@/lib/inviti/webhook";
import { creaNotifica } from "@/lib/notifications";
import { avvisaRoot, trovaRoot } from "@/lib/admin/root";
import { logger } from "@/lib/logger";

/**
 * Elaborazione di un evento Stripe, condivisa fra il webhook
 * (app/api/stripe/webhook) e il cron che riprende gli eventi rimasti a metà
 * (/api/cron/abbonamenti). Stessa logica, stesso risultato.
 *
 * Esiti:
 *   - ritorna  → l'evento va chiuso (processed_at), con una nota se l'esito è
 *                un'anomalia non ritentabile;
 *   - solleva  → errore ritentabile: l'evento resta aperto e si riprova.
 *
 * Le email e gli avvisi sono best-effort: un errore di posta non fa ritentare
 * Stripe (il ledger è già scritto).
 */

const AREA = "stripe/eventi";

export const EVENTI_GESTITI = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  // Promemoria del rinnovo annuale (doc. 02, art. 5.2): lo invia il cron
  // notturno, qui si sincronizza soltanto lo stato.
  "invoice.upcoming",
  // Aggiunti con la revisione di novembre 2026. ⚠️ Vanno abilitati anche
  // sull'endpoint nel pannello Stripe (Sviluppatori › Webhook).
  "invoice.payment_action_required",
  "invoice.marked_uncollectible",
  "charge.dispute.created",
  "charge.refunded",
]);

export type EsitoEvento = {
  /** Nota da salvare in `stripe_webhook_events.error` per un esito anomalo. */
  nota: string | null;
  dettagli: Record<string, string | boolean | null>;
};

/**
 * Id della subscription dagli eventi che ne parlano direttamente
 * (customer.subscription.*) o indirettamente (checkout.session, invoice).
 */
export function subscriptionIdOf(event: Stripe.Event): string | null {
  const o = event.data.object;
  if (event.type.startsWith("customer.subscription.")) return "id" in o ? (o.id as string) : null;
  const sub = "subscription" in o ? o.subscription : undefined;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return (sub as { id: string }).id;
  // Nelle versioni recenti dell'API la fattura porta l'abbonamento in
  // `parent.subscription_details.subscription`.
  const parent =
    "parent" in o
      ? (o.parent as { subscription_details?: { subscription?: string | { id: string } | null } | null } | null)
      : null;
  const fromParent = parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) return fromParent.id;
  return null;
}

/** Candidati per l'utente presi dall'evento (la sessione di checkout li porta). */
function candidatiUtente(event: Stripe.Event): string[] {
  if (event.type !== "checkout.session.completed") return [];
  const s = event.data.object as Stripe.Checkout.Session;
  return [s.client_reference_id ?? "", s.metadata?.user_id ?? ""].filter(Boolean);
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function dataIt(unix: number | null | undefined): string {
  if (typeof unix !== "number") return "—";
  return new Date(unix * 1000).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

async function emailUtente(userId: string | null): Promise<string> {
  if (!userId) return "account non identificato";
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return data?.user?.email ? `${data.user.email} (${userId})` : userId;
  } catch {
    return userId;
  }
}

/** Avviso al root, best-effort: senza root identificabile resta il log. */
async function allerta(kind: string, titolo: string, righe: string[]): Promise<void> {
  try {
    const root = await trovaRoot();
    if (!root) {
      logger.error(AREA, `avviso non recapitato (root assente): ${titolo}`, righe.join(" | "));
      return;
    }
    await avvisaRoot(root, { kind, titolo, testo: righe.join("\n"), adminPath: "/admin/abbonamenti" });
  } catch (e) {
    logger.error(AREA, "avviso al root:", msg(e));
  }
}

export async function elaboraEvento(event: Stripe.Event): Promise<EsitoEvento> {
  switch (event.type) {
    case "charge.dispute.created":
      return contestazione(event.data.object as Stripe.Dispute);
    case "charge.refunded":
      return rimborso(event.data.object as Stripe.Charge);
    default:
      break;
  }

  const subId = subscriptionIdOf(event);
  if (!subId) {
    // Es. una fattura non legata ad abbonamento: niente da fare.
    return { nota: null, dettagli: { ignorato: "no-subscription" } };
  }

  const sync = await sincronizzaDaStripe(subId, candidatiUtente(event));
  const anomalia = await gestisciAnomaliaSync(sync, event.type);
  if (anomalia) return anomalia;
  if (sync.esito !== "ok") return { nota: null, dettagli: {} }; // irraggiungibile: gestito sopra

  const { userId, tier, sub } = sync;

  await notificaEventoAbbonamento(event, sub, tier, userId);

  switch (event.type) {
    case "invoice.paid":
      // «Invita un artista»: primo pagamento dell'invitato e conversione dei
      // giorni di Pro in credito. Best-effort.
      await invitiDaFatturaPagata(event.data.object as Stripe.Invoice, userId);
      break;
    case "checkout.session.completed":
      await salvaCodiceFiscale(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
      await controllaDoppioAbbonamento(userId, sub);
      break;
    case "invoice.payment_action_required":
      await azioneRichiesta(event.data.object as Stripe.Invoice, userId, tier);
      break;
    case "invoice.marked_uncollectible": {
      const inv = event.data.object as Stripe.Invoice;
      await allerta("abbonamento_inesigibile", "Fattura dichiarata inesigibile", [
        "Stripe ha segnato una fattura di abbonamento come inesigibile (tentativi di pagamento esauriti).",
        `Account: ${await emailUtente(userId)}`,
        `Fattura: ${inv.number ?? inv.id ?? "—"} — ${formatPrice(inv.amount_due ?? 0)}`,
        `Stato attuale dell'abbonamento ${sub.id}: ${sub.status}`,
        "Il ledger è stato riallineato; nessuna azione automatica sull'account.",
      ]);
      break;
    }
    default:
      break;
  }

  // Abbonamento non più vivo: i profili oltre il piano sono stati appena
  // sospesi dai trigger. L'avviso è idempotente (email_log).
  if (!statoVivo(sub.status)) {
    await inviaAvvisiSospensione({ userIds: [userId], giorni: 1 }).catch((e) =>
      logger.warn(AREA, "avviso sospensione:", msg(e)),
    );
  }

  revalidatePath("/dashboard/abbonamento");
  revalidatePath("/dashboard/profili");
  revalidatePath("/artisti");

  return { nota: null, dettagli: { tier, status: sub.status } };
}

/**
 * Esiti non ritentabili della sincronizzazione: si chiude l'evento con una
 * nota e, dove serve, si avvisa il root. `null` = esito ok.
 */
export async function gestisciAnomaliaSync(sync: EsitoSync, origine: string): Promise<EsitoEvento | null> {
  switch (sync.esito) {
    case "ok":
      return null;
    case "mancante":
      logger.error(AREA, "subscription inesistente su Stripe, evento chiuso", { subscription: sync.subscriptionId, origine });
      return { nota: `subscription ${sync.subscriptionId} inesistente su Stripe`, dettagli: { skipped: "subscription-missing" } };
    case "prezzo_sconosciuto": {
      const nota = `price non mappato: ${sync.priceId}`;
      if (!(await giaSegnalato(nota))) {
        await allerta("abbonamento_prezzo_sconosciuto", "Abbonamento con un prezzo non riconosciuto", [
          `L'abbonamento ${sync.sub.id} usa il price ${sync.priceId}, che non corrisponde a nessuna env STRIPE_PRICE_*, a nessuna lookup_key narte_* e a nessun metadata narte_tier/narte_interval.`,
          "Il ledger NON è stato aggiornato (meglio nessuna scrittura che un piano inventato): l'artista potrebbe non vedere il piano pagato.",
          "Da fare: aggiungere il price alle env su Vercel (o le lookup_key/metadata sul price) e riprocessare l'evento dal pannello Stripe.",
          `Evento: ${origine}`,
        ]);
      }
      return { nota, dettagli: { skipped: "price-unknown" } };
    }
    case "utente_inesistente": {
      // L'account è stato cancellato: ritentare non lo farà ricomparire. Si
      // chiude con 200, ma se Stripe sta ancora addebitando lo si dice al root.
      if (statoVivo(sync.sub.status)) {
        await allerta("abbonamento_senza_account", "Abbonamento attivo di un account cancellato", [
          `L'abbonamento ${sync.sub.id} è ancora «${sync.sub.status}» su Stripe, ma l'account ${sync.userId} non esiste più su N'arte.`,
          "Stripe continuerà ad addebitare i rinnovi: verificare e, se è il caso, annullarlo a mano dal pannello Stripe.",
          `Evento: ${origine}`,
        ]);
      }
      return { nota: `utente ${sync.userId} non più esistente`, dettagli: { skipped: "user-deleted" } };
    }
  }
}

/** Lo stesso problema è già stato segnalato nelle ultime 24 ore? */
async function giaSegnalato(nota: string): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("stripe_webhook_events")
    .select("id", { count: "exact", head: true })
    .eq("error", nota)
    .gte("received_at", new Date(Date.now() - 86_400_000).toISOString());
  if (error) return false; // nel dubbio si avvisa: meglio un doppione che un silenzio
  return (count ?? 0) > 0;
}

/**
 * Doppio abbonamento: il checkout lo impedisce a monte, ma un abbonamento
 * creato dal pannello Stripe (o due checkout aperti in parallelo) può
 * sfuggire. Non si annulla nulla: si avvisa il root.
 */
async function controllaDoppioAbbonamento(userId: string, sub: Stripe.Subscription): Promise<void> {
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return;
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select("stripe_subscription_id, tier, billing_interval, status")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due"])
    .neq("stripe_subscription_id", sub.id);
  if (error) {
    logger.warn(AREA, "controllo doppio abbonamento non eseguito:", error.message);
    return;
  }
  const altre = data ?? [];
  if (altre.length === 0) return;
  await allerta("abbonamento_doppio", "Doppio abbonamento sullo stesso account", [
    `L'account ${await emailUtente(userId)} ha appena attivato l'abbonamento ${sub.id} (${sub.status}) e ne ha già ${altre.length === 1 ? "un altro vivo" : `altri ${altre.length} vivi`}:`,
    ...altre.map((a) => `- ${a.stripe_subscription_id}: ${a.tier} ${a.billing_interval === "year" ? "annuale" : "mensile"}, ${a.status}`),
    "Nessuna azione automatica: verificare con l'artista quale tenere e annullare/rimborsare l'altro dal pannello Stripe.",
  ]);
}

/**
 * Codice fiscale facoltativo raccolto nel checkout (campo personalizzato
 * `codice_fiscale`, solo per chi si abbona da privato): si salva nei metadata
 * del customer Stripe, da dove lo legge l'export incassi. Best-effort.
 */
async function salvaCodiceFiscale(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const campo = (session.custom_fields ?? []).find((f) => f.key === "codice_fiscale");
    const valore = campo?.text?.value?.replace(/\s+/g, "").toUpperCase() ?? "";
    if (!valore) return;
    if (!/^[A-Z0-9]{11,16}$/.test(valore)) {
      logger.warn(AREA, "codice fiscale dal checkout non valido, non salvato", { session: session.id });
      return;
    }
    const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!customer) return;
    await getStripe().customers.update(customer, { metadata: { codice_fiscale: valore } });
  } catch (e) {
    logger.warn(AREA, "codice fiscale non salvato:", msg(e));
  }
}

/**
 * Pagamento che richiede un'azione (autenticazione 3D Secure del rinnovo).
 * Il modello `payment_failed` parla di carta scaduta e fondi insufficienti,
 * quindi non è adatto: si avvisa l'artista nella campanella. Stripe può
 * inviare a sua volta l'email con il link di conferma (impostazione del
 * pannello: Fatturazione › Abbonamenti › «Invia email quando un pagamento
 * richiede la conferma»).
 */
async function azioneRichiesta(invoice: Stripe.Invoice, userId: string, tier: string): Promise<void> {
  // Rilettura: se nel frattempo la fattura è stata pagata non si disturba.
  let stato = invoice.status;
  try {
    if (invoice.id) stato = (await getStripe().invoices.retrieve(invoice.id)).status;
  } catch (e) {
    logger.warn(AREA, "fattura non riletta:", msg(e));
  }
  if (stato === "paid" || stato === "void") return;
  const piano = PLAN_LABELS[tier as keyof typeof PLAN_LABELS] ?? "abbonamento";
  await creaNotifica({
    userId,
    kind: "abbonamento_conferma_pagamento",
    title: "Conferma il pagamento dell'abbonamento",
    body: `La tua banca chiede di confermare il pagamento di ${formatPrice(invoice.amount_due ?? 0)} per ${piano}. Apri la pagina Abbonamento e segui il link di conferma, altrimenti il rinnovo non va a buon fine.`,
    href: "/dashboard/abbonamento",
  });
}

/** Contestazione di un addebito (chargeback): solo avviso al root, con le scadenze. */
async function contestazione(dispute: Stripe.Dispute): Promise<EsitoEvento> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
  let userId: string | null = null;
  try {
    const charge = typeof dispute.charge === "string" ? await getStripe().charges.retrieve(chargeId) : dispute.charge;
    const customer = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
    if (customer) userId = await utenteDaCustomer(customer);
  } catch (e) {
    logger.warn(AREA, "contestazione: cliente non identificato:", msg(e));
  }
  await allerta("abbonamento_contestazione", "Contestazione di un pagamento (chargeback)", [
    `Un cliente ha contestato un addebito di ${formatPrice(dispute.amount)} presso la sua banca.`,
    `Motivo dichiarato: ${dispute.reason}`,
    `Termine per inviare le prove: ${dataIt(dispute.evidence_details?.due_by)}`,
    `Account: ${await emailUtente(userId)}`,
    `Addebito: ${chargeId} — contestazione ${dispute.id}`,
    "Rispondere dal pannello Stripe (Pagamenti › Contestazioni) entro il termine. Nessuna azione automatica sull'account.",
  ]);
  return { nota: null, dettagli: { dispute: dispute.id } };
}

/**
 * Rimborso di un addebito: si riallinea lo stato degli abbonamenti vivi
 * dell'account e si avvisa il root, tranne per i rimborsi del recesso fatti
 * dalla piattaforma (che hanno già il loro flusso e i loro avvisi).
 */
async function rimborso(charge: Stripe.Charge): Promise<EsitoEvento> {
  const stripe = getStripe();
  const customer = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  const userId = customer ? await utenteDaCustomer(customer) : null; // errore di lettura → ritenta

  let daRecesso = false;
  try {
    const refunds = await stripe.refunds.list({ charge: charge.id, limit: 10 });
    daRecesso =
      refunds.data.length > 0 && refunds.data.every((r) => r.metadata?.tipo === "recesso_consumatore");
  } catch (e) {
    logger.warn(AREA, "rimborsi dell'addebito non letti:", msg(e));
  }

  const stati: string[] = [];
  if (userId) {
    const { data, error } = await createAdminClient()
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .in("status", ["trialing", "active", "past_due"]);
    if (error) throw new Error(`abbonamenti dell'account non leggibili: ${error.message}`);
    for (const r of data ?? []) {
      const sync = await sincronizzaDaStripe(r.stripe_subscription_id, [userId]);
      if (sync.esito === "ok") stati.push(`${r.stripe_subscription_id}: ${sync.status}`);
      else {
        await gestisciAnomaliaSync(sync, "charge.refunded");
        stati.push(`${r.stripe_subscription_id}: ${sync.esito}`);
      }
    }
    revalidatePath("/dashboard/abbonamento");
  }

  if (!daRecesso) {
    await allerta("abbonamento_rimborso", "Rimborso registrato su Stripe", [
      `È stato rimborsato ${formatPrice(charge.amount_refunded)} su un addebito di ${formatPrice(charge.amount)}${charge.refunded ? " (rimborso totale)" : " (rimborso parziale)"}.`,
      `Account: ${await emailUtente(userId)}`,
      `Addebito: ${charge.id}`,
      stati.length > 0 ? `Abbonamenti riallineati: ${stati.join("; ")}` : "Nessun abbonamento vivo da riallineare.",
      "Un rimborso NON annulla l'abbonamento: se va chiuso, farlo dal pannello Stripe. Ricordarsi della nota di credito per il commercialista (export incassi).",
    ]);
  }
  return { nota: null, dettagli: { charge: charge.id, daRecesso } };
}
