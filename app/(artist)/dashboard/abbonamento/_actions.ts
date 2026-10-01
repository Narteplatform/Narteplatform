"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/client";
import { priceIdFor } from "@/lib/stripe/prices";
import { formatPrice, PLAN_LABELS, type BillingInterval, type PaidTier } from "@/lib/billing/plans";
import { LEGAL_VERSION } from "@/lib/legal/content";
import { registraConsensoConContesto } from "@/lib/legal/consents";
import { logger } from "@/lib/logger";
import { registraProvaSuIubendaInBackground } from "@/lib/legal/iubenda-consent";
import { TITOLARE } from "@/lib/legal/titolare";

/**
 * Checkout e fatturazione.
 *
 * ⚠️  L'abbonamento è dell'ACCOUNT, non del singolo profilo artista (0042): la
 *     chiave è `user.id`. Un account Max paga una volta e i suoi 5 profili
 *     ereditano il piano.
 */

/**
 * Oltre a piano e periodicità, il checkout raccoglie le accettazioni del doc. 08
 * del fascicolo legale (punto G):
 *   G1  condizioni di abbonamento — sempre;
 *   G2  richiesta di esecuzione immediata — il consumatore, perché in caso di
 *       recesso paghi solo la parte di servizio fruita (art. 57, c. 3 Cod. consumo);
 *   G3  approvazione specifica ex artt. 1341-1342 c.c. — chi ha partita IVA.
 */
const checkoutSchema = z
  .object({
    tier: z.enum(["pro", "max"]),
    interval: z.enum(["month", "year"]),
    acquirente: z.enum(["consumatore", "professionista"]),
    accettaCondizioni: z.literal(true, {
      errorMap: () => ({ message: "Devi accettare le Condizioni di abbonamento." }),
    }),
    esecuzioneImmediata: z.boolean().default(false),
    clausoleSpecifiche: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.acquirente === "consumatore" && !v.esecuzioneImmediata) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Per iniziare subito serve la richiesta di esecuzione immediata.",
        path: ["esecuzioneImmediata"],
      });
    }
    if (v.acquirente === "professionista" && !v.clausoleSpecifiche) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chi si abbona con partita IVA deve approvare le clausole indicate.",
        path: ["clausoleSpecifiche"],
      });
    }
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

/**
 * Customer Stripe dell'account, creato una volta sola e riusato per sempre.
 * Se la lettura fallisce si LANCIA: proseguire creerebbe un secondo customer
 * per lo stesso utente, e con esso un secondo abbonamento possibile.
 */
async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient();
  const { data: existing, error: readErr } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) {
    logger.error("abbonamento", "lettura billing_customers:", readErr.message);
    throw new Error("lettura billing_customers fallita");
  }
  const found = (existing as { stripe_customer_id: string } | null)?.stripe_customer_id;
  if (found) return found;

  const customer = await getStripe().customers.create(
    { email, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  const { error: upsertErr } = await admin
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: "user_id" });
  if (upsertErr) {
    logger.error("abbonamento", `customer ${customer.id} non salvato per ${userId}:`, upsertErr.message);
  }
  return customer.id;
}

/** Errore di lettura = `ok: false`: il chiamante deve fermare il checkout. */
async function liveSubscription(
  userId: string,
): Promise<{ ok: true; live: { tier: string; status: string } | null } | { ok: false }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("id, tier, status, stripe_subscription_id")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due"])
    .limit(1);
  if (error) {
    logger.error("abbonamento", "lettura abbonamento attivo:", error.message);
    return { ok: false };
  }
  return { ok: true, live: ((data ?? []) as unknown as { tier: string; status: string }[])[0] ?? null };
}

