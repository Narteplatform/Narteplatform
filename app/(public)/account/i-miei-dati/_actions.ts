"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { esportaDatiUtente } from "@/lib/legal/export-dati";
import { recordConsent } from "@/lib/legal/consents";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { createElement } from "react";
import { sendEmail } from "@/lib/emails/send";
import AccountDeletionConfirmEmail from "@/lib/emails/templates/AccountDeletionConfirmEmail";
import { creaRichiestaCancellazione, SCADENZA_ORE } from "@/lib/legal/cancellazione";

/**
 * Le azioni della pagina «I miei dati»: accesso, portabilità, revoca, richiesta
 * di cancellazione.
 *
 * Tutte partono da `requireUser()`: l'identità la decide la sessione, mai un
 * parametro. Un'azione che accettasse un id utente sarebbe un modo per scaricare
 * i dati di qualcun altro.
 */

/** Articoli 15 e 20: la copia dei propri dati, in un formato leggibile. */
export async function scaricaImieiDati() {
  const utente = await requireUser();
  const dati = await esportaDatiUtente(utente.id);
  return {
    ok: true as const,
    nomeFile: `narte-dati-${new Date().toISOString().slice(0, 10)}.json`,
    // Indentato: un export che una persona deve poter leggere, non solo una
    // macchina. La portabilità serve a poco se il file è illeggibile.
    contenuto: JSON.stringify(dati, null, 2),
  };
}

/** Consenso al marketing: si concede e si ritira, e ogni gesto lascia una riga. */
export async function aggiornaConsensoMarketing(attivo: boolean) {
  await requireUser();
  const esito = await recordConsent("marketing", attivo);
  if (!esito.ok) return esito;
  return { ok: true as const };
}

const richiestaSchema = z.object({
  motivo: z.string().max(1000).optional(),
});

/**
 * Richiesta di cancellazione dell'account.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ UNA RICHIESTA E NON UN PULSANTE CHE CANCELLA.
 *
 * Su questo schema la cancellazione non è un `delete` su una riga. `leads`,
 * `contact_messages`, `artist_applications`, `consultations` ed `email_log` non
 * sono legate a `auth.users` e sopravvivono al cascade; i file su bunny.net il
 * cascade non li raggiunge affatto; e i messaggi di una conversazione hanno un
 * altro lato che ha diritto a conservare i propri. Un pulsante che promette di
 * cancellare tutto e ne cancella metà è peggio di una richiesta gestita a mano:
 * dichiara una cosa che non è vera.
 *
 * Quindi: la richiesta viene registrata e notificata, e la cancellazione la
 * esegue il team seguendo una procedura scritta. Il termine di legge è un mese,
 * e va rispettato — è il motivo per cui la notifica non è facoltativa.
 * ────────────────────────────────────────────────────────────────────────────
 */
