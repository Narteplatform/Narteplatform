/**
 * Abbonamenti Stripe.
 *
 * Oggi il webhook non manda nessuna email: l'artista non sa quando
 * l'abbonamento si attiva, quando un pagamento fallisce, e soprattutto non
 * sa perché i suoi profili sono spariti dal sito dopo un downgrade. Sono le
 * quattro email con l'impatto commerciale più diretto fra quelle mancanti.
 *
 * Nessun design fornito: declinate dagli stessi blocchi, con il colore del
 * riquadro a distinguere la buona notizia dall'avviso.
 */

import {
  buttonPair,
  callout,
  card,
  dataTable,
  em,
  eyebrow,
  highlight,
  ifParam,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const subscriptionActivated = defineTemplate({
  key: "subscription_activated",
  name: "N'arte · Abbonamento attivo [subscription_activated]",
  subject: "Abbonamento {{params.planName}} attivo — N'Arte",
  sample: {
    artistName: "Marina Blu",
    planName: "Pro",
    priceLabel: "€9,99",
    periodLabel: "mensile",
    renewalDate: "Domenica 21 Ottobre 2026",
    invoiceUrl: "https://invoice.stripe.com/i/example",
    billingUrl: "https://narteofficial.it/dashboard/abbonamento",
  },
  html: layout({
    key: "subscription_activated",
    preheader: "Il tuo piano è attivo: ecco cosa cambia da adesso.",
    body: [
      eyebrow("Pagamento riuscito"),
      title(`Piano ${em(param("planName"))} attivo.`),
      paragraph(
        `Ciao ${param("artistName")}, il pagamento è andato a buon fine<br />
              e il tuo piano è attivo da subito.`
      ),
      card(
        [
          sectionTitle("Il tuo abbonamento"),
          dataTable([
            { icon: "badge", label: "Piano", value: param("planName") },
            { icon: "euro", label: "Importo", value: param("priceLabel") },
            { icon: "timer", label: "Fatturazione", value: param("periodLabel") },
            { icon: "calendar", label: "Prossimo rinnovo", value: param("renewalDate"), onlyIf: "renewalDate" },
          ]),
        ].join("\n")
      ),
      buttonPair(
        { href: param("billingUrl"), label: "Gestisci l'abbonamento" },
        { href: param("invoiceUrl"), label: "Scarica la fattura" }
      ),
      callout({
        text: "Puoi disdire quando vuoi dal pannello: il piano resta attivo<br />fino alla fine del periodo già pagato.",
      }),
    ].join("\n"),
  }),
});

/**
 * Pagamento fallito. È l'email più urgente della famiglia: senza, l'artista
 * scopre il downgrade quando il profilo è già sparito dal sito. `retryDate`
 * dice quanto tempo ha per rimediare.
 */
const paymentFailed = defineTemplate({
  key: "payment_failed",
  name: "N'arte · Pagamento non riuscito [payment_failed]",
  subject: "Pagamento non riuscito — aggiorna il metodo",
  sample: {
    artistName: "Marina Blu",
    planName: "Pro",
    amountLabel: "€9,99",
    retryDate: "Giovedì 25 Settembre 2026",
    billingUrl: "https://narteofficial.it/dashboard/abbonamento",
  },
  html: layout({
    key: "payment_failed",
    preheader: "Non siamo riusciti ad addebitare il rinnovo: aggiorna il metodo di pagamento.",
    body: [
      eyebrow("Attenzione"),
      title(`Pagamento ${em("non riuscito.")}`),
      paragraph(
        `Ciao ${param("artistName")}, non siamo riusciti ad addebitare<br />
              il rinnovo del tuo piano ${param("planName")}.<br />
              Di solito dipende da una carta scaduta o da fondi insufficienti.`
      ),
      highlight("Importo non addebitato", param("amountLabel"), { tone: "warning" }),
      ifParam(
        "retryDate",
        callout({
          tone: "warning",
          heading: "Hai tempo fino al",
          text: `${param("retryDate")}. Dopo quella data il piano torna a Free<br />e i profili oltre il primo vengono spubblicati dal sito.`,
        })
      ),
      buttonPair({ href: param("billingUrl"), label: "Aggiorna il metodo di pagamento" }),
    ].join("\n"),
  }),
});

const subscriptionCancelled = defineTemplate({
  key: "subscription_cancelled",
  name: "N'arte · Abbonamento disdetto [subscription_cancelled]",
  subject: "Abbonamento disdetto — resta attivo fino al {{params.endDate}}",
  sample: {
    artistName: "Marina Blu",
    planName: "Pro",
    endDate: "Domenica 21 Ottobre 2026",
    billingUrl: "https://narteofficial.it/dashboard/abbonamento",
  },
  html: layout({
    key: "subscription_cancelled",
    preheader: "La disdetta è registrata: il piano resta attivo fino a fine periodo.",
    body: [
      eyebrow("Disdetta registrata"),
      title(`Abbonamento ${em("disdetto.")}`),
      paragraph(
        `Ciao ${param("artistName")}, abbiamo registrato la disdetta del piano ${param("planName")}.<br />
              Nessun altro addebito verrà effettuato.`
      ),
      highlight("Il piano resta attivo fino al", param("endDate")),
      paragraph(
        `Dopo quella data l'account torna al piano Free.<br />
              Il profilo principale resta online; gli eventuali profili aggiuntivi<br />
              vengono spubblicati, ma non cancellati: si riattivano se riprendi il piano.`
      ),
      buttonPair({ href: param("billingUrl"), label: "Riattiva l'abbonamento" }),
      callout({
        text: "Le richieste di booking restano illimitate anche sul piano Free:<br />non blocchiamo mai un organizzatore che ti sta cercando.",
      }),
    ].join("\n"),
  }),
});

/**
 * Profili spubblicati per superamento del limite del piano. Il trigger nel
 * database lo fa già in silenzio (`sync_account_profile_suspension`): questa
 * email è l'unica cosa che separa l'artista dallo scoprirlo da solo.
 */
const profilesSuspended = defineTemplate({
  key: "profiles_suspended",
  name: "N'arte · Profili spubblicati [profiles_suspended]",
  subject: "Alcuni tuoi profili non sono più online",
  sample: {
    artistName: "Marina Blu",
    planName: "Free",
    profileNames: "Marina Blu Trio, Blu Acustico",
    allowedLabel: "1 profilo",
    billingUrl: "https://narteofficial.it/dashboard/abbonamento",
  },
  html: layout({
    key: "profiles_suspended",
    preheader: "Alcuni profili sono stati spubblicati: il piano attuale non li copre.",
    body: [
      eyebrow("Profili non più online"),
      title(`Alcuni profili sono stati ${em("spubblicati.")}`),
      paragraph(
        `Ciao ${param("artistName")}, il tuo piano ${param("planName")} include ${param("allowedLabel")}.<br />
              I profili che superano il limite non sono più visibili sul sito.`
      ),
      card(
        [
          sectionTitle("Profili coinvolti"),
          dataTable([
            { icon: "star", label: "Non più online", value: param("profileNames"), multiline: true },
            { icon: "badge", label: "Piano attuale", value: param("planName") },
            { icon: "check", label: "Profili inclusi", value: param("allowedLabel") },
          ]),
        ].join("\n")
      ),
      callout({
        heading: "Nulla è stato cancellato",
        text: "I profili e i loro contenuti sono al sicuro.<br />Tornano online da soli appena riprendi un piano che li copre.",
      }),
      buttonPair({ href: param("billingUrl"), label: "Rimetti online i profili" }),
    ].join("\n"),
  }),
});

export const BILLING_TEMPLATES = [
  subscriptionActivated,
  paymentFailed,
  subscriptionCancelled,
  profilesSuspended,
];