export async function createCheckoutSession(input: {
  tier: PaidTier;
  interval: BillingInterval;
  acquirente: "consumatore" | "professionista";
  accettaCondizioni: boolean;
  esecuzioneImmediata?: boolean;
  clausoleSpecifiche?: boolean;
}) {
  const user = await requireArtistUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { acquirente } = parsed.data;

  // Doppio abbonamento prevenuto ALLA RADICE, non con un unique constraint sul
  // ledger: un vincolo farebbe fallire il webhook (500 in loop) invece di
  // fermare l'utente qui, dove si può spiegare cosa fare. Chi ha già un piano
  // attivo lo cambia dal Portal, che gestisce proration e switch.
  const stato = await liveSubscription(user.id);
  if (!stato.ok) {
    return { ok: false as const, error: "Non riusciamo a verificare il tuo abbonamento. Riprova tra poco." };
  }
  if (stato.live) {
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

    // Ciò che è stato accettato viaggia anche nei metadata della subscription:
    // serve al recesso (solo il consumatore ne ha diritto, e il rimborso
    // dipende dalla richiesta di esecuzione immediata) e all'email di conferma.
    const accettazioni = {
      user_id: user.id,
      acquirente,
      condizioni_versione: LEGAL_VERSION,
      esecuzione_immediata: parsed.data.esecuzioneImmediata ? "1" : "0",
    };
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      // client_reference_id + metadata su ENTRAMBI: gli eventi
      // customer.subscription.* non portano la session, quindi senza i metadata
      // sulla subscription il webhook dovrebbe risalire per customer. Ridondanza
      // voluta.
      client_reference_id: user.id,
      metadata: accettazioni,
      subscription_data: { metadata: accettazioni },
      locale: "it",
      allow_promotion_codes: true,
      // Dati necessari alla fattura elettronica (regime forfettario: nessuna
      // IVA, ma la fattura va emessa verso chiunque, anche i privati).
      billing_address_collection: "required",
      customer_update: { name: "auto", address: "auto" },
      tax_id_collection: { enabled: acquirente === "professionista" },
      custom_text: {
        submit: {
          message:
            "Abbonandoti accetti le Condizioni di abbonamento N'arte. Si rinnova automaticamente finché non disdici; puoi disdire quando vuoi dalla pagina Abbonamento.",
        },
      },
      success_url: `${site}/dashboard/abbonamento?checkout=success`,
      cancel_url: `${site}/dashboard/abbonamento?checkout=cancelled`,
    });
    if (!session.url) return { ok: false as const, error: "Stripe non ha restituito un URL" };
    url = session.url;

    // Prova delle accettazioni, legata alla sessione di pagamento. Se il
    // registro non accetta ancora questi tipi (migration 0062 non applicata)
    // restano i metadata sulla subscription; il pagamento non si blocca.
    const supabase = await createClient();
    const daRegistrare: Array<"condizioni_abbonamento" | "esecuzione_immediata" | "clausole_specifiche"> = [
      "condizioni_abbonamento",
    ];
    if (parsed.data.esecuzioneImmediata) daRegistrare.push("esecuzione_immediata");
    if (parsed.data.clausoleSpecifiche) daRegistrare.push("clausole_specifiche");
    for (const kind of daRegistrare) {
      const consErr = await registraConsensoConContesto(supabase, {
        kind,
        version: LEGAL_VERSION,
        ref: session.id,
      });
      if (consErr) logger.warn("abbonamento", `accettazione ${kind} non registrata:`, consErr);
    }

    // Copia presso iubenda: non bloccante, l'esito è solo nei log.
    const testi = ["Ho letto e accetto le Condizioni di abbonamento."];
    if (parsed.data.esecuzioneImmediata) {
      testi.push(
        "Chiedo che l'abbonamento inizi subito. So che, se recedo entro 14 giorni, pagherò solo la parte di servizio già fruita e mi verrà rimborsato il resto."
      );
    }
    if (parsed.data.clausoleSpecifiche) {
      testi.push(
        "Ai sensi degli artt. 1341 e 1342 c.c. approvo specificamente le clausole indicate in fondo alle Condizioni di abbonamento: rinnovo automatico, esclusione di rimborsi per il periodo in corso, obbligo di mezzi e rimedio, modifiche di prezzo e servizio, sospensione e cessazione."
      );
    }
    registraProvaSuIubendaInBackground({
      soggettoId: user.id,
      email: user.email ?? undefined,
      documenti: ["terms"],
      preferenze: {
        condizioni_abbonamento: true,
        esecuzione_immediata: parsed.data.esecuzioneImmediata === true,
        clausole_specifiche: parsed.data.clausoleSpecifiche === true,
      },
      modulo: "Checkout abbonamento",
      testoCasella: testi.join(" "),
      versione: LEGAL_VERSION,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("abbonamento", "createCheckoutSession", message);
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
    logger.error("abbonamento", "createBillingPortalSession", message);
    return { ok: false as const, error: "Impossibile aprire la gestione fatturazione." };
  }

  redirect(url);
}

// =========================================
// Diritto di recesso del consumatore (doc. 02, art. 7)
// =========================================
//
// Quattordici giorni dalla conclusione del contratto, solo per chi si è
// abbonato come consumatore. Se aveva chiesto l'esecuzione immediata paga la
// parte di servizio fruita fino al recesso e riceve il resto (art. 57, c. 3
// Cod. consumo); altrimenti riceve l'intero importo.

