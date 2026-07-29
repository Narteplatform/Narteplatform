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

/** Prezzo finale proposto su una data già confermata: serve l'ok dell'altra parte. */
const priceProposed = defineTemplate({
  key: "price_proposed",
  name: "N'arte · Prezzo finale proposto [price_proposed]",
  subject: "Proposta di cachet finale: {{params.priceLabel}}",
  sample: priceSample,
  html: layout({
    key: "price_proposed",
    preheader: "C'è una proposta di cachet finale da confermare.",
    body: [
      eyebrow("Cachet finale"),
      title(`Proposta di cachet ${em("finale.")}`),
      paragraph(
        `${param("proposedBy")} ha proposto il cachet finale<br />
              per la data del ${param("eventDate")}.<br />
              Diventa definitivo quando lo confermi anche tu.`
      ),
      highlight("Cachet proposto", param("priceLabel")),
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
        { href: param("bookingUrl"), label: "Conferma il cachet" },
        { href: param("chatUrl"), label: "Discutine in chat" }
      ),
    ].join("\n"),
  }),
});

/** Prezzo finale confermato da entrambi: è il documento dell'accordo. */
const priceConfirmed = defineTemplate({
  key: "price_confirmed",
  name: "N'arte · Prezzo finale confermato [price_confirmed]",
  subject: "Cachet finale confermato: {{params.priceLabel}}",
  sample: priceSample,
  html: layout({
    key: "price_confirmed",
    preheader: "Il cachet finale è confermato da entrambe le parti.",
    body: [
      eyebrow("Accordo chiuso"),
      title(`Cachet ${em("confermato.")}`),
      paragraph(
        `Il cachet finale per la data del ${param("eventDate")}<br />
              è stato confermato da entrambe le parti.<br />
              Conserva questa email: è il riepilogo dell'accordo.`
      ),
      highlight("Cachet concordato", param("priceLabel"), { tone: "success" }),
      card(
        [
          sectionTitle("Accordo"),
          dataTable([
            { icon: "star", label: "Artista", value: param("artistName") },
            { icon: "building", label: "Locale / Organizzatore", value: param("organizerName") },
            { icon: "calendar", label: "Data evento", value: param("eventDate") },
            { icon: "euro", label: "Cachet concordato", value: param("priceLabel") },
            { icon: "badge", label: "Stato", value: "Confermato da entrambe le parti" },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("bookingUrl"), label: "Visualizza la data" }),
    ].join("\n"),
  }),
});

export const CHAT_TEMPLATES = [chatNewMessage, chatNewOffer, priceProposed, priceConfirmed];
