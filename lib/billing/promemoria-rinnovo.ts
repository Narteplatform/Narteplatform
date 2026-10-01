import "server-only";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { formatPrice, PLAN_LABELS, PLAN_PRICES_CENTS, type PaidTier } from "@/lib/billing/plans";
import { logger } from "@/lib/logger";

/**
 * Promemoria del rinnovo annuale, almeno 30 giorni prima (doc. 02, art. 5.2).
 *
 * PERCHÉ UN PROCESSO NOSTRO E NON L'EVENTO DI STRIPE. `invoice.upcoming`
 * dipende da un'impostazione del pannello Stripe (quanti giorni prima arriva)
 * che il codice non controlla: se qualcuno la cambia, la promessa dei 30 giorni
 * salta senza che nessuno se ne accorga. Qui la regola è scritta nel codice.
 *
 * Gira ogni notte dentro il cron di conservazione (vercel.json ne ammette pochi
 * sul piano Hobby) e cerca gli abbonamenti ANNUALI attivi, non in disdetta, con
 * scadenza fra 29 e 31 giorni. La finestra di tre giorni assorbe una notte
 * saltata; i doppioni si evitano guardando `email_log`: per ogni abbonamento e
 * periodo parte un solo promemoria.
 */
export async function inviaPromemoriaRinnovi(): Promise<{ inviati: number; saltati: number; errori: number }> {
  const admin = createAdminClient();
  const ora = Date.now();
  const da = new Date(ora + 29 * 86_400_000).toISOString();
  const a = new Date(ora + 31 * 86_400_000).toISOString();
  const esito = { inviati: 0, saltati: 0, errori: 0 };

  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("user_id, stripe_subscription_id, tier, billing_interval, current_period_end, cancel_at_period_end, status")
    .eq("billing_interval", "year")
    .in("status", ["active", "trialing"])
    .eq("cancel_at_period_end", false)
    .gte("current_period_end", da)
    .lt("current_period_end", a);
  if (error) {
    logger.error("rinnovi", "lettura abbonamenti fallita:", error.message);
    return { ...esito, errori: 1 };
  }

  for (const sub of subs ?? []) {
    try {
      const periodo = sub.current_period_end ?? "";
      // Già inviato per questo periodo? Errore di lettura = non si invia (meglio
      // un promemoria in meno che uno doppio a ogni notte).
      const { count, error: logErr } = await admin
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("template", "renewal_reminder")
        .contains("meta", { subscription: sub.stripe_subscription_id, periodo });
      if (logErr) {
        logger.warn("rinnovi", "email_log non leggibile, promemoria rinviato:", logErr.message);
        esito.errori++;
        continue;
      }
      if ((count ?? 0) > 0) {
        esito.saltati++;
        continue;
      }

      const { data: u, error: uErr } = await admin.auth.admin.getUserById(sub.user_id);
      if (uErr || !u.user?.email) {
        esito.errori++;
        continue;
      }
      const nome = (u.user.user_metadata as { full_name?: string } | null)?.full_name?.trim() || "ciao";
      const tier = sub.tier as PaidTier;
      const piano = `${PLAN_LABELS[tier] ?? "Abbonamento N'arte"} annuale`;
      const data = new Date(periodo).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Rome",
      });
      const importo = formatPrice(PLAN_PRICES_CENTS[tier]?.year ?? 0);
      const manageUrl = `${getSiteUrl()}/dashboard/abbonamento`;

      const res = await dispatchEmail({
        key: "renewal_reminder",
        to: u.user.email,
        params: { name: nome, planLabel: piano, renewalDate: data, amountLabel: importo, manageUrl },
        meta: { subscription: sub.stripe_subscription_id, periodo },
        fallback: {
          subject: `Il tuo abbonamento si rinnova il ${data} — N'arte`,
          template: "renewal_reminder",
          react: createElement(NoticeEmail, {
            preview: "Nessuna azione richiesta se vuoi continuare.",
            heading: "Il rinnovo è vicino",
            paragraphs: [
              `Ciao ${nome}, il tuo abbonamento ${piano} si rinnova automaticamente. Se vuoi continuare non devi fare nulla.`,
              "Se vuoi disdire, fallo dalla pagina Abbonamento prima della data di rinnovo, senza costi: il piano resta attivo fino alla fine del periodo già pagato.",
            ],
            rows: [
              { label: "Rinnovo", value: data },
              { label: "Importo", value: `${importo} (senza IVA, regime forfettario)` },
            ],
            button: { label: "Gestisci l'abbonamento", href: manageUrl },
          }),
        },
      });
      if (res.ok) esito.inviati++;
      else esito.errori++;
    } catch (e) {
      esito.errori++;
      logger.error("rinnovi", sub.stripe_subscription_id, e instanceof Error ? e.message : String(e));
    }
  }
  return esito;
}
