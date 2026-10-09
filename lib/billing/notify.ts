import "server-only";
import { createElement } from "react";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { formatPrice } from "@/lib/billing/plans";
import { TITOLARE } from "@/lib/legal/titolare";
import { getStripe } from "@/lib/stripe/client";

/**
 * Email dell'abbonamento, inviate dal webhook di Stripe.
 *
 * PERCHÉ ESISTONO. I modelli c'erano, ma nessuno li inviava: l'artista riceveva
 * soltanto la ricevuta di Stripe. Le Condizioni di abbonamento (doc. 02)
 * promettono invece:
 *   - la conferma del contratto su supporto durevole, con condizioni e modulo
 *     di recesso (art. 3.3; art. 51, c. 7 Cod. consumo). Senza, il termine di
 *     recesso si allunga fino a dodici mesi (art. 53);
 *   - il promemoria 30 giorni prima del rinnovo annuale (art. 5.2);
 *   - l'avviso di pagamento non riuscito e di cessazione (artt. 6, 8).
 *
 * Un errore qui NON deve far fallire il webhook: il ledger è già aggiornato e
 * un 500 farebbe ritentare Stripe, cioè riscrivere il ledger per un'email. Ogni
 * funzione cattura e registra.
 */

const PIANI: Record<string, string> = { pro: "N'arte Pro", max: "N'arte Max" };

function dataIt(unix: number | null | undefined): string {
  if (typeof unix !== "number") return "—";
  return new Date(unix * 1000).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

/**
 * Pagina Stripe della fattura dell'ultimo pagamento (lettura sola).
 * Se non è raggiungibile ricade su `fallback`, così il bottone «Scarica la
 * fattura» non resta mai senza destinazione.
 */
async function urlFattura(sub: Stripe.Subscription, fallback: string): Promise<string> {
  try {
    const ultima = sub.latest_invoice;
    const id = typeof ultima === "string" ? ultima : ultima?.id;
    if (!id) return fallback;
    const inv = await getStripe().invoices.retrieve(id);
    return inv.hosted_invoice_url || inv.invoice_pdf || fallback;
  } catch (e) {
    logger.warn("billing/notify", "fattura non raggiungibile:", e instanceof Error ? e.message : String(e));
    return fallback;
  }
}

async function destinatario(userId: string | undefined) {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    logger.warn("billing/notify", "destinatario non trovato:", error?.message ?? userId);
    return null;
  }
  const meta = data.user.user_metadata as { full_name?: string } | undefined;
  return { email: data.user.email, nome: meta?.full_name?.trim() || "ciao" };
}

