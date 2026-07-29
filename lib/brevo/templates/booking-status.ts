/**
 * Booking: copia interna della richiesta e i quattro cambi di stato.
 *
 * Declinati dagli stessi blocchi dei tre design forniti: cambiano eyebrow,
 * titolo, colore del riquadro finale ed etichetta dei bottoni. La scheda
 * dati è la stessa, così un organizzatore che riceve tre email diverse
 * ritrova sempre gli stessi dati nello stesso ordine.
 */

import {
  buttonPair,
  callout,
  card,
  type DataRow,
  dataTable,
  em,
  eyebrow,
  ifParam,
  internalBadge,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

/** Righe comuni a tutti i cambi di stato. */
function statusRows(priceLabel: string): DataRow[] {
  return [
    { icon: "star", label: "Artista", value: param("artistName") },
    { icon: "building", label: "Locale / Organizzatore", value: param("organizerName") },
    { icon: "user", label: "Referente", value: param("contactName") },
    { icon: "briefcase", label: "Ruolo", value: param("roleLabel") },
    { icon: "calendar", label: "Data evento", value: param("eventDate") },
    { icon: "clock", label: "Orario evento", value: param("eventTime"), onlyIf: "eventTime" },
    { icon: "wave", label: "Soundcheck", value: param("soundcheck"), onlyIf: "soundcheck" },
    { icon: "mic", label: "Tipologia evento", value: param("eventType"), onlyIf: "eventType" },
    { icon: "pin", label: "Luogo", value: param("city"), onlyIf: "city" },
    { icon: "map", label: "Indirizzo", value: param("address"), onlyIf: "address" },
    { icon: "euro", label: priceLabel, value: param("priceLabel"), onlyIf: "priceLabel" },
    { icon: "timer", label: "Durata performance", value: param("durationLabel"), onlyIf: "durationLabel" },
    { icon: "gear", label: "Stato richiesta", value: param("statusLabel") },
  ];
}

const STATUS_SAMPLE = {
  artistName: "Marina Blu",
  organizerName: "Duel Club",
  contactName: "Marco Esposito",
  roleLabel: "Organizzatore",
  eventDate: "Sabato 21 Settembre 2026",
  eventTime: "22:00 – 01:00",
  soundcheck: "20:30",
  eventType: "Live Set",
  city: "Napoli",
  address: "Via Placeholder 25, Napoli",
  priceLabel: "€450",
  durationLabel: "60 minuti",
  statusLabel: "In trattativa",
  message: "",
  chatUrl: "https://narteofficial.it/organizzatore/chat",
  bookingUrl: "https://narteofficial.it/organizzatore/richieste",
};

/** Copia interna della nuova richiesta: dati di contatto e link al pannello. */
const bookingRequestAdmin = defineTemplate({
  key: "booking_request_admin",
  name: "N'arte · Nuova richiesta, copia interna [booking_request_admin]",
  subject: "Nuova richiesta per {{params.artistName}} — {{params.eventDate}}",
  sample: {
    artistName: "Marina Blu",
    organizerName: "Duel Club",
    contactName: "Marco Esposito",
    roleLabel: "Organizzatore",
    eventDate: "Sabato 21 Settembre 2026",
    eventTime: "22:00 – 01:00",
    soundcheck: "",
    eventType: "Live Set",
    city: "Napoli",
    address: "Via Placeholder 25, Napoli",
    budgetLabel: "€450",
    durationLabel: "60 minuti",
    technicalNotes: "",
    statusLabel: "In attesa di risposta",
    message: "Ci piacerebbe averti nel nostro palinsesto per una serata live.",
    chatUrl: "",
    requestUrl: "",
    contactEmail: "marco.esposito@example.com",
    contactPhone: "+39 333 000 0000",
    adminUrl: "https://narteofficial.it/admin/leads",
  },
  html: layout({
    key: "booking_request_admin",
    preheader: "Una nuova richiesta di booking è stata inoltrata all'artista.",
    body: [
      internalBadge(),
      eyebrow("Nuova richiesta"),
      title(`Richiesta per ${em(param("artistName"))}`),
      card(
        [
          sectionTitle("Dettagli della richiesta"),
          dataTable([
            { icon: "star", label: "Artista", value: param("artistName") },
            { icon: "building", label: "Locale / Organizzatore", value: param("organizerName") },
            { icon: "user", label: "Referente", value: param("contactName") },
            { icon: "mail", label: "Email", value: param("contactEmail"), onlyIf: "contactEmail" },
            { icon: "chat", label: "Telefono", value: param("contactPhone"), onlyIf: "contactPhone" },
            { icon: "calendar", label: "Data evento", value: param("eventDate") },
            { icon: "pin", label: "Luogo", value: param("city"), onlyIf: "city" },
            { icon: "euro", label: "Cachet proposto", value: param("budgetLabel"), onlyIf: "budgetLabel" },
            { icon: "gear", label: "Stato", value: param("statusLabel") },
            { icon: "chat", label: "Messaggio", value: param("message"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("adminUrl"), label: "Apri nel pannello" }),
    ].join("\n"),
  }),
});

/** L'artista ha aperto la trattativa: la data NON è ancora confermata. */
const bookingAccepted = defineTemplate({
  key: "booking_accepted",
  name: "N'arte · Trattativa aperta [booking_accepted]",
  subject: "{{params.artistName}} ha risposto alla tua richiesta",
  sample: STATUS_SAMPLE,
  html: layout({
    key: "booking_accepted",
    preheader: "L'artista ha aperto la trattativa: la data non è ancora confermata.",
    body: [
      eyebrow("Trattativa aperta"),
      title(`${param("artistName")} ha aperto la ${em("trattativa.")}`),
      paragraph(
        `L'artista ha risposto alla tua richiesta ed è interessato alla data.<br />
              La data non è ancora bloccata: si conferma quando trovate l'accordo in chat.`
      ),
      card([sectionTitle("Dettagli della richiesta"), dataTable(statusRows("Cachet proposto"))].join("\n")),
      ifParam(
        "message",
        callout({ heading: "Note dall'artista", text: param("message") })
      ),
      buttonPair(
        { href: param("chatUrl"), label: "Continua in chat" },
        { href: param("bookingUrl"), label: "Visualizza la richiesta" }
      ),
      callout({
        text: "La data si libera se non confermate: chiudete l'accordo<br />prima che l'artista riceva un'altra proposta.",
      }),
    ].join("\n"),
  }),
});

/** L'artista non è disponibile. Tono neutro: non è un rifiuto della persona. */
const bookingDeclined = defineTemplate({
  key: "booking_declined",
  name: "N'arte · Artista non disponibile [booking_declined]",
  subject: "{{params.artistName}} non è disponibile per {{params.eventDate}}",
  sample: { ...STATUS_SAMPLE, statusLabel: "Rifiutata" },
  html: layout({
    key: "booking_declined",
    preheader: "L'artista non è disponibile per la data richiesta.",
    body: [
      eyebrow("Richiesta non accolta"),
      title(`Data ${em("non disponibile.")}`),
      paragraph(
        `${param("artistName")} non è disponibile per la data che hai richiesto.<br />
              Puoi proporgli un'altra data, oppure cercare un altro artista fra quelli su N'Arte.`
      ),
      card([sectionTitle("Richiesta"), dataTable(statusRows("Cachet proposto"))].join("\n")),
      ifParam(
        "message",
        callout({ tone: "warning", heading: "Note dall'artista", text: param("message") })
      ),
      buttonPair(
        { href: param("bookingUrl"), label: "Proponi un'altra data" },
        { href: param("chatUrl"), label: "Scrivi all'artista" }
      ),
    ].join("\n"),
  }),
});

/** Annullamento deciso dal superadmin: la motivazione è obbligatoria. */
const bookingCancelledAdmin = defineTemplate({
  key: "booking_cancelled_admin",
  name: "N'arte · Data annullata da N'arte [booking_cancelled_admin]",
  subject: "Data annullata: {{params.artistName}} · {{params.eventDate}}",
  sample: {
    ...STATUS_SAMPLE,
    statusLabel: "Annullata",
    message: "Sovrapposizione con un'altra data già confermata per lo stesso artista.",
  },
  html: layout({
    key: "booking_cancelled_admin",
    preheader: "Una data confermata è stata annullata da N'arte.",
    body: [
      eyebrow("Data annullata"),
      title(`Data ${em("annullata.")}`),
      paragraph(
        `N'Arte ha annullato una data che risultava confermata.<br />
              Ci dispiace per il disagio: qui sotto trovi il motivo e i dettagli.`
      ),
      callout({ tone: "danger", heading: "Motivo dell'annullamento", text: param("message") }),
      card([sectionTitle("Data annullata"), dataTable(statusRows("Cachet concordato"))].join("\n")),
      buttonPair(
        { href: param("bookingUrl"), label: "Visualizza la richiesta" },
        { href: param("chatUrl"), label: "Parlane in chat" }
      ),
    ].join("\n"),
  }),
});

/**
 * Annullamento deciso dall'organizzatore, diretto all'artista. Oggi non
 * parte nulla: l'artista tiene la data occupata in calendario senza sapere
 * che è stata annullata.
 */
const bookingCancelledOrganizer = defineTemplate({
  key: "booking_cancelled_organizer",
  name: "N'arte · Richiesta annullata dall'organizzatore [booking_cancelled_organizer]",
  subject: "Richiesta annullata: {{params.organizerName}} · {{params.eventDate}}",
  sample: { ...STATUS_SAMPLE, statusLabel: "Annullata", message: "" },
  html: layout({
    key: "booking_cancelled_organizer",
    preheader: "L'organizzatore ha annullato la richiesta: la data torna libera.",
    body: [
      eyebrow("Richiesta annullata"),
      title(`Richiesta ${em("annullata.")}`),
      paragraph(
        `${param("organizerName")} ha annullato la richiesta per ${param("eventDate")}.<br />
              La data torna libera nel tuo calendario: puoi accettarne altre.`
      ),
      card([sectionTitle("Richiesta annullata"), dataTable(statusRows("Cachet proposto"))].join("\n")),
      ifParam("message", callout({ tone: "warning", heading: "Motivo", text: param("message") })),
      buttonPair({ href: param("bookingUrl"), label: "Vai alle tue richieste" }),
    ].join("\n"),
  }),
});

export const BOOKING_STATUS_TEMPLATES = [
  bookingRequestAdmin,
  bookingAccepted,
  bookingDeclined,
  bookingCancelledAdmin,
  bookingCancelledOrganizer,
];
