/**
 * Email di trasparenza e tutela: decisioni di moderazione, segnalazioni,
 * promemoria di rinnovo, recesso, segnalazione del profilo alle strutture.
 *
 * Hanno in comune una cosa: esistono perché una norma o un impegno scritto nei
 * termini d'uso lo richiede. Il DSA vuole che chi subisce una decisione sappia
 * cosa è stato deciso, perché e come contestarla (art. 17), e che chi segnala
 * riceva una ricevuta e un esito (art. 16). Il Codice del consumo vuole la
 * conferma del recesso su supporto durevole. Il tono è quindi informativo e
 * preciso, senza enfasi: ogni frase deve poter essere riletta da un terzo.
 */

import {
  buttonPair,
  callout,
  card,
  dataTable,
  em,
  eyebrow,
  ifParam,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const moderationDecision = defineTemplate({
  key: "moderation_decision",
  name: "N'arte · Decisione di moderazione [moderation_decision]",
  subject: "Una decisione che riguarda il tuo account — N'Arte",
  sample: {
    name: "Marco Esposito",
    decision: "Abbiamo nascosto una recensione pubblicata sul tuo profilo.",
    target: "Recensione del 12 settembre 2026 — «Serata al Brusco»",
    reason:
      "Conteneva dati personali di una persona estranea all'evento (Regolamento delle recensioni, art. 4).",
    consequences: "",
    contestUrl: "https://narteofficial.it/segnalazioni?reclamo=R-2026-0042",
    reference: "R-2026-0042",
  },
  html: layout({
    key: "moderation_decision",
    preheader: "Cosa abbiamo deciso, perché, e come puoi contestarlo.",
    body: [
      eyebrow("Moderazione"),
      title(`Una ${em("decisione")} che ti riguarda`, { size: "xl" }),
      paragraph(`Ciao ${param("name")},<br />${param("decision")}`),
      card(
        [
          sectionTitle("La decisione"),
          dataTable([
            { icon: "doc", label: "Contenuto", value: param("target"), multiline: true },
            { icon: "info", label: "Motivo", value: param("reason"), multiline: true },
            {
              icon: "clock",
              label: "Effetti",
              value: param("consequences"),
              onlyIf: "consequences",
              multiline: true,
            },
            { icon: "badge", label: "Riferimento", value: param("reference") },
          ]),
        ].join("\n")
      ),
      ifParam(
        "contestUrl",
        buttonPair({ href: param("contestUrl"), label: "Contesta la decisione" })
      ),
      paragraph(
        `Se ritieni la decisione sbagliata puoi presentare reclamo entro sei mesi: la<br />
              riesamina una persona del team e ti rispondiamo con una nuova motivazione.<br />
              Restano sempre salvi gli altri rimedi previsti dalla legge.`
      ),
    ].join("\n"),
  }),
});

const mediaApproved = defineTemplate({
  key: "media_approved",
  name: "N'arte · Contenuti approvati [media_approved]",
  subject: "I tuoi contenuti sono online — N'Arte",
  sample: {
    name: "Marco Esposito",
    itemsLabel: "2 foto e 1 video",
    profileUrl: "https://narteofficial.it/artisti/esempio",
  },
  html: layout({
    key: "media_approved",
    preheader: "Il team ha approvato quello che hai caricato: ora è visibile sul tuo profilo.",
    body: [
      eyebrow("Moderazione"),
      title(`Contenuti ${em("approvati")}`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, il team ha esaminato e approvato quello che hai caricato.<br />
              Da adesso è visibile sul tuo profilo pubblico.`
      ),
      card(
        [
          sectionTitle("Cosa è stato approvato"),
          dataTable([
            { icon: "check", label: "Contenuti", value: param("itemsLabel"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("profileUrl"), label: "Guarda il tuo profilo" }),
    ].join("\n"),
  }),
});

const profileReactivated = defineTemplate({
  key: "profile_reactivated",
  name: "N'arte · Profilo di nuovo visibile [profile_reactivated]",
  subject: "Il tuo profilo è di nuovo nel catalogo — N'Arte",
  sample: {
    name: "Marco Esposito",
    profileName: "Trio Esempio",
    profileUrl: "https://narteofficial.it/artisti/esempio",
  },
  html: layout({
    key: "profile_reactivated",
    preheader: "Il profilo è di nuovo visibile nel catalogo pubblico.",
    body: [
      eyebrow("Moderazione"),
      title(`Profilo di nuovo ${em("visibile")}`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, abbiamo concluso la verifica: il tuo profilo è<br />
              tornato nel catalogo pubblico.`
      ),
      card(
        [
          sectionTitle("Il tuo profilo"),
          dataTable([
            { icon: "mic", label: "Profilo", value: param("profileName") },
            { icon: "link", label: "Indirizzo", value: param("profileUrl"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("profileUrl"), label: "Guarda il tuo profilo" }),
    ].join("\n"),
  }),
});

/** Profilo AGGIUNTIVO approvato: stessi parametri di `profile_reactivated`. */
const profileApprovedNew = defineTemplate({
  key: "profile_approved_new",
  name: "N'arte · Nuovo profilo approvato [profile_approved_new]",
  subject: "Il tuo nuovo profilo è stato approvato — N'Arte",
  sample: {
    name: "Marco Esposito",
    profileName: "Trio Esempio",
    profileUrl: "https://narteofficial.it/artisti/esempio",
  },
  html: layout({
    key: "profile_approved_new",
    preheader: "Il tuo nuovo profilo è nel catalogo pubblico.",
    body: [
      eyebrow("Profilo approvato"),
      title(`Il nuovo profilo è ${em("online")}`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, abbiamo approvato il tuo nuovo profilo:<br />
              da ora è visibile nel catalogo pubblico.`
      ),
      card(
        [
          sectionTitle("Il tuo profilo"),
          dataTable([
            { icon: "mic", label: "Profilo", value: param("profileName") },
            { icon: "link", label: "Indirizzo", value: param("profileUrl"), multiline: true },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("profileUrl"), label: "Guarda il tuo profilo" }),
    ].join("\n"),
  }),
});

const reportReceipt = defineTemplate({
  key: "report_receipt",
  name: "N'arte · Ricevuta segnalazione [report_receipt]",
  subject: "Abbiamo ricevuto la tua {{params.kindLabel}} — N'Arte",
  sample: {
    name: "Giulia Russo",
    reference: "S-2026-0017",
    receivedAt: "30 settembre 2026, 18:42",
    kindLabel: "segnalazione",
    targetLabel: "Profilo artista — narteofficial.it/artisti/esempio",
  },
  html: layout({
    key: "report_receipt",
    preheader: "La tua segnalazione è registrata: ti scriveremo con l'esito.",
    body: [
      eyebrow("Segnalazioni"),
      title(`${em("Ricevuta")}, grazie`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, abbiamo registrato la tua ${param("kindLabel")}.<br />
              La esaminiamo e ti scriviamo con la decisione e il motivo.`
      ),
      card(
        [
          sectionTitle("La tua segnalazione"),
          dataTable([
            { icon: "badge", label: "Riferimento", value: param("reference") },
            { icon: "clock", label: "Ricevuta il", value: param("receivedAt") },
            { icon: "link", label: "Oggetto", value: param("targetLabel"), multiline: true },
          ]),
        ].join("\n")
      ),
      paragraph(`Conserva il riferimento: ti servirà se vorrai scriverci di nuovo su questo caso.`),
    ].join("\n"),
  }),
});

const reportAdmin = defineTemplate({
  key: "report_admin",
  name: "N'arte · Nuova segnalazione (team) [report_admin]",
  subject: "Nuova {{params.kindLabel}} {{params.reference}}: {{params.category}}",
  sample: {
    reference: "S-2026-0017",
    kindLabel: "segnalazione",
    category: "Violazione del diritto d'autore",
    targetLabel: "Profilo artista",
    targetUrl: "https://narteofficial.it/artisti/esempio",
    description: "Il video caricato è un brano di cui sono titolare, pubblicato senza licenza.",
    reporterLabel: "Giulia Russo · giulia@example.com",
    adminUrl: "https://narteofficial.it/admin/segnalazioni",
  },
  html: layout({
    key: "report_admin",
    preheader: "Da prendere in carico nei tempi indicati nella politica di moderazione.",
    body: [
      eyebrow("Copia interna"),
      title(`Nuova ${em(param("kindLabel"))}`, { size: "lg" }),
      card(
        [
          sectionTitle("Segnalazione"),
          dataTable([
            { icon: "badge", label: "Riferimento", value: param("reference") },
            { icon: "info", label: "Categoria", value: param("category") },
            { icon: "doc", label: "Oggetto", value: param("targetLabel") },
            { icon: "link", label: "Indirizzo", value: param("targetUrl"), onlyIf: "targetUrl" },
            { icon: "chat", label: "Descrizione", value: param("description"), multiline: true },
            { icon: "user", label: "Segnalante", value: param("reporterLabel") },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("adminUrl"), label: "Apri le segnalazioni" }),
    ].join("\n"),
  }),
});

const reportOutcome = defineTemplate({
  key: "report_outcome",
  name: "N'arte · Esito segnalazione [report_outcome]",
  subject: "Esito della tua segnalazione {{params.reference}} — N'Arte",
  sample: {
    name: "Giulia Russo",
    reference: "S-2026-0017",
    outcome: "Abbiamo rimosso il video segnalato.",
    reason: "Il titolare dei diritti ha dimostrato la titolarità e l'artista non ha presentato una licenza.",
    contestUrl: "https://narteofficial.it/segnalazioni?reclamo=S-2026-0017",
  },
  html: layout({
    key: "report_outcome",
    preheader: "Cosa abbiamo deciso sulla tua segnalazione, e perché.",
    body: [
      eyebrow("Segnalazioni"),
      title(`L'${em("esito")} della tua segnalazione`, { size: "xl" }),
      paragraph(`Ciao ${param("name")}, abbiamo esaminato la segnalazione ${param("reference")}.`),
      card(
        [
          sectionTitle("Esito"),
          dataTable([
            { icon: "check", label: "Decisione", value: param("outcome"), multiline: true },
            { icon: "info", label: "Motivo", value: param("reason"), multiline: true },
          ]),
        ].join("\n")
      ),
      ifParam(
        "contestUrl",
        buttonPair({ href: param("contestUrl"), label: "Contesta l'esito" })
      ),
    ].join("\n"),
  }),
});

const renewalReminder = defineTemplate({
  key: "renewal_reminder",
  name: "N'arte · Promemoria rinnovo annuale [renewal_reminder]",
  subject: "Il tuo abbonamento {{params.planLabel}} si rinnova il {{params.renewalDate}}",
  sample: {
    name: "Marco Esposito",
    planLabel: "N'arte Max annuale",
    renewalDate: "30 ottobre 2026",
    amountLabel: "499,99 €",
    manageUrl: "https://narteofficial.it/dashboard/abbonamento",
  },
  html: layout({
    key: "renewal_reminder",
    preheader: "Nessuna azione richiesta se vuoi continuare. Puoi disdire prima del rinnovo.",
    body: [
      eyebrow("Abbonamento"),
      title(`Il rinnovo è ${em("vicino")}`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, ti ricordiamo che il tuo abbonamento si rinnova<br />
              automaticamente. Se vuoi continuare non devi fare nulla.`
      ),
      card(
        [
          sectionTitle("Il tuo abbonamento"),
          dataTable([
            { icon: "star", label: "Piano", value: param("planLabel") },
            { icon: "calendar", label: "Rinnovo", value: param("renewalDate") },
            { icon: "euro", label: "Importo", value: param("amountLabel") },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("manageUrl"), label: "Gestisci l'abbonamento" }),
      callout({
        tone: "warning",
        heading: "Vuoi disdire?",
        text: "Puoi farlo dalla pagina Abbonamento prima della data di rinnovo, senza costi: il piano resta attivo fino alla fine del periodo già pagato.",
      }),
    ].join("\n"),
  }),
});

const subscriptionWithdrawal = defineTemplate({
  key: "subscription_withdrawal",
  name: "N'arte · Conferma recesso abbonamento [subscription_withdrawal]",
  subject: "Abbiamo ricevuto il tuo recesso — N'Arte",
  sample: {
    name: "Marco Esposito",
    planLabel: "N'arte Pro mensile",
    receivedAt: "30 settembre 2026, 10:15",
    refundLabel: "6,66 €",
    refundNote: "Pari al prezzo pagato meno la parte di servizio fruita fino al recesso.",
  },
  html: layout({
    key: "subscription_withdrawal",
    preheader: "Il recesso è registrato e il rimborso è in corso.",
    body: [
      eyebrow("Abbonamento"),
      title(`Recesso ${em("ricevuto")}`, { size: "xl" }),
      paragraph(
        `Ciao ${param("name")}, confermiamo di aver ricevuto la tua comunicazione di<br />
              recesso. L'abbonamento è cessato e il tuo account è tornato al piano Free.`
      ),
      card(
        [
          sectionTitle("Riepilogo del recesso"),
          dataTable([
            { icon: "star", label: "Piano", value: param("planLabel") },
            { icon: "clock", label: "Ricevuto il", value: param("receivedAt") },
            { icon: "euro", label: "Rimborso", value: param("refundLabel") },
            { icon: "info", label: "Calcolo", value: param("refundNote"), multiline: true },
          ]),
        ].join("\n")
      ),
      paragraph(
        `Il rimborso arriva sullo stesso metodo di pagamento entro 14 giorni.<br />
              I tuoi contenuti non sono stati cancellati: quelli oltre i limiti del piano Free<br />
              restano nell'area riservata e tornano visibili se ti abboni di nuovo.`
      ),
    ].join("\n"),
  }),
});

const termsUpdateNotice = defineTemplate({
  key: "terms_update_notice",
  name: "N'arte · Preavviso modifiche ai termini [terms_update_notice]",
  subject: "Cambiano le condizioni di N'arte dal {{params.effectiveDate}}",
  sample: {
    effectiveDate: "1 dicembre 2026",
    summary: "Aggiorniamo le Condizioni di abbonamento per descrivere lo shooting del piano Max annuale.",
    documentsUrl: "https://narteofficial.it/termini",
  },
  html: layout({
    key: "terms_update_notice",
    preheader: "Ti avvisiamo in anticipo: le nuove condizioni valgono dalla data indicata.",
    body: [
      eyebrow("Condizioni d'uso"),
      title(`Le condizioni ${em("cambiano")}`, { size: "xl" }),
      paragraph(
        `Ti scriviamo con almeno 15 giorni di anticipo: dal ${param("effectiveDate")} si applicano<br />
              le nuove condizioni di N'arte.`
      ),
      card([sectionTitle("Cosa cambia"), paragraph(param("summary"))].join("\n")),
      buttonPair({ href: param("documentsUrl"), label: "Leggi le condizioni" }),
      callout({
        heading: "Se non sei d'accordo",
        text: "Puoi chiudere il tuo account in qualsiasi momento prima di quella data, dalle impostazioni del profilo; se hai un abbonamento puoi disdirlo dalla pagina Abbonamento. Continuando a usare N'arte dopo quella data accetti le nuove condizioni.",
      }),
    ].join("\n"),
  }),
});

export const COMPLIANCE_TEMPLATES = [
  moderationDecision,
  mediaApproved,
  profileReactivated,
  profileApprovedNew,
  reportReceipt,
  reportAdmin,
  reportOutcome,
  renewalReminder,
  subscriptionWithdrawal,
  termsUpdateNotice,
];
