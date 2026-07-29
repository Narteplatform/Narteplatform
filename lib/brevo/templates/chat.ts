/**
 * Notifica di un nuovo messaggio in chat.
 * Design: "NUOVO MESSAGGIO IN CHAT.png".
 *
 * È la email commercialmente più importante fra quelle mancanti: il paywall
 * della chat presuppone che l'artista Free venga avvisato di aver ricevuto un
 * messaggio — altrimenti non ha motivo di passare a Pro. Oggi quella notifica
 * non parte da nessuna parte, nonostante un commento in `lib/chat/actions.ts`
 * la dia per esistente.
 *
 * Il contenuto del messaggio NON viene riportato: è deliberato. L'anteprima
 * in chiaro dentro l'email toglierebbe la ragione di aprire la chat, che è
 * esattamente ciò che il piano a pagamento vende.
 */

import {
  buttonPair,
  C,
  callout,
  em,
  eyebrow,
  layout,
  paragraph,
  param,
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

export const CHAT_TEMPLATES = [chatNewMessage];
