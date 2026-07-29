/**
 * Promemoria pre-evento e invito a recensire.
 *
 * A differenza di tutte le altre, queste due non partono da un'azione
 * dell'utente ma dal passare del tempo: servono un cron (Vercel Cron) che
 * interroghi `booking_requests` e le faccia partire. I template esistono
 * già così che, quando il cron ci sarà, resti solo da chiamarlo.
 *
 * Archetipo "promemoria": la data in evidenza al posto dell'immagine, perché
 * è l'unica informazione che conta davvero in una email letta di fretta.
 */

import {
  buttonPair,
  callout,
  card,
  dataTable,
  em,
  eyebrow,
  highlight,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const eventReminder = defineTemplate({
  key: "event_reminder",
  name: "N'arte · Promemoria evento [event_reminder]",
  subject: "Promemoria: {{params.eventDate}} con {{params.counterpartName}}",
  sample: {
    recipientName: "Marina Blu",
    counterpartName: "Duel Club",
    whenLabel: "fra 7 giorni",
    eventDate: "Sabato 21 Settembre 2026",
    eventTime: "22:00 – 01:00",
    city: "Napoli",
    address: "Via Placeholder 25, Napoli",
    priceLabel: "€450",
    bookingUrl: "https://narteofficial.it/dashboard/richieste",
    chatUrl: "https://narteofficial.it/dashboard/chat",
  },
  html: layout({
    key: "event_reminder",
    preheader: "La data confermata si avvicina: ecco il riepilogo.",
    body: [
      eyebrow("Promemoria"),
      title(`Ci vediamo ${em(param("whenLabel"))}.`),
      paragraph(
        `Ciao ${param("recipientName")}, la data confermata con ${param("counterpartName")}<br />
              si avvicina. Qui sotto il riepilogo, per non doverlo cercare.`
      ),
      highlight("Data dell'evento", param("eventDate")),
      card(
        [
          sectionTitle("Dettagli"),
          dataTable([
            { icon: "star", label: "Con", value: param("counterpartName") },
            { icon: "clock", label: "Orario", value: param("eventTime"), onlyIf: "eventTime" },
            { icon: "pin", label: "Luogo", value: param("city"), onlyIf: "city" },
            { icon: "map", label: "Indirizzo", value: param("address"), onlyIf: "address" },
            { icon: "euro", label: "Cachet concordato", value: param("priceLabel"), onlyIf: "priceLabel" },
          ]),
        ].join("\n")
      ),
      buttonPair(
        { href: param("bookingUrl"), label: "Visualizza la data" },
        { href: param("chatUrl"), label: "Apri la chat" }
      ),
      callout({
        text: "Ultimi dettagli da definire? La chat è ancora aperta:<br />è il posto giusto per accordarsi su orari e logistica.",
      }),
    ].join("\n"),
  }),
});

/**
 * Invito a recensire, il giorno dopo l'evento. Le recensioni sono già
 * previste dal database (`feedback`, con il vincolo che l'evento sia
 * passato) ma nessuno le chiede mai: senza questa email la tabella resta
 * vuota e i profili degli artisti restano senza riprova sociale.
 */
const feedbackRequest = defineTemplate({
  key: "feedback_request",
  name: "N'arte · Invito a recensire [feedback_request]",
  subject: "Com'è andata con {{params.artistName}}?",
  sample: {
    organizerName: "Duel Club",
    artistName: "Marina Blu",
    eventDate: "Sabato 21 Settembre 2026",
    feedbackUrl: "https://narteofficial.it/organizzatore/richieste",
  },
  html: layout({
    key: "feedback_request",
    preheader: "Bastano due minuti per lasciare una recensione all'artista.",
    body: [
      eyebrow("Com'è andata"),
      title(`Raccontaci com'è ${em("andata.")}`),
      paragraph(
        `Ciao ${param("organizerName")}, ieri ${param("artistName")} ha suonato da voi.<br />
              Lasciare una recensione richiede due minuti e aiuta l'artista<br />
              a farsi scegliere dai prossimi organizzatori.`
      ),
      buttonPair({ href: param("feedbackUrl"), label: `Recensisci ${param("artistName")}` }),
      callout({
        heading: "Perché conta",
        text: "Gli artisti emergenti non hanno un curriculum a cui fare riferimento.<br />Le recensioni sono l'unica cosa che parla per loro.",
      }),
    ].join("\n"),
  }),
});

export const LIFECYCLE_TEMPLATES = [eventReminder, feedbackRequest];
