/**
 * Contatti e lead dai form pubblici.
 *
 * Due lacune che questo file chiude: chi scrive dal form contatti oggi non
 * riceve nessuna conferma (resta col dubbio che il messaggio sia partito), e
 * i form `/format` e "richiesta evento" non notificano nessuno — i lead
 * finiscono in tabella e lì restano.
 */

import {
  buttonPair,
  callout,
  card,
  dataTable,
  em,
  eyebrow,
  internalBadge,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const contactMessage = defineTemplate({
  key: "contact_message",
  name: "N'arte · Messaggio dal form contatti [contact_message]",
  subject: "Nuovo messaggio da {{params.name}}",
  sample: {
    name: "Marco Esposito",
    email: "marco.esposito@example.com",
    subject: "Disponibilità per una serata a novembre",
    message: "Buongiorno, gestisco un locale a Napoli e vorrei organizzare una serata live.",
    adminUrl: "https://narteofficial.it/admin/leads",
  },
  html: layout({
    key: "contact_message",
    preheader: "Un nuovo messaggio dal form contatti del sito.",
    body: [
      internalBadge(),
      eyebrow("Form contatti"),
      title(`Messaggio da ${em(param("name"))}`),
      card(
        [
          sectionTitle("Messaggio"),
          dataTable([
            { icon: "user", label: "Nome", value: param("name") },
            { icon: "mail", label: "Email", value: param("email") },
            { icon: "doc", label: "Oggetto", value: param("subject"), onlyIf: "subject" },
            { icon: "chat", label: "Messaggio", value: param("message"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("adminUrl"), label: "Apri nel pannello" }),
      callout({
        text: "Puoi rispondere direttamente a questa email:<br />il mittente è impostato sull'indirizzo di chi ha scritto.",
      }),
    ].join("\n"),
  }),
});

/** Ricevuta a chi ha scritto. Oggi non riceve nulla. */
const contactReceipt = defineTemplate({
  key: "contact_receipt",
  name: "N'arte · Messaggio ricevuto [contact_receipt]",
  subject: "Abbiamo ricevuto il tuo messaggio — N'Arte",
  sample: {
    name: "Marco Esposito",
    email: "",
    subject: "Disponibilità per una serata a novembre",
    message: "Buongiorno, gestisco un locale a Napoli e vorrei organizzare una serata live.",
    adminUrl: "",
  },
  html: layout({
    key: "contact_receipt",
    preheader: "Abbiamo ricevuto il tuo messaggio: rispondiamo entro 48 ore.",
    body: [
      eyebrow("Messaggio ricevuto"),
      title(`Messaggio ${em("ricevuto.")}`),
      paragraph(
        `Grazie per averci scritto, ${param("name")}.<br />
              Abbiamo ricevuto il tuo messaggio e ti rispondiamo<br />
              in genere entro 48 ore.`
      ),
      card(
        [
          sectionTitle("Cosa ci hai scritto"),
          dataTable([
            { icon: "doc", label: "Oggetto", value: param("subject"), onlyIf: "subject" },
            { icon: "chat", label: "Messaggio", value: param("message"), multiline: true },
          ]),
        ].join("\n")
      ),
      callout({
        text: "Tieni d'occhio la tua casella di posta,<br />incluse Spam e Promozioni.",
      }),
    ].join("\n"),
  }),
});

/**
 * Lead dai form che oggi sono muti: `/format` e la richiesta evento.
 * Un'unica email con `source` a distinguere la provenienza, invece di due
 * template gemelli da tenere allineati.
 */
const publicLeadAdmin = defineTemplate({
  key: "public_lead_admin",
  name: "N'arte · Nuovo lead dai form pubblici [public_lead_admin]",
  subject: "Nuovo lead ({{params.source}}): {{params.name}}",
  sample: {
    source: "Format",
    name: "Marco Esposito",
    email: "marco.esposito@example.com",
    phone: "+39 333 000 0000",
    message: "Vorrei informazioni sul format per il mio locale.",
    adminUrl: "https://narteofficial.it/admin/leads",
  },
  html: layout({
    key: "public_lead_admin",
    preheader: "Un nuovo contatto è arrivato dai form pubblici del sito.",
    body: [
      internalBadge(),
      eyebrow("Nuovo lead"),
      title(`Lead da ${em(param("source"))}`),
      card(
        [
          sectionTitle("Contatto"),
          dataTable([
            { icon: "doc", label: "Provenienza", value: param("source") },
            { icon: "user", label: "Nome", value: param("name") },
            { icon: "mail", label: "Email", value: param("email"), onlyIf: "email" },
            { icon: "chat", label: "Telefono", value: param("phone"), onlyIf: "phone" },
            { icon: "chat", label: "Messaggio", value: param("message"), onlyIf: "message", multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("adminUrl"), label: "Apri nel pannello" }),
    ].join("\n"),
  }),
});

export const CONTACT_TEMPLATES = [contactMessage, contactReceipt, publicLeadAdmin];
