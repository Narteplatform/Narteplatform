/**
 * Booking: nuova richiesta all'artista, ricevuta all'organizzatore, data
 * confermata.
 * Design: "NUOVA RICHIESTA PER ARTISTA.png",
 *         "RICHIESTA INVIATA CORRETTAMENTE DA ORGANIZZATORE.png",
 *         "ARTISTA HA ACCETTATO RICHIESTA.png".
 *
 * Le tre schede dati sono quasi identiche: cambiano l'ordine delle prime
 * righe e l'etichetta del cachet. Le righe comuni stanno in `eventRows()`,
 * così una correzione non va replicata tre volte.
 *
 * Righe condizionali: soundcheck, tipologia evento, durata e richieste
 * tecniche NON hanno ancora una colonna in `booking_requests`. Finché non
 * verranno aggiunte al form, quei parametri arrivano vuoti e le righe
 * spariscono dalla scheda invece di restare a metà.
 */

import {
  buttonPair,
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

/** Righe dell'evento condivise dalle tre schede. */
function eventRows(): DataRow[] {
  return [
    { icon: "calendar", label: "Data evento", value: param("eventDate") },
    { icon: "clock", label: "Orario evento", value: param("eventTime"), onlyIf: "eventTime" },
    { icon: "wave", label: "Soundcheck", value: param("soundcheck"), onlyIf: "soundcheck" },
    { icon: "mic", label: "Tipologia evento", value: param("eventType"), onlyIf: "eventType" },
    { icon: "pin", label: "Luogo", value: param("city"), onlyIf: "city" },
    { icon: "map", label: "Indirizzo", value: param("address"), onlyIf: "address" },
  ];
}

/** Chi ha inviato la richiesta: locale, referente, ruolo. */
function organizerRows(): DataRow[] {
  return [
    { icon: "building", label: "Locale / Organizzatore", value: param("organizerName") },
    { icon: "user", label: "Referente", value: param("contactName") },
    { icon: "briefcase", label: "Ruolo", value: param("roleLabel") },
  ];
}

const bookingRequestArtist = defineTemplate({
  key: "booking_request_artist",
  name: "N'arte · Nuova richiesta per l'artista [booking_request_artist]",
  subject: "Nuova richiesta di booking — {{params.eventDate}}",
  sample: {
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
    budgetLabel: "€450",
    durationLabel: "60 minuti",
    technicalNotes: "Impianto voce disponibile, microfono incluso",
    statusLabel: "In attesa di risposta",
    message:
      "Ci piacerebbe averti nel nostro palinsesto per una serata live. Scrivici in chat per confermare disponibilità e dettagli.",
    chatUrl: "https://narteofficial.it/dashboard/chat",
    requestUrl: "https://narteofficial.it/dashboard/richieste",
  },
  html: layout({
    key: "booking_request_artist",
    preheader: "Un locale ti ha inviato una richiesta: rispondi il prima possibile.",
    body: [
      eyebrow("Richiesta ricevuta"),
      title(`Hey, ${param("artistName")}<br />hai una nuova ${em("richiesta.")}`),
      paragraph(
        `Un locale/organizzatore ti ha inviato una nuova richiesta tramite N'Arte.<br />
              Controlla i dettagli qui sotto e avvia subito la chat per definire la trattativa.`
      ),
      card(
        [
          sectionTitle("Dettagli della richiesta"),
          dataTable([
            ...organizerRows(),
            { icon: "star", label: "Artista richiesto", value: param("artistName") },
            ...eventRows(),
            { icon: "euro", label: "Cachet proposto", value: param("budgetLabel"), onlyIf: "budgetLabel" },
            { icon: "timer", label: "Durata performance", value: param("durationLabel"), onlyIf: "durationLabel" },
            { icon: "gear", label: "Richieste tecniche", value: param("technicalNotes"), onlyIf: "technicalNotes" },
            { icon: "chat", label: "Messaggio", value: param("message"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair(
        { href: param("chatUrl"), label: "Avvia la chat con il locale" },
        { href: param("requestUrl"), label: "Visualizza la richiesta" }
      ),
      callout({
        text: "Rispondi il prima possibile per aumentare<br />le possibilità di chiudere la collaborazione.",
      }),
    ].join("\n"),
  }),
});

const bookingRequestReceipt = defineTemplate({
  key: "booking_request_receipt",
  name: "N'arte · Richiesta inviata [booking_request_receipt]",
  subject: "La tua richiesta è stata inviata — {{params.artistName}}",
  sample: {
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
    budgetLabel: "€450",
    durationLabel: "60 minuti",
    technicalNotes: "",
    statusLabel: "In attesa di risposta",
    message:
      "Ci piacerebbe averti nel nostro palinsesto per una serata live. Possiamo confrontarci in chat per disponibilità e dettagli.",
    chatUrl: "https://narteofficial.it/organizzatore/chat",
    requestUrl: "https://narteofficial.it/organizzatore/richieste",
  },
  html: layout({
    key: "booking_request_receipt",
    preheader: "Abbiamo inoltrato la tua richiesta all'artista.",
    body: [
      eyebrow("Richiesta inviata"),
      title(`La tua richiesta è stata ${em("inviata.")}`),
      paragraph(
        `La tua richiesta è stata inviata correttamente all'artista tramite N'Arte.<br />
              Puoi avviare subito la chat per iniziare la trattativa, oppure attendere una risposta dall'artista.`
      ),
      card(
        [
          sectionTitle("Dettagli della richiesta"),
          dataTable([
            { icon: "star", label: "Artista contattato", value: param("artistName") },
            ...organizerRows(),
            ...eventRows(),
            { icon: "euro", label: "Cachet proposto", value: param("budgetLabel"), onlyIf: "budgetLabel" },
            { icon: "timer", label: "Durata performance", value: param("durationLabel"), onlyIf: "durationLabel" },
            { icon: "gear", label: "Stato richiesta", value: param("statusLabel") },
            { icon: "chat", label: "Messaggio", value: param("message"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair(
        { href: param("chatUrl"), label: "Avvia la chat con l'artista" },
        { href: param("requestUrl"), label: "Visualizza la richiesta" }
      ),
      callout({
        text: "Puoi scrivere subito all'artista in chat, ma anche l'artista<br />può avviare la conversazione quando visualizza la richiesta.",
      }),
    ].join("\n"),
  }),
});

/**
 * Il design si intitola "ARTISTA HA ACCETTATO RICHIESTA" ma il corpo dice
 * "la data è ora confermata" e lo stato mostrato è "Confermata". Nel codice
 * l'accettazione dell'artista porta lo stato a `in_trattativa`, non a
 * `confermata`: questa email è quindi agganciata alla conferma vera
 * (`booking_confirmed`), l'unico momento in cui il testo è corretto.
 */
const bookingConfirmed = defineTemplate({
  key: "booking_confirmed",
  name: "N'arte · Data confermata [booking_confirmed]",
  subject: "Data confermata: {{params.artistName}} · {{params.eventDate}}",
  sample: {
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
    statusLabel: "Confermata",
    message:
      "L'artista ha confermato la disponibilità per la data richiesta. Potete continuare a confrontarvi in chat per eventuali ultimi dettagli operativi.",
    chatUrl: "https://narteofficial.it/organizzatore/chat",
    bookingUrl: "https://narteofficial.it/organizzatore/richieste",
  },
  html: layout({
    key: "booking_confirmed",
    preheader: "La data è confermata: qui trovi il recap completo dell'evento.",
    body: [
      eyebrow("Data confermata"),
      title(`${param("artistName")} ha accettato<br />la tua ${em("richiesta.")}`),
      paragraph(
        `L'artista ha accettato la tua richiesta tramite chat e la data è ora confermata.<br />
              Qui sotto trovi il recap completo con tutti i dettagli confermati dell'evento.`
      ),
      card(
        [
          sectionTitle("Dettagli confermati"),
          dataTable([
            { icon: "star", label: "Artista confermato", value: param("artistName") },
            ...organizerRows(),
            ...eventRows(),
            { icon: "euro", label: "Cachet concordato", value: param("priceLabel"), onlyIf: "priceLabel" },
            { icon: "timer", label: "Durata performance", value: param("durationLabel"), onlyIf: "durationLabel" },
            { icon: "gear", label: "Stato richiesta", value: param("statusLabel") },
            { icon: "chat", label: "Messaggio finale", value: param("message"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair(
        { href: param("chatUrl"), label: "Apri la chat con l'artista" },
        { href: param("bookingUrl"), label: "Visualizza data confermata" }
      ),
      callout({
        text: "La data è confermata. Puoi continuare la conversazione<br />in chat per definire gli ultimi dettagli dell'evento.",
      }),
    ].join("\n"),
  }),
});

export const BOOKING_TEMPLATES = [bookingRequestArtist, bookingRequestReceipt, bookingConfirmed];
