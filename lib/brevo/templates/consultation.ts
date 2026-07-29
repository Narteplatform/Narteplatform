/**
 * Consulenze: richiesta, conferma, copie interne, promemoria.
 * Design: "CONFERMA CONSULENZA.png"; le altre quattro lo declinano.
 *
 * `consultation_confirmed_artist` corregge un difetto del testo attuale:
 * oggi la prenotazione dell'artista viene salvata già `confirmed`, ma riusa
 * il template della *richiesta* e quindi promette che "un consulente ti
 * contatterà per confermare l'appuntamento" mentre l'oggetto annuncia
 * l'appuntamento confermato.
 *
 * Righe condizionali: modalità, link e tema non hanno ancora una colonna in
 * `consultations` / `consultant_slots`. Il link è la più importante: senza,
 * l'email annuncia una videochiamata a cui non si può partecipare. Finché
 * non esistono, quelle righe non compaiono.
 */

import {
  buttonPair,
  C,
  callout,
  card,
  cardTitle,
  type DataRow,
  dataTable,
  em,
  eyebrow,
  highlight,
  internalBadge,
  layout,
  paragraph,
  param,
  sectionTitle,
  timeline,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

/** Il link va reso cliccabile, non stampato come testo. */
const meetingLink = `<a href="${param("meetingUrl")}" target="_blank" style="color:${C.accent};text-decoration:none;">${param("meetingUrl")}</a>`;

/** Scheda completa dell'appuntamento, condivisa dalle email confermate. */
const appointmentRows: DataRow[] = [
  { icon: "star", label: "Artista", value: param("name") },
  { icon: "user", label: "Consulente N'Arte", value: param("consultantName"), onlyIf: "consultantName" },
  { icon: "calendar", label: "Data appuntamento", value: param("dateLabel") },
  { icon: "clock", label: "Orario", value: param("timeLabel") },
  { icon: "timer", label: "Durata", value: param("durationLabel"), onlyIf: "durationLabel" },
  { icon: "video", label: "Modalità", value: param("modeLabel"), onlyIf: "modeLabel" },
  { icon: "link", label: "Link consulenza", value: meetingLink, onlyIf: "meetingUrl" },
  { icon: "doc", label: "Tema", value: param("topic"), onlyIf: "topic" },
  { icon: "badge", label: "Stato appuntamento", value: param("statusLabel") },
  { icon: "chat", label: "Note", value: param("notes"), onlyIf: "notes", multiline: true },
];

const CONSULTATION_SAMPLE = {
  name: "Marina Blu",
  consultantName: "Giulia Ferrara",
  dateLabel: "Mercoledì 25 Settembre 2026",
  timeLabel: "15:30",
  durationLabel: "45 minuti",
  modeLabel: "Videochiamata",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  topic: "Consulenza Profilo Artista",
  statusLabel: "Confermato",
  notes:
    "Collegati 5 minuti prima dell'orario previsto. Se hai bisogno di modificare o annullare l'appuntamento, puoi farlo dal tuo pannello cliente.",
  panelUrl: "https://narteofficial.it/dashboard/consulenza",
  calendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
  email: "marina.blu@example.com",
  phone: "+39 333 000 0000",
  adminUrl: "https://narteofficial.it/admin/consulenza",
};

const consultationConfirmedArtist = defineTemplate({
  key: "consultation_confirmed_artist",
  name: "N'arte · Consulenza confermata [consultation_confirmed_artist]",
  subject: "Consulenza confermata · {{params.dateLabel}}",
  sample: CONSULTATION_SAMPLE,
  html: layout({
    key: "consultation_confirmed_artist",
    preheader: "Il tuo appuntamento è confermato: qui trovi tutti i dettagli.",
    body: [
      eyebrow("Consulenza prenotata"),
      title(`La tua consulenza è ${em("confermata.")}`),
      paragraph(
        `Hai prenotato correttamente una consulenza con un consulente N'Arte tramite il tuo pannello cliente.<br />
              Qui sotto trovi tutti i dettagli del tuo appuntamento.`
      ),
      card([sectionTitle("Dettagli della consulenza"), dataTable(appointmentRows)].join("\n")),
      buttonPair(
        { href: param("panelUrl"), label: "Vai al pannello cliente" },
        { href: param("calendarUrl"), label: "Aggiungi al calendario" }
      ),
      callout({
        heading: "N'Arte Tips",
        text: "Per ottenere il massimo dalla consulenza, prepara in anticipo<br />dubbi, obiettivi e materiali utili da condividere con il consulente.",
      }),
    ].join("\n"),
  }),
});

/**
 * Richiesta dal sito pubblico: lo stato è `requested`, non `confirmed`. Il
 * testo dice esattamente questo — è la distinzione che oggi manca e che
 * genera il messaggio contraddittorio.
 */
const consultationRequestUser = defineTemplate({
  key: "consultation_request_user",
  name: "N'arte · Richiesta di consulenza ricevuta [consultation_request_user]",
  subject: "Richiesta di consulenza ricevuta · {{params.dateLabel}}",
  sample: { ...CONSULTATION_SAMPLE, statusLabel: "In attesa di conferma" },
  html: layout({
    key: "consultation_request_user",
    preheader: "Abbiamo ricevuto la richiesta: ti confermiamo lo slot a breve.",
    body: [
      eyebrow("Richiesta ricevuta"),
      title(`Richiesta ${em("ricevuta.")}`),
      paragraph(
        `Grazie ${param("name")}, abbiamo ricevuto la tua richiesta di consulenza.<br />
              Lo slot è riservato in attesa che un consulente lo confermi.`
      ),
      highlight("Slot richiesto", `${param("dateLabel")} · ${param("timeLabel")}`),
      card(
        [
          cardTitle("Cosa succede ora"),
          timeline([
            { icon: "check", tone: "done", text: "Abbiamo ricevuto la tua richiesta." },
            { icon: "clock", text: "Un consulente N'Arte conferma lo slot." },
            { icon: "mail", text: "Ricevi l'email di conferma<br />con il link per collegarti." },
          ]),
        ].join("\n")
      ),
      callout({
        text: "Tieni d'occhio la tua casella di posta,<br />incluse Spam e Promozioni.",
      }),
    ].join("\n"),
  }),
});

/** Copia interna della richiesta: qui servono i recapiti. */
const consultationRequestAdmin = defineTemplate({
  key: "consultation_request_admin",
  name: "N'arte · Richiesta consulenza, copia interna [consultation_request_admin]",
  subject: "Nuova richiesta consulenza · {{params.name}}",
  sample: { ...CONSULTATION_SAMPLE, statusLabel: "In attesa di conferma" },
  html: layout({
    key: "consultation_request_admin",
    preheader: "Una richiesta di consulenza è in attesa di conferma.",
    body: [
      internalBadge(),
      eyebrow("Nuova richiesta"),
      title(`Consulenza per ${em(param("name"))}`),
      card(
        [
          sectionTitle("Richiesta"),
          dataTable([
            { icon: "user", label: "Nome", value: param("name") },
            { icon: "mail", label: "Email", value: param("email"), onlyIf: "email" },
            { icon: "chat", label: "Telefono", value: param("phone"), onlyIf: "phone" },
            { icon: "calendar", label: "Slot richiesto", value: param("dateLabel") },
            { icon: "clock", label: "Orario", value: param("timeLabel") },
            { icon: "badge", label: "Stato", value: param("statusLabel") },
            { icon: "chat", label: "Esigenze", value: param("notes"), onlyIf: "notes", multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("adminUrl"), label: "Apri in /admin/consulenza" }),
    ].join("\n"),
  }),
});

/** Copia interna della prenotazione auto-confermata dall'artista. */
const consultationConfirmedAdmin = defineTemplate({
  key: "consultation_confirmed_admin",
  name: "N'arte · Consulenza confermata, copia interna [consultation_confirmed_admin]",
  subject: "Artista ha prenotato una consulenza · {{params.name}}",
  sample: CONSULTATION_SAMPLE,
  html: layout({
    key: "consultation_confirmed_admin",
    preheader: "Un artista ha prenotato uno slot di consulenza.",
    body: [
      internalBadge(),
      eyebrow("Slot prenotato"),
      title(`${param("name")} ha ${em("prenotato.")}`),
      card([sectionTitle("Appuntamento"), dataTable(appointmentRows)].join("\n")),
      buttonPair({ href: param("adminUrl"), label: "Apri in /admin/consulenza" }),
    ].join("\n"),
  }),
});

/**
 * Promemoria 24 ore prima. Come i promemoria evento richiede un cron: il
 * template esiste già così che, quando ci sarà, resti solo da chiamarlo.
 */
const consultationReminder = defineTemplate({
  key: "consultation_reminder",
  name: "N'arte · Promemoria consulenza [consultation_reminder]",
  subject: "Domani la tua consulenza · {{params.timeLabel}}",
  sample: CONSULTATION_SAMPLE,
  html: layout({
    key: "consultation_reminder",
    preheader: "La tua consulenza è domani: ecco il link per collegarti.",
    body: [
      eyebrow("Promemoria"),
      title(`La consulenza è ${em("domani.")}`),
      paragraph(
        `Ciao ${param("name")}, ti ricordiamo l'appuntamento<br />
              con ${param("consultantName")}.`
      ),
      highlight("Domani alle", param("timeLabel")),
      card([sectionTitle("Dettagli"), dataTable(appointmentRows)].join("\n")),
      buttonPair(
        { href: param("meetingUrl"), label: "Collegati alla consulenza" },
        { href: param("panelUrl"), label: "Vai al pannello cliente" }
      ),
      callout({
        heading: "N'Arte Tips",
        text: "Collegati 5 minuti prima e tieni pronti dubbi,<br />obiettivi e materiali da condividere.",
      }),
    ].join("\n"),
  }),
});

export const CONSULTATION_TEMPLATES = [
  consultationConfirmedArtist,
  consultationRequestUser,
  consultationRequestAdmin,
  consultationConfirmedAdmin,
  consultationReminder,
];
