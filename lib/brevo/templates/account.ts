/**
 * Account: recupero password, conferma del cambio, benvenuto.
 *
 * Il recupero password è la lacuna più grave dell'intera piattaforma: oggi
 * non esiste né la pagina, né la Server Action, né il link nel login. Chi
 * perde la password resta fuori. Il template segue l'archetipo minimale del
 * design "NUOVO MESSAGGIO IN CHAT": nessuna immagine, un solo bottone
 * grande, niente distrazioni intorno all'azione da compiere.
 */

import {
  buttonPair,
  callout,
  em,
  eyebrow,
  layout,
  paragraph,
  param,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const passwordReset = defineTemplate({
  key: "password_reset",
  name: "N'arte · Recupero password [password_reset]",
  subject: "Reimposta la tua password — N'Arte",
  sample: {
    name: "Marco Esposito",
    actionUrl: "https://narteofficial.it/reset-password?token=esempio",
    expiresLabel: "60 minuti",
  },
  html: layout({
    key: "password_reset",
    preheader: "Il link per reimpostare la password scade a breve.",
    body: [
      eyebrow("Recupero accesso"),
      title(`Reimposta la tua ${em("password.")}`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, abbiamo ricevuto una richiesta<br />
              di reimpostare la password del tuo account N'Arte.<br />
              Clicca il bottone qui sotto per sceglierne una nuova.`
      ),
      buttonPair({ href: param("actionUrl"), label: "Scegli una nuova password" }),
      callout({
        tone: "warning",
        heading: "Il link scade fra {{params.expiresLabel}}",
        text: "Vale una sola volta. Se scade, richiedine un altro dalla pagina di accesso.",
      }),
      paragraph(
        `Se non hai richiesto tu il recupero, ignora questa email:<br />
              la tua password resta quella di prima e nessuno ha avuto accesso all'account.`
      ),
    ].join("\n"),
  }),
});

/**
 * Conferma del cambio password. Non è una cortesia: è il modo in cui un
 * utente si accorge che qualcun altro è entrato nel suo account.
 */
const passwordChanged = defineTemplate({
  key: "password_changed",
  name: "N'arte · Password modificata [password_changed]",
  subject: "La tua password è stata modificata",
  sample: {
    name: "Marco Esposito",
    whenLabel: "Martedì 21 Luglio 2026 alle 15:30",
    supportUrl: "https://narteofficial.it/contatti",
  },
  html: layout({
    key: "password_changed",
    preheader: "La password del tuo account è stata modificata.",
    body: [
      eyebrow("Sicurezza"),
      title(`Password ${em("modificata.")}`),
      paragraph(
        `Ciao ${param("name")}, la password del tuo account N'Arte<br />
              è stata modificata il ${param("whenLabel")}.`
      ),
      callout({
        tone: "danger",
        heading: "Non sei stato tu?",
        text: "Scrivici subito: blocchiamo l'account e ti aiutiamo a riprenderne il controllo.",
      }),
      buttonPair({ href: param("supportUrl"), label: "Contattaci" }),
    ].join("\n"),
  }),
});

/** Benvenuto a chi si registra come utente: nessun account da approvare. */
const welcomeUser = defineTemplate({
  key: "welcome_user",
  name: "N'arte · Benvenuto [welcome_user]",
  subject: "Benvenuto su N'Arte",
  sample: {
    name: "Marco Esposito",
    artistsUrl: "https://narteofficial.it/artisti",
    eventsUrl: "https://narteofficial.it/eventi",
  },
  html: layout({
    key: "welcome_user",
    preheader: "Il tuo account è attivo: scopri gli artisti della community.",
    body: [
      eyebrow("Account attivo"),
      title(`Benvenuto su ${em("N'Arte.")}`),
      paragraph(
        `Ciao ${param("name")}, il tuo account è attivo.<br />
              Da qui puoi scoprire gli artisti della community,<br />
              seguire gli eventi e richiedere un booking quando vuoi.`
      ),
      buttonPair(
        { href: param("artistsUrl"), label: "Scopri gli artisti" },
        { href: param("eventsUrl"), label: "Guarda gli eventi" }
      ),
      callout({
        heading: "Come funziona",
        text: "Trovi l'artista giusto, gli scrivi dalla sua pagina<br />e definite insieme data e dettagli. Senza intermediari.",
      }),
    ].join("\n"),
  }),
});

/**
 * Conferma della cancellazione dell'account.
 *
 * Il tono è deliberatamente asciutto e senza rimpianti: chi ha chiesto di
 * andarsene non va trattenuto con un'email che insiste. Quello che serve dirgli
 * è una cosa sola — che finora non è successo niente e che decide lui — più le
 * due conseguenze che non sono ovvie: che la rimozione richiede trenta giorni, e
 * che i messaggi già inviati restano a chi li ha ricevuti.
 */
const accountDeletionConfirm = defineTemplate({
  key: "account_deletion_confirm",
  name: "N'arte · Conferma cancellazione account [account_deletion_confirm]",
  subject: "Conferma la cancellazione del tuo account — N'Arte",
  sample: {
    name: "Marco Esposito",
    actionUrl: "https://narteofficial.it/account/cancellazione?token=esempio",
    expiresLabel: "48 ore",
  },
  html: layout({
    key: "account_deletion_confirm",
    preheader: "Non abbiamo ancora fatto nulla: si procede solo se confermi.",
    body: [
      eyebrow("Cancellazione account"),
      title(`Vuoi davvero ${em("cancellare")} il tuo account?`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, abbiamo ricevuto una richiesta di cancellazione<br />
              del tuo account N'Arte. <strong>Non abbiamo ancora fatto nulla</strong>:<br />
              si procede soltanto se confermi tu.`
      ),
      buttonPair({
        href: param("actionUrl"),
        label: "Confermo, cancella il mio account",
      }),
      callout({
        tone: "warning",
        heading: "Il link scade fra {{params.expiresLabel}}",
        text: "Se non sei stato tu, ignora questa email: senza conferma il tuo account resta esattamente com'è.",
      }),
      paragraph(
        `<strong>Quando confermi</strong>, il tuo accesso viene chiuso subito e il profilo<br />
              pubblico sparisce dal sito. La rimozione definitiva dei dati e dei file<br />
              avviene entro trenta giorni: fino ad allora si può tornare indietro.`
      ),
      paragraph(
        `<strong>Cosa resta.</strong> I documenti contabili degli abbonamenti, che siamo<br />
              tenuti a conservare per legge. E i messaggi che hai inviato in chat restano<br />
              visibili a chi li ha ricevuti: una conversazione ha due lati, e non possiamo<br />
              cancellare la copia altrui.`
      ),
    ].join("\n"),
  }),
});

export const ACCOUNT_TEMPLATES = [
  passwordReset,
  passwordChanged,
  welcomeUser,
  accountDeletionConfirm,
];