export async function richiediCancellazioneAccount(input: unknown) {
  const parsed = richiestaSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };

  const utente = await requireUser();
  const admin = createAdminClient();

  const nome = utente.profile?.full_name ?? "(senza nome)";
  const destinatario = utente.email;

  if (!destinatario) {
    // Senza un indirizzo non si può mandare la conferma, e senza conferma non
    // si disattiva niente. Meglio dirlo che registrare una richiesta che non
    // potrà mai completarsi.
    return {
      ok: false as const,
      error:
        "Sul tuo account non risulta un indirizzo email a cui mandare la conferma. " +
        "Scrivici dalla pagina contatti e ce ne occupiamo noi.",
    };
  }

  const richiesta = await creaRichiestaCancellazione(utente.id, parsed.data.motivo);
  if (!richiesta.ok) return richiesta;

  const urlConferma = `${getSiteUrl()}/account/cancellazione?token=${richiesta.token}`;

  // L'INVIO PUÒ NON RIUSCIRE, E NON DEVE FAR FALLIRE LA RICHIESTA.
  //
  // Su questo progetto le email non partono ancora: la verifica del dominio
  // presso il provider non è chiusa, e ogni invio finisce nel registro come
  // «skipped». Se la richiesta di cancellazione dipendesse dall'email, sarebbe
  // una funzione che non funziona — e il diritto che promette non è di quelli
  // che si possono lasciare a metà.
  //
  // Quindi: la richiesta è già registrata e il team viene avvisato comunque. Se
  // la conferma parte, l'interessato chiude da sé in due minuti; se non parte,
  // la richiesta vale lo stesso e la gestisce il team entro il termine di legge.
  // Il giorno in cui le email funzioneranno, il percorso breve si accende da
  // solo senza che nessuno debba ricordarsene.
  const esitoEmail = await sendEmail({
    to: destinatario,
    subject: "Conferma la cancellazione del tuo account N'arte",
    react: createElement(AccountDeletionConfirmEmail, {
      nome,
      url: urlConferma,
      scadenzaOre: SCADENZA_ORE,
    }),
    template: "account_deletion_confirm",
  }).catch((e) => {
    logger.error("account/cancellazione", `invio conferma fallito: ${String(e)}`);
    return { ok: false as const };
  });

  const confermaInviata = esitoEmail.ok === true;
  if (!confermaInviata) {
    logger.warn(
      "account/cancellazione",
      `conferma non recapitata a ${destinatario}: la richiesta va gestita a mano`
    );
  }
  const ruolo = utente.profile?.role ?? "?";
  const corpo = [
    "RICHIESTA DI CANCELLAZIONE ACCOUNT (in attesa di conferma via email)",
    "",
    `Utente: ${nome}`,
    `Email: ${utente.email ?? "?"}`,
    `Ruolo: ${ruolo}`,
    `Id: ${utente.id}`,
    `Ricevuta: ${new Date().toISOString()}`,
    "",
    parsed.data.motivo ? `Motivo indicato: ${parsed.data.motivo}` : "Nessun motivo indicato.",
    "",
    "L'account viene disattivato automaticamente quando l'interessato conferma",
    "dal collegamento ricevuto per email. La rimozione definitiva dei dati resta",
    "un passaggio da eseguire a mano entro 30 giorni.",
    "",
    "⚠️ SE L'EMAIL DI CONFERMA NON È PARTITA (controlla email_log), l'interessato",
    "non ha modo di confermare da solo: va contattato, e la pratica è tutta a mano.",
    "",
    "⚠️ Termine di legge: UN MESE dalla ricezione.",
    "Procedura in docs/REGISTRO_TRATTAMENTI.md §6.",
  ].join("\n");

  // Si annota dove il team guarda già: /admin/messaggi. Una tabella dedicata
  // sarebbe più ordinata, ma una richiesta registrata in un posto che nessuno
  // apre non è registrata.
  const { error } = await admin.from("contact_messages").insert({
    name: nome,
    email: utente.email ?? "",
    subject: "RICHIESTA CANCELLAZIONE ACCOUNT",
    message: corpo,
  });

  if (error) {
    logger.error("account/cancellazione", `registrazione fallita: ${error.message}`);
    return {
      ok: false as const,
      error:
        "Non siamo riusciti a registrare la richiesta. Riprova, oppure scrivici " +
        "dalla pagina contatti: in quel caso vale comunque come richiesta.",
    };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await dispatchEmail({
      key: "contact_message",
      to: adminEmail,
      replyTo: utente.email ?? undefined,
      params: {
        name: nome,
        email: utente.email ?? "",
        subject: "RICHIESTA CANCELLAZIONE ACCOUNT",
        message: corpo,
        adminUrl: `${getSiteUrl()}/admin/messaggi`,
      },
      subjectPreview: `Cancellazione account: ${nome}`,
    }).catch((e) =>
      // La richiesta è già registrata: un'email non partita non la annulla, e
      // non è un errore da mostrare a chi l'ha inviata.
      logger.error("account/cancellazione", `notifica non inviata: ${String(e)}`)
    );
  } else {
    logger.warn(
      "account/cancellazione",
      "ADMIN_NOTIFICATION_EMAIL non impostata: la richiesta è registrata ma nessuno è stato avvisato"
    );
  }

  return { ok: true as const, confermaInviata };
}
