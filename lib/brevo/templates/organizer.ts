/**
 * Registrazione organizzatore: ricevuta e attivazione.
 * Design: "ISCRIZIONE ORGANIZZATORE RICEVUTA.png", "BENVENUTO ORGANIZZATORE.png".
 *
 * APPROVAZIONE. Dalla migration 0071 la revisione promessa da questi design
 * esiste davvero: `organizers.approval_status` parte da `pending` e il team
 * approva da /admin/utenti. Le due email sono quindi veritiere e si possono
 * abilitare aggiungendo le chiavi a BREVO_ENABLED_KEYS. Il codice le invia già
 * (con fallback Resend finché la chiave non è abilitata):
 *   - organizer_registration_received → lib/organizers/approvazione.ts
 *   - organizer_approved              → app/(admin)/admin/utenti/_actions.ts
 * Il testo «entro 24 ore» è un impegno operativo del team: va rispettato o
 * ammorbidito nel template prima di pubblicarlo.
 */

import {
  buttonPair,
  callout,
  card,
  cardTitle,
  em,
  eyebrow,
  hero,
  heroPlaceholder,
  layout,
  paragraph,
  param,
  timeline,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const organizerRegistrationReceived = defineTemplate({
  key: "organizer_registration_received",
  name: "N'arte · Registrazione organizzatore ricevuta [organizer_registration_received]",
  subject: "Registrazione ricevuta — N'Arte",
  sample: {
    organizerName: "Duel Club",
    roleLabel: "Organizzatore",
  },
  html: layout({
    key: "organizer_registration_received",
    preheader: "Abbiamo ricevuto la tua registrazione: la esaminiamo entro 24 ore.",
    body: [
      eyebrow("Registrazione completata"),
      title(`Registrazione ${em("ricevuta.")}`),
      hero("hero-strumenti.png"),
      paragraph(
        `Grazie per esserti registrato su N'Arte, ${param("organizerName")}.<br />
              Abbiamo ricevuto la tua richiesta come ${param("roleLabel")}.<br />
              Il nostro team esaminerà il tuo profilo entro 24 ore.<br />
              In caso di esito positivo, riceverai una nuova email<br />
              con l'attivazione del tuo account.`
      ),
      card(
        [
          cardTitle("Cosa succede ora"),
          timeline([
            {
              icon: "check",
              tone: "done",
              text: `Abbiamo ricevuto la registrazione<br />di ${param("organizerName")}.`,
            },
            {
              icon: "clock",
              text: `Il team N'Arte esaminerà il tuo<br />profilo ${param("roleLabel")} entro 24 ore.`,
            },
            {
              icon: "mail",
              text: "Se l'esito sarà positivo, riceverai<br />la mail di attivazione del tuo account.",
            },
          ]),
        ].join("\n")
      ),
      callout({
        text: "Tieni d'occhio la tua casella di posta,<br />incluse Spam e Promozioni.",
      }),
    ].join("\n"),
  }),
});

/** Anche qui il mockup riporta "Placeholder immagine": foto ancora da fornire. */
const organizerApproved = defineTemplate({
  key: "organizer_approved",
  name: "N'arte · Benvenuto organizzatore [organizer_approved]",
  subject: "Account approvato — N'Arte",
  sample: {
    organizerName: "Duel Club",
    actionUrl: "https://narteofficial.it/login",
    profileUrl: "https://narteofficial.it/organizzatore",
  },
  html: layout({
    key: "organizer_approved",
    preheader: "Il tuo account è attivo: accedi e completa il profilo del locale.",
    body: [
      eyebrow("Account approvato"),
      title(`Benvenuto ${em("locale.")}`),
      heroPlaceholder(),
      paragraph(
        `Il team di N'Arte ha approvato il tuo account locale.<br />
              Da questo momento puoi accedere alla piattaforma<br />
              e iniziare a creare il tuo Profilo Locale.`
      ),
      buttonPair(
        { href: param("actionUrl"), label: "Accedi al lato admin" },
        { href: param("profileUrl"), label: "Crea il Profilo Locale" }
      ),
      card(
        [
          cardTitle("Cosa succede ora"),
          timeline([
            { icon: "check", tone: "done", text: "Accedi al tuo account<br />dall'area admin." },
            { icon: "store", text: "Completa il tuo Profilo Locale<br />con foto, descrizione e dettagli." },
            { icon: "send", text: "Dopo la pubblicazione,<br />potrai iniziare a trovare artisti." },
          ]),
        ].join("\n")
      ),
      callout({
        text: "Ti consigliamo di completare subito il profilo<br />per presentare al meglio il tuo locale.",
      }),
    ].join("\n"),
  }),
});

export const ORGANIZER_TEMPLATES = [organizerRegistrationReceived, organizerApproved];
