/**
 * Consulenza confermata.
 * Design: "CONFERMA CONSULENZA.png".
 *
 * Corregge un difetto del testo attuale: oggi la prenotazione dell'artista
 * viene salvata già `confirmed`, ma riusa il template della *richiesta* e
 * quindi promette che "un consulente ti contatterà per confermare
 * l'appuntamento" mentre l'oggetto annuncia l'appuntamento confermato.
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
  type DataRow,
  dataTable,
  em,
  eyebrow,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

/** Il link va reso cliccabile, non stampato come testo. */
const meetingLink = `<a href="${param("meetingUrl")}" target="_blank" style="color:${C.accent};text-decoration:none;">${param("meetingUrl")}</a>`;

const rows: DataRow[] = [
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

const consultationConfirmedArtist = defineTemplate({
  key: "consultation_confirmed_artist",
  name: "N'arte · Consulenza confermata [consultation_confirmed_artist]",
  subject: "Consulenza confermata · {{params.dateLabel}}",
  sample: {
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
    email: "",
    phone: "",
  },
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
      card([sectionTitle("Dettagli della consulenza"), dataTable(rows)].join("\n")),
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

export const CONSULTATION_TEMPLATES = [consultationConfirmedArtist];
