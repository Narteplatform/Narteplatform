/**
 * Candidatura artista: ricevuta, copia interna, approvazione, rifiuto.
 * Design: "ISCRIZIONE ARTISTA RICEVUTA.png", "BENVENUTO ARTISTA.png".
 * Le altre due sono declinate dagli stessi blocchi.
 */

import {
  buttonPair,
  callout,
  card,
  cardTitle,
  dataTable,
  em,
  eyebrow,
  hero,
  ifParam,
  heroPlaceholder,
  internalBadge,
  layout,
  paragraph,
  param,
  sectionTitle,
  timeline,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

/**
 * NOTA — nel mockup questo testo è interamente statico. Qui il nome del
 * candidato compare in due punti, ricalcando la versione organizzatore
 * ("Grazie per esserti registrato su N'Arte, Duel Club."), che il mockup
 * personalizza. Per tornare al testo impersonale del design bastano due
 * `param()` in meno.
 *
 * TODO: nel mockup l'immagine di apertura è uno scatto live che nel repo non
 * esiste; qui si usa `hero-strumenti.png`.
 */
const applicationReceived = defineTemplate({
  key: "application_received",
  name: "N'arte · Candidatura ricevuta [application_received]",
  subject: "Candidatura ricevuta — N'Arte",
  sample: {
    applicantName: "Marco Esposito",
    stageName: "Marina Blu",
    email: "",
    genres: "",
    adminUrl: "",
  },
  html: layout({
    key: "application_received",
    preheader: "Abbiamo ricevuto la tua candidatura: la esaminiamo entro 24 ore.",
    body: [
      eyebrow("Iscrizione completata"),
      title(`Candidatura ${em("ricevuta.")}`),
      hero("hero-strumenti.png"),
      paragraph(
        `Grazie per esserti iscritto a N'Arte, ${param("applicantName")}.<br />
              Il nostro team esaminerà la tua candidatura entro 24 ore.<br />
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
              text: `Abbiamo ricevuto la tua candidatura come ${param("stageName")}.`,
            },
            { icon: "clock", text: "Il team N'Arte la esaminerà entro 24 ore." },
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

/**
 * Copia interna. Niente foto e niente timeline: qui serve leggere i dati e
 * arrivare al pannello in un clic, non essere accolti. La fascia in cima
 * evita di confonderla con l'email che riceve il candidato.
 */
const applicationReceivedAdmin = defineTemplate({
  key: "application_received_admin",
  name: "N'arte · Candidatura ricevuta, copia interna [application_received_admin]",
  subject: "Nuova candidatura: {{params.stageName}}",
  sample: {
    applicantName: "Marco Esposito",
    stageName: "Marina Blu",
    email: "marco.esposito@example.com",
    genres: "Indie, Cantautorato",
    adminUrl: "https://narteofficial.it/admin/artisti",
  },
  html: layout({
    key: "application_received_admin",
    preheader: "Una nuova candidatura è in attesa di revisione.",
    body: [
      internalBadge(),
      eyebrow("Nuova candidatura"),
      title(`Candidatura da ${em(param("stageName"))}`),
      card(
        [
          sectionTitle("Dati del candidato"),
          dataTable([
            { icon: "user", label: "Nome", value: param("applicantName") },
            { icon: "star", label: "Nome d'arte", value: param("stageName") },
            { icon: "mail", label: "Email", value: param("email") },
            { icon: "mic", label: "Generi", value: param("genres"), onlyIf: "genres" },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("adminUrl"), label: "Apri in /admin/artisti" }),
      callout({
        text: "Rispondere entro 24 ore è la promessa fatta al candidato<br />nell'email che ha appena ricevuto.",
      }),
    ].join("\n"),
  }),
});

/**
 * ATTENZIONE — il mockup mostra "Placeholder immagine": la foto di apertura
 * non è ancora stata fornita. `heroPlaceholder()` disegna quel riquadro
 * tratteggiato, che va sostituito con `hero(...)` prima di attivare l'email:
 * in una casella vera sembrerebbe un errore.
 *
 * Il testo del bottone ricalca il design ("Accedi al lato admin"), anche se
 * per un artista l'area non è `/admin` ma la sua dashboard: è una scelta di
 * copy da confermare.
 */
const artistApproved = defineTemplate({
  key: "artist_approved",
  name: "N'arte · Benvenuto artista [artist_approved]",
  subject: "Candidatura approvata — N'Arte",
  sample: {
    applicantName: "Marco Esposito",
    stageName: "Marina Blu",
    actionUrl: "https://narteofficial.it/login",
    profileUrl: "https://narteofficial.it/dashboard/profili",
  },
  html: layout({
    key: "artist_approved",
    preheader: "Il tuo account artista è attivo: accedi e crea il tuo profilo.",
    body: [
      eyebrow("Account approvato"),
      title(`Benvenuto ${em("artista.")}`),
      heroPlaceholder(),
      paragraph(
        `Il team di N'Arte ha approvato il tuo account artista.<br />
              Da questo momento puoi accedere alla piattaforma<br />
              e iniziare a creare il tuo Profilo Artista.`
      ),
      buttonPair(
        { href: param("actionUrl"), label: "Accedi al lato admin" },
        { href: param("profileUrl"), label: "Crea il Profilo Artista" }
      ),
      card(
        [
          cardTitle("Cosa succede ora"),
          timeline([
            { icon: "check", tone: "done", text: "Accedi al tuo account<br />dall'area admin." },
            { icon: "user", text: "Completa il tuo Profilo Artista<br />con bio, foto e dettagli." },
            { icon: "send", text: "Dopo la pubblicazione,<br />potrai iniziare a ricevere richieste." },
          ]),
        ].join("\n")
      ),
      callout({
        text: "Ti consigliamo di completare subito il profilo<br />per aumentare la qualità della tua presentazione.",
      }),
    ].join("\n"),
  }),
});

/**
 * Rifiuto. Oggi il candidato non riceve nulla e resta ad aspettare a tempo
 * indeterminato: è la ragione per cui questa email esiste.
 *
 * Tono asciutto e non definitivo — chi si candida oggi può ricandidarsi
 * domani con materiale migliore, e la porta va lasciata aperta. `reason` è
 * facoltativa: se l'admin non scrive nulla il riquadro sparisce e resta il
 * testo generico.
 */
const applicationRejected = defineTemplate({
  key: "application_rejected",
  name: "N'arte · Candidatura non accolta [application_rejected]",
  subject: "Aggiornamento sulla tua candidatura — N'Arte",
  sample: {
    applicantName: "Marco Esposito",
    stageName: "Marina Blu",
    reason: "Al momento cerchiamo profili con almeno tre brani pubblicati.",
    siteUrl: "https://narteofficial.it/candidatura-artista",
  },
  html: layout({
    key: "application_rejected",
    preheader: "Un aggiornamento sulla candidatura che ci hai inviato.",
    body: [
      eyebrow("Esito candidatura"),
      title(`Per ora ci fermiamo ${em("qui.")}`),
      paragraph(
        `Ciao ${param("applicantName")}, abbiamo esaminato la candidatura di ${param("stageName")}<br />
              e per questa selezione non possiamo procedere.<br />
              Non è un giudizio sul tuo valore artistico: dipende dagli spazi<br />
              e dalle esigenze del nostro palinsesto in questo momento.`
      ),
      // Senza il condizionale, un rifiuto senza motivazione mostrerebbe un
      // riquadro giallo vuoto — peggio che non mostrarlo affatto.
      ifParam("reason", callout({ tone: "warning", heading: "Perché", text: param("reason") })),
      paragraph(
        `Puoi ricandidarti quando vuoi. Ogni nuova candidatura viene<br />
              esaminata da zero, senza tenere conto delle precedenti.`
      ),
      buttonPair({ href: param("siteUrl"), label: "Candidati di nuovo" }),
    ].join("\n"),
  }),
});

export const APPLICATION_TEMPLATES = [
  applicationReceived,
  applicationReceivedAdmin,
  artistApproved,
  applicationRejected,
];