const GIORNI_RECESSO = 14;
const GIORNO_MS = 86_400_000;

export type StatoRecesso =
  | { disponibile: false }
  | { disponibile: true; scade: string; piano: string };

async function subscriptionDelConsumatore(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, tier, billing_interval, status")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due"])
    .limit(1);
  if (error) {
    logger.error("abbonamento", "lettura abbonamento per il recesso:", error.message);
    return null;
  }
  const riga = (data ?? [])[0];
  if (!riga) return null;
  const sub = await getStripe().subscriptions.retrieve(riga.stripe_subscription_id);
  if (sub.metadata?.acquirente !== "consumatore") return null;
  // «Già receduto» = davvero cessato. Un metadata.recesso su un abbonamento
  // ancora vivo è un recesso rimasto a metà: si può riprovare.
  if (sub.status === "canceled") return null;
  const inizio = sub.start_date * 1000;
  const scade = inizio + GIORNI_RECESSO * GIORNO_MS;
  if (Date.now() > scade) return null;
  return { sub, riga, scade };
}

/** Il recesso è ancora esercitabile? Sola lettura, per la pagina Abbonamento. */
export async function statoRecesso(): Promise<StatoRecesso> {
  const user = await requireArtistUser();
  if (!user) return { disponibile: false };
  try {
    const trovata = await subscriptionDelConsumatore(user.id);
    if (!trovata) return { disponibile: false };
    return {
      disponibile: true,
      scade: new Date(trovata.scade).toISOString(),
      piano: PLAN_LABELS[trovata.riga.tier as PaidTier] ?? "Abbonamento",
    };
  } catch (e) {
    logger.error("abbonamento", "stato recesso:", e instanceof Error ? e.message : String(e));
    return { disponibile: false };
  }
}

export async function recediAbbonamento(): Promise<
  { ok: true; rimborsoCent: number; rimborsoInCorso: boolean } | { ok: false; error: string }