export async function notificaEventoAbbonamento(
  event: Stripe.Event,
  sub: Stripe.Subscription,
  tier: string | null,
): Promise<void> {
  try {
    const d = await destinatario(sub.metadata?.user_id);
    if (!d) return;
    const piano = PIANI[tier ?? ""] ?? "Abbonamento N'arte";
    const item = sub.items.data[0];
    const intervallo = item?.price?.recurring?.interval === "year" ? "anno" : "mese";
    const importo = formatPrice(item?.price?.unit_amount ?? 0);
    const billingUrl = `${getSiteUrl()}/dashboard/abbonamento`;
    const condizioniUrl = `${getSiteUrl()}/condizioni-abbonamento`;

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Approccio semplice, senza tabelle di dedup: l'attivazione parte
        // (a) alla creazione, solo se lo stato è già active/trialing; (b) su
        // `updated` SOLO nel passaggio incomplete -> active/trialing (il
        // pagamento è andato a buon fine dopo la creazione). Ogni altro
        // `updated` (rinnovi, cambi piano, retry) non invia nulla, quindi i
        // retry del webhook non producono doppioni.
        if (sub.status !== "active" && sub.status !== "trialing") return;
        if (event.type === "customer.subscription.updated") {
          const prima = (event.data.previous_attributes as { status?: string } | undefined)?.status;
          if (prima !== "incomplete") return;
        }
        const consumatore = sub.metadata?.acquirente === "consumatore";
        const scadenzaRecesso = dataIt(sub.start_date + 14 * 86_400);
        await dispatchEmail({
          key: "subscription_activated",
          to: d.email,
          params: {
            artistName: d.nome,
            planName: piano,
            priceLabel: importo,
            periodLabel: intervallo,
            renewalDate: dataIt(item?.current_period_end),
            invoiceUrl: await urlFattura(sub, billingUrl),
            billingUrl,
          },
          meta: { subscription: sub.id, condizioni: sub.metadata?.condizioni_versione ?? null },
          fallback: {
            subject: `Il tuo abbonamento ${piano} è attivo — N'arte`,
            template: "subscription_activated",
            react: createElement(NoticeEmail, {
              preview: "Conferma dell'abbonamento, con le condizioni accettate.",
              heading: "Il tuo abbonamento è attivo",
              paragraphs: [
                `Ciao ${d.nome}, questa è la conferma del tuo abbonamento. Conservala: contiene le condizioni che hai accettato.`,
                `Si rinnova automaticamente ogni ${intervallo} allo stesso prezzo finché non disdici. Puoi disdire quando vuoi dalla pagina Abbonamento: il piano resta attivo fino alla fine del periodo già pagato.`,
                consumatore
                  ? `Diritto di recesso: puoi recedere entro il ${scadenzaRecesso}, senza motivazione, dalla pagina Abbonamento (pulsante «Recedi dal contratto qui»), via email a ${TITOLARE.emailContatti} o con il modulo di recesso allegato alle Condizioni. Avendo chiesto di iniziare subito, in caso di recesso paghi solo la parte di servizio fruita.`
                  : "Ti sei abbonato con partita IVA: si applicano le Condizioni di abbonamento, comprese le clausole che hai approvato specificamente.",
              ],
              rows: [
                { label: "Piano", value: piano },
                { label: "Prezzo", value: `${importo} ogni ${intervallo} (senza IVA, regime forfettario)` },
                { label: "Prossimo rinnovo", value: dataIt(item?.current_period_end) },
                { label: "Condizioni accettate", value: `versione ${sub.metadata?.condizioni_versione ?? "—"} — ${condizioniUrl}` },
              ],
              button: { label: "Vai al tuo abbonamento", href: billingUrl },
            }),
          },
        });
        return;
      }

      case "invoice.payment_failed": {
        await dispatchEmail({
          key: "payment_failed",
          to: d.email,
          params: {
            artistName: d.nome,
            planName: piano,
            amountLabel: importo,
            retryDate: "nei prossimi giorni",
            billingUrl,
          },
          fallback: {
            subject: "Pagamento non riuscito — N'arte",
            template: "payment_failed",
            react: createElement(NoticeEmail, {
              preview: "Aggiorna il metodo di pagamento per non perdere il piano.",
              heading: "Il pagamento non è andato a buon fine",
              paragraphs: [
                `Ciao ${d.nome}, non siamo riusciti ad addebitare il rinnovo di ${piano}. Riproveremo automaticamente nei prossimi giorni.`,
                "Se anche l'ultimo tentativo non va a buon fine, l'abbonamento cessa e l'account torna al piano Free. Nessun contenuto viene cancellato.",
              ],
              button: { label: "Aggiorna il metodo di pagamento", href: billingUrl },
            }),
          },
        });
        return;
      }

      case "customer.subscription.deleted": {
        // Il recesso ha già la sua email di conferma: qui non si ripete.
        if (sub.metadata?.recesso) return;
        await dispatchEmail({
          key: "subscription_cancelled",
          to: d.email,
          params: {
            artistName: d.nome,
            planName: piano,
            endDate: dataIt(sub.ended_at ?? sub.canceled_at),
            billingUrl,
          },
          fallback: {
            subject: `Il tuo abbonamento ${piano} è terminato — N'arte`,
            template: "subscription_cancelled",
            react: createElement(NoticeEmail, {
              preview: "L'account è tornato al piano Free.",
              heading: "Il tuo abbonamento è terminato",
              paragraphs: [
                `Ciao ${d.nome}, l'abbonamento ${piano} è terminato e l'account è tornato al piano Free.`,
                "Nessun contenuto è stato cancellato: foto, video e profili oltre i limiti del piano Free restano nella tua area e tornano visibili se ti abboni di nuovo.",
              ],
              button: { label: "Vedi i piani", href: billingUrl },
            }),
          },
        });
        return;
      }

      case "invoice.upcoming":
        // Il promemoria del rinnovo annuale lo invia il lavoro notturno
        // (lib/billing/promemoria-rinnovo.ts), con la regola dei 30 giorni
        // scritta nel codice e non dipendente dal pannello Stripe. Qui non si
        // invia nulla, per non mandare due email.
        return;

      default:
        return;
    }
  } catch (e) {
    logger.error("billing/notify", event.type, e instanceof Error ? e.message : String(e));
  }
}
