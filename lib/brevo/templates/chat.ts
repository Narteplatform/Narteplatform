/**
 * Chat e trattativa economica.
 * Design: "NUOVO MESSAGGIO IN CHAT.png"; le altre tre lo declinano.
 *
 * `chat_new_message` è la email commercialmente più importante fra quelle
 * mancanti: il paywall della chat presuppone che l'artista Free venga
 * avvisato di aver ricevuto un messaggio — altrimenti non ha motivo di
 * passare a Pro. Oggi quella notifica non parte da nessuna parte, nonostante
 * un commento in `lib/chat/actions.ts` la dia per esistente.
 *
 * Nessuna di queste email riporta il contenuto della conversazione, solo
 * l'importo quando c'è. È deliberato: l'anteprima in chiaro toglierebbe la
 * ragione di aprire la chat, che è esattamente ciò che il piano vende.
 */

import {
  buttonPair,
  C,
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

const chatNewMessage = defineTemplate({
  key: "chat_new_message",
  name: "N'arte · Nuovo messaggio in chat [chat_new_message]",
  subject: "Hai un nuovo messaggio su N'Arte",
  sample: {
    chatUrl: "https://narteofficial.it/dashboard/chat",
  },
  html: layout({
    key: "chat_new_message",
    preheader: "Apri la chat per leggere il messaggio e rispondere.",
    body: [
      eyebrow("Nuovo messaggio"),
      title(`Hai un nuovo<br />${em("messaggio")} in chat.`, { size: "xl" }),
      paragraph(
        `Hai ricevuto un nuovo messaggio nella tua conversazione su N'Arte.<br />
              Apri subito la chat per leggere il contenuto<br />
              e rispondere rapidamente.`
      ),
      buttonPair(
        { href: param("chatUrl"), label: "Apri la chat" },
        { href: param("chatUrl"), label: "Rispondi al messaggio" }
      ),
      callout({
        icon: "bulb",
        heading: "N'Arte Tips",
        text: `Gli utenti che rispondono velocemente<br />nelle loro trattative hanno l'<strong style="color:${C.success};">80%</strong><br />di possibilità in più di concluderle.`,
      }),
    ].join("\n"),
  }),
});

/** Offerta economica ricevuta in chat: qui l'importo si mostra, è il punto. */
const chatNewOffer = defineTemplate({
  key: "chat_new_offer",
  name: "N'arte · Nuova offerta in chat [chat_new_offer]",
  subject: "Nuova offerta da {{params.fromName}} — {{params.priceLabel}}",
  sample: {
    fromName: "Duel Club",
    eventDate: "Sabato 21 Settembre 2026",
    priceLabel: "€450",
    chatUrl: "https://narteofficial.it/dashboard/chat",
  },
  html: layout({
    key: "chat_new_offer",
    preheader: "Hai ricevuto un'offerta economica: accettala o rilancia in chat.",
    body: [
      eyebrow("Nuova offerta"),
      title(`Hai ricevuto un'${em("offerta.")}`),
      paragraph(
        `${param("fromName")} ti ha inviato un'offerta per la data del ${param("eventDate")}.<br />
              Puoi accettarla o rispondere con una controproposta dalla chat.`
      ),
      highlight("Offerta ricevuta", param("priceLabel")),
      buttonPair({ href: param("chatUrl"), label: "Vedi l'offerta in chat" }),
      callout({
        text: "Accettando l'offerta la data viene confermata<br />e bloccata nel calendario di entrambi.",
      }),
    ].join("\n"),
  }),
});

const priceSample = {
  artistName: "Marina Blu",
  organizerName: "Duel Club",
  eventDate: "Sabato 21 Settembre 2026",
  priceLabel: "€450",
  proposedBy: "Duel Club",
  bookingUrl: "https://narteofficial.it/organizzatore/richieste",
  chatUrl: "https://narteofficial.it/organizzatore/chat",
};

/** Compenso proposto su una data già confermata: serve l'ok dell'altra parte. Promemoria fra le parti. */
const priceProposed = defineTemplate({
  key: "price_proposed",
  name: "N'arte · Prezzo finale proposto [price_proposed]",
  subject: "Compenso proposto da annotare: {{params.priceLabel}}",
  sample: priceSample,
  html: layout({
    key: "price_proposed",
    preheader: "C'è un compenso proposto da confermare come promemoria.",
    body: [
      eyebrow("Compenso – promemoria"),
      title(`Compenso ${em("proposto.")}`),
      paragraph(
        `${param("proposedBy")} ha proposto il compenso<br />
              per la data del ${param("eventDate")}.<br />
              Viene annotato come concordato quando lo confermi anche tu.<br />
              Annotazione fra le parti: N'arte non è parte dell'accordo e non gestisce pagamenti.`
      ),
      highlight("Budget indicato", param("priceLabel")),
      card(
        [
          sectionTitle("Data interessata"),
          dataTable([
            { icon: "star", label: "Artista", value: param("artistName") },
            { icon: "building", label: "Locale / Organizzatore", value: param("organizerName") },
            { icon: "calendar", label: "Data evento", value: param("eventDate") },
          ]),
        ].join("\n")
      ),
      buttonPair(
        { href: param("bookingUrl"), label: "Conferma il compenso" },
        { href: param("chatUrl"), label: "Discutine in chat" }
      ),
    ].join("\n"),
  }),
});

/** Compenso confermato da entrambi: promemoria fra le parti, N'arte non ne è parte. */
const priceConfirmed = defineTemplate({
  key: "price_confirmed",
  name: "N'arte · Prezzo finale confermato [price_confirmed]",
  subject: "Compenso annotato dalle parti: {{params.priceLabel}}",
  sample: priceSample,
  html: layout({
    key: "price_confirmed",
    preheader: "Il compenso è stato annotato da entrambe le parti.",
    body: [
      eyebrow("Compenso – promemoria"),
      title(`Compenso ${em("annotato.")}`),
      paragraph(
        `Il compenso per la data del ${param("eventDate")}<br />
              è stato annotato da entrambe le parti.<br />
              Conserva questa email come promemoria.<br />
              Annotazione fra le parti: N'arte non è parte dell'accordo e non gestisce pagamenti.`
      ),
      highlight("Compenso annotato dalle parti", param("priceLabel"), { tone: "success" }),
      card(
        [
          sectionTitle("Promemoria"),
          dataTable([
            { icon: "star", label: "Artista", value: param("artistName") },
            { icon: "building", label: "Locale / Organizzatore", value: param("organizerName") },
            { icon: "calendar", label: "Data evento", value: param("eventDate") },
            { icon: "euro", label: "Compenso annotato dalle parti", value: param("priceLabel") },
            { icon: "badge", label: "Stato", value: "Confermato da entrambe le parti" },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("bookingUrl"), label: "Visualizza la data" }),
    ].join("\n"),
  }),
});

export const CHAT_TEMPLATES = [chatNewMessage, chatNewOffer, priceProposed, priceConfirmed];
