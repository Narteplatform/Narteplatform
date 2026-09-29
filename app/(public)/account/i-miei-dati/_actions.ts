"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { esportaDatiUtente } from "@/lib/legal/export-dati";
import { recordConsent } from "@/lib/legal/consents";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

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
  const ruolo = utente.profile?.role ?? "?";
  const corpo = [
    "RICHIESTA DI CANCELLAZIONE ACCOUNT",
    "",
    `Utente: ${nome}`,
    `Email: ${utente.email ?? "?"}`,
    `Ruolo: ${ruolo}`,
    `Id: ${utente.id}`,
    `Ricevuta: ${new Date().toISOString()}`,
    "",
    parsed.data.motivo ? `Motivo indicato: ${parsed.data.motivo}` : "Nessun motivo indicato.",
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

  return { ok: true as const };
}