> {
  const user = await requireArtistUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const stripe = getStripe();
  let trovata: Awaited<ReturnType<typeof subscriptionDelConsumatore>>;
  try {
    trovata = await subscriptionDelConsumatore(user.id);
  } catch (e) {
    logger.error("abbonamento", "recesso, lettura:", e instanceof Error ? e.message : String(e));
    return { ok: false, error: "Non siamo riusciti a leggere l'abbonamento. Riprova o scrivici." };
  }
  if (!trovata) {
    return { ok: false, error: "Il recesso non è più disponibile per questo abbonamento." };
  }
  const { sub, riga } = trovata;
  const ricevutoIl = new Date();

  // Importo: TUTTE le fatture pagate dall'inizio del contratto, non solo l'ultima.
  const pagate: Stripe.Invoice[] = [];
  try {
    let cursore: string | undefined;
    for (;;) {
      const pagina = await stripe.invoices.list({
        subscription: sub.id,
        status: "paid",
        created: { gte: sub.start_date },
        limit: 100,
        ...(cursore ? { starting_after: cursore } : {}),
      });
      pagate.push(...pagina.data);
      const ultima = pagina.data[pagina.data.length - 1];
      if (!pagina.has_more || !ultima) break;
      cursore = ultima.id;
    }
  } catch (e) {
    logger.error("abbonamento", "recesso, elenco fatture:", sub.id, e instanceof Error ? e.message : String(e));
    return { ok: false, error: "Non siamo riusciti a leggere i pagamenti. Riprova o scrivici." };
  }
  // Dalla più recente: il rimborso parte da lì.
  pagate.sort((a, b) => b.created - a.created);
  const pagato = pagate.reduce((tot, f) => tot + (f.amount_paid ?? 0), 0);

  let dovuto = 0;
  if (sub.metadata?.esecuzione_immediata === "1" && pagate[0]) {
    const item = sub.items.data[0];
    const inizio = (item?.current_period_start ?? sub.start_date) * 1000;
    const fine = (item?.current_period_end ?? sub.start_date) * 1000;
    const durata = Math.max(fine - inizio, GIORNO_MS);
    const fruito = Math.min(Math.max(ricevutoIl.getTime() - inizio, 0), durata);
    // Proporzione sul periodo corrente, sul pagamento più recente.
    dovuto = Math.min(Math.round(((pagate[0].amount_paid ?? 0) * fruito) / durata), pagato);
  }
  const rimborso = Math.max(pagato - dovuto, 0);

  // 1. Il recesso ha effetto quando è comunicato: si chiude subito.
  //    Prima si annota il recesso nel metadata (best effort): così, quando
  //    arriva il webhook `customer.subscription.deleted`, lo trova e non manda
  //    la seconda email di «abbonamento terminato». Annotarlo prima è sicuro:
  //    un abbonamento si considera già receduto solo se è davvero `canceled`,
  //    quindi se la cancellazione qui sotto fallisce l'utente può riprovare.
  try {
    await stripe.subscriptions.update(sub.id, {
      metadata: { ...sub.metadata, recesso: ricevutoIl.toISOString() },
    });
  } catch (e) {
    logger.warn("abbonamento", "recesso: metadata non scritto su", sub.id, e instanceof Error ? e.message : String(e));
  }
  try {
    await stripe.subscriptions.cancel(
      sub.id,
      { prorate: false, invoice_now: false },
      { idempotencyKey: `recesso-cancel-${sub.id}` },
    );
  } catch (e) {
    logger.error("abbonamento", "RECESSO NON ESEGUITO:", sub.id, e instanceof Error ? e.message : String(e));
    return { ok: false, error: "Non siamo riusciti a registrare il recesso. Riprova, oppure scrivici: lo facciamo a mano." };
  }

  // 2. Rimborso sullo stesso metodo di pagamento, fattura per fattura dalla più
  //    recente fino a coprire l'importo. Se qualcosa fallisce il recesso resta
  //    valido e il resto va rimborsato a mano entro 14 giorni: si avvisa il team.
  let daRimborsare = rimborso;
  let rimborsato = 0;
  let erroreRimborso: string | null = null;
  for (const fattura of pagate) {
    if (daRimborsare <= 0) break;
    const importo = Math.min(daRimborsare, fattura.amount_paid ?? 0);
    if (importo <= 0) continue;
    try {
      const pagamenti = await stripe.invoicePayments.list({ invoice: fattura.id, limit: 1 });
      const pi = pagamenti.data[0]?.payment?.payment_intent;
      const paymentIntent = typeof pi === "string" ? pi : pi?.id;
      if (!paymentIntent) throw new Error(`pagamento della fattura ${fattura.id} non trovato`);
      await stripe.refunds.create(
        {
          payment_intent: paymentIntent,
          amount: importo,
          reason: "requested_by_customer",
          metadata: { tipo: "recesso_consumatore", user_id: user.id, subscription: sub.id, invoice: fattura.id },
        },
        { idempotencyKey: `recesso-refund-${sub.id}-${fattura.id}` },
      );
      rimborsato += importo;
      daRimborsare -= importo;
    } catch (e) {
      erroreRimborso = e instanceof Error ? e.message : String(e);
      logger.error(
        "abbonamento",
        `RIMBORSO DA FARE A MANO — ${daRimborsare} cent su ${rimborso}, subscription ${sub.id}, utente ${user.id}:`,
        erroreRimborso,
      );
      break;
    }
  }
  if (daRimborsare > 0 && !erroreRimborso) {
    // Nessuna fattura capiente: non dovrebbe accadere, ma non si tace.
    erroreRimborso = "importo da rimborsare superiore ai pagamenti rimborsabili";
  }
  const esito: "eseguito" | "manuale" | "nessuno" =
    rimborso <= 0 ? "nessuno" : daRimborsare > 0 ? "manuale" : "eseguito";
  const rimborsoInCorso = esito === "manuale";

  if (esito === "manuale") {
    try {
      const { sendEmail } = await import("@/lib/emails/send");
      const { createElement } = await import("react");
      const { default: NoticeEmail } = await import("@/lib/emails/templates/NoticeEmail");
      const scadenzaLegale = new Date(ricevutoIl.getTime() + GIORNI_RECESSO * GIORNO_MS).toLocaleDateString("it-IT", {
        timeZone: "Europe/Rome",
      });
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL || TITOLARE.emailContatti,
        subject: "URGENTE: rimborso da recesso da fare a mano",
        template: "recesso_rimborso_manuale",
        meta: { subscription: sub.id, user: user.id },
        react: createElement(NoticeEmail, {
          preview: "Il rimborso automatico non è riuscito.",
          heading: "Rimborso da recesso da eseguire a mano",
          paragraphs: [
            `Un consumatore ha esercitato il recesso e il rimborso automatico non è andato a buon fine. Va completato entro il ${scadenzaLegale} (14 giorni dal recesso, art. 56 Cod. consumo).`,
            erroreRimborso ? `Errore: ${erroreRimborso}` : "",
          ].filter(Boolean),
          rows: [
            { label: "Da rimborsare", value: formatPrice(daRimborsare) },
            { label: "Totale del rimborso", value: formatPrice(rimborso) },
            { label: "Già rimborsato", value: formatPrice(rimborsato) },
            { label: "Subscription", value: sub.id },
            { label: "Utente", value: `${user.id}${user.email ? ` (${user.email})` : ""}` },
            { label: "Scadenza legale", value: scadenzaLegale },
          ],
        }),
      });
    } catch (e) {
      logger.error("abbonamento", "email al team per rimborso manuale:", e instanceof Error ? e.message : String(e));
    }
  }

  // 3. Prova del recesso nel nostro registro (0070). Non bloccante: il recesso
  //    è già efficace su Stripe; se la tabella manca resta l'email e il log.
  {
    const { error: regErr } = await createAdminClient()
      .from("subscription_withdrawals")
      .insert({
        user_id: user.id,
        user_email: user.email ?? null,
        stripe_subscription_id: sub.id,
        canale: "online",
        ricevuto_il: ricevutoIl.toISOString(),
        rimborso_cent: rimborso,
        stato_rimborso:
          esito === "eseguito" ? "eseguito" : esito === "manuale" ? "da_eseguire" : "non_dovuto",
        note: sub.metadata?.esecuzione_immediata === "1" ? "esecuzione immediata richiesta" : null,
      });
    if (regErr) logger.warn("abbonamento", "recesso non registrato in subscription_withdrawals:", regErr.message);
  }

  // 4. Conferma di ricezione su supporto durevole (art. 54, c. 4 Cod. consumo).
  const piano = PLAN_LABELS[riga.tier as PaidTier] ?? "Abbonamento N'arte";
  const rimborsoLabel =
    esito === "nessuno"
      ? "Nessun importo da rimborsare"
      : esito === "manuale"
        ? `${formatPrice(daRimborsare)} (in lavorazione, entro 14 giorni)`
        : formatPrice(rimborso);
  const nota =
    sub.metadata?.esecuzione_immediata === "1"
      ? `Prezzo pagato (${formatPrice(pagato)}) meno la parte di servizio fruita fino al recesso (${formatPrice(dovuto)}).`
      : "Intero importo pagato.";
  const testoRimborso =
    esito === "eseguito"
      ? "Il rimborso è stato disposto sullo stesso metodo di pagamento: i tempi di accredito dipendono dalla tua banca. I tuoi contenuti non sono stati cancellati."
      : esito === "manuale"
        ? "Il rimborso è in lavorazione da parte del nostro team e arriverà sullo stesso metodo di pagamento entro 14 giorni dal recesso. I tuoi contenuti non sono stati cancellati."
        : "Il servizio già fruito copre l'intero importo pagato, quindi non c'è nulla da rimborsare. I tuoi contenuti non sono stati cancellati.";
  if (user.email) {
    const { dispatchEmail } = await import("@/lib/emails/dispatch");
    const { createElement } = await import("react");
    const { default: NoticeEmail } = await import("@/lib/emails/templates/NoticeEmail");
    const quando = ricevutoIl.toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    await dispatchEmail({
      key: "subscription_withdrawal",
      to: user.email,
      params: {
        name: (user.user_metadata as { full_name?: string } | null)?.full_name ?? "ciao",
        planLabel: piano,
        receivedAt: quando,
        refundLabel: rimborsoLabel,
        refundNote: `${nota} ${testoRimborso}`,
      },
      fallback: {
        subject: "Abbiamo ricevuto il tuo recesso — N'arte",
        template: "subscription_withdrawal",
        react: createElement(NoticeEmail, {
          preview:
            esito === "nessuno"
              ? "Il recesso è registrato."
              : esito === "manuale"
                ? "Il recesso è registrato e il rimborso è in lavorazione."
                : "Il recesso è registrato e il rimborso è stato disposto.",
          heading: "Recesso ricevuto",
          paragraphs: [
            "Confermiamo di aver ricevuto la tua comunicazione di recesso. L'abbonamento è cessato e il tuo account è tornato al piano Free.",
            testoRimborso,
          ],
          rows: [
            { label: "Piano", value: piano },
            { label: "Ricevuto il", value: quando },
            { label: "Rimborso", value: rimborsoLabel },
            { label: "Calcolo", value: nota },
          ],
        }),
      },
    }).catch((e) => logger.error("abbonamento", "email recesso:", e instanceof Error ? e.message : String(e)));
  }

  return { ok: true, rimborsoCent: rimborso, rimborsoInCorso };
}
