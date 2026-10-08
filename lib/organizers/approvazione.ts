import "server-only";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { sendEmail } from "@/lib/emails/send";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { PERCORSO_IN_ATTESA, normalizzaStato, type StatoOrganizzatore } from "@/lib/organizers/stato";

/**
 * Approvazione degli organizzatori (migration 0071).
 *
 * RILASCIO. Il codice va online PRIMA della migration. Finché la colonna
 * `organizers.approval_status` non esiste, ogni funzione qui sotto si comporta
 * come prima dell'approvazione: lo stato è «approved», niente blocchi, niente
 * attese. Eseguire la migration è ciò che accende il meccanismo.
 *
 * LETTURA TOLLERANTE. Un errore di lettura (colonna mancante o qualunque altro)
 * dà «approved»: meglio non chiudere fuori un organizzatore esistente per un
 * guasto momentaneo. Nessuna scrittura parte mai da questa lettura.
 */

export { PERCORSO_IN_ATTESA, normalizzaStato, type StatoOrganizzatore };

export async function leggiStatoOrganizzatore(userId: string): Promise<StatoOrganizzatore> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizers")
      .select("approval_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (!colonnaAssente(error)) {
        logger.warn("organizzatori", "stato non letto, si considera approvato:", error.message);
      }
      return "approved";
    }
    if (!data) return "approved"; // riga assente = comportamento di prima
    return normalizzaStato(data.approval_status);
  } catch (e) {
    logger.warn("organizzatori", "stato non letto:", e instanceof Error ? e.message : String(e));
    return "approved";
  }
}

export type EsitoRichiesta =
  | { ok: true; stato: StatoOrganizzatore; creata: boolean }
  | { ok: false; error: string };

type Riga = { id: string; stato: StatoOrganizzatore };

/**
 * Chiede l'accesso come organizzatore per un utente con ruolo `user`.
 *
 * Con la service role: imposta `profiles.role = 'organizer'` SOLO se il ruolo è
 * ancora `user`, crea la riga `organizers` in attesa se manca, avvisa l'utente
 * e il team. Idempotente: richiamarla non duplica righe né email.
 *
 * PRIMA DELLA MIGRATION (colonna assente) ricade sul comportamento vecchio:
 * l'utente diventa organizzatore operativo e lo stato restituito è «approved».
 */
export async function richiediAccessoOrganizzatore(input: {
  userId: string;
  nome?: string | null;
  citta?: string | null;
}): Promise<EsitoRichiesta> {
  const admin = createAdminClient();

  const { data: profilo, error: profErr } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", input.userId)
    .maybeSingle();
  if (profErr) {
    logger.error("organizzatori", "profilo non letto:", profErr.message);
    return { ok: false, error: "Non riesco a verificare il tuo account. Riprova fra poco." };
  }
  if (!profilo) return { ok: false, error: "Account non trovato." };

  if (profilo.role === "organizer") {
    return { ok: true, stato: await leggiStatoOrganizzatore(input.userId), creata: false };
  }
  if (profilo.role !== "user") {
    return { ok: false, error: "Questo account non può diventare organizzatore." };
  }

  const { data: letto, error: utErr } = await admin.auth.admin.getUserById(input.userId);
  if (utErr || !letto?.user) {
    logger.error("organizzatori", "utente non letto:", utErr?.message ?? "assente");
    return { ok: false, error: "Non riesco a verificare il tuo account. Riprova fra poco." };
  }
  const email = letto.user.email ?? null;
  const meta = (letto.user.user_metadata ?? {}) as { full_name?: unknown };
  const nomeUtente =
    input.nome?.trim() ||
    (typeof meta.full_name === "string" ? meta.full_name.trim() : "") ||
    profilo.full_name?.trim() ||
    email?.split("@")[0] ||
    "Organizzatore";
  const citta = input.citta?.trim() ? input.citta.trim().slice(0, 80) : null;

  // 1. La riga esiste già?
  let riga: Riga | null = null;
  let legacy = false;
  {
    const r = await admin
      .from("organizers")
      .select("id, approval_status")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (r.error) {
      if (!colonnaAssente(r.error)) {
        logger.error("organizzatori", "riga organizzatore non letta:", r.error.message);
        return { ok: false, error: "Non riesco a verificare il tuo account. Riprova fra poco." };
      }
      legacy = true;
      const r2 = await admin.from("organizers").select("id").eq("user_id", input.userId).maybeSingle();
      if (r2.error) {
        logger.error("organizzatori", "riga organizzatore non letta:", r2.error.message);
        return { ok: false, error: "Non riesco a verificare il tuo account. Riprova fra poco." };
      }
      if (r2.data) riga = { id: r2.data.id, stato: "approved" };
    } else if (r.data) {
      riga = { id: r.data.id, stato: normalizzaStato(r.data.approval_status) };
    }
  }

  // 2. Se manca, la si crea in attesa (o, pre-migration, come una volta).
  let creata = false;
  if (!riga) {
    if (!legacy) {
      const ins = await admin
        .from("organizers")
        .insert({
          user_id: input.userId,
          display_name: nomeUtente,
          city: citta,
          approval_status: "pending",
        })
        .select("id")
        .single();
      if (ins.error && colonnaAssente(ins.error)) {
        legacy = true;
      } else if (ins.error || !ins.data) {
        logger.error("organizzatori", "riga organizzatore non creata:", ins.error?.message ?? "vuota");
        return { ok: false, error: "Non riesco a registrare la richiesta. Riprova fra poco." };
      } else {
        riga = { id: ins.data.id, stato: "pending" };
        creata = true;
      }
    }
    if (legacy) {
      const ins = await admin
        .from("organizers")
        .insert({ user_id: input.userId, display_name: nomeUtente })
        .select("id")
        .single();
      if (ins.error || !ins.data) {
        logger.error("organizzatori", "riga organizzatore (legacy) non creata:", ins.error?.message ?? "vuota");
        return { ok: false, error: "Non riesco a registrare la richiesta. Riprova fra poco." };
      }
      riga = { id: ins.data.id, stato: "approved" };
    }
  }
  if (!riga) return { ok: false, error: "Non riesco a registrare la richiesta. Riprova fra poco." };

  // 3. Ruolo: solo da `user`. Se la riga è già rifiutata, il ruolo non cambia il verdetto.
  const upd = await admin
    .from("profiles")
    .update({ role: "organizer" })
    .eq("id", input.userId)
    .eq("role", "user")
    .select("id");
  if (upd.error) {
    logger.error("organizzatori", "ruolo non aggiornato:", upd.error.message);
    return { ok: false, error: "Non riesco a registrare la richiesta. Riprova fra poco." };
  }

  // 4. Avvisi, solo alla prima richiesta e solo se c'è davvero un'attesa.
  if (creata && riga.stato === "pending" && email) {
    await avvisaRichiestaOrganizzatore({ email, nome: nomeUtente, citta });
  }

  return { ok: true, stato: riga.stato, creata };
}

/**
 * Email di «richiesta ricevuta» all'utente e avviso al team. Best effort: non
 * solleva mai, un'email persa non deve far fallire l'iscrizione.
 */
export async function avvisaRichiestaOrganizzatore(input: {
  email: string;
  nome: string;
  citta?: string | null;
}): Promise<void> {
  const base = getSiteUrl();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  await Promise.allSettled([
    dispatchEmail({
      key: "organizer_registration_received",
      to: input.email,
      params: { organizerName: input.nome, roleLabel: "Organizzatore" },
      fallback: {
        subject: "Richiesta ricevuta — N'arte",
        template: "OrganizerRegistrationReceived",
        react: createElement(NoticeEmail, {
          preview: "Abbiamo ricevuto la tua richiesta: il team verifica il tuo account.",
          heading: "Richiesta ricevuta",
          paragraphs: [
            `Ciao ${input.nome}, grazie per esserti registrato su N'arte come organizzatore.`,
            "Il team verifica ogni account prima di attivare richieste, chat e calendario. Ti scriviamo a questo indirizzo appena la verifica è conclusa.",
          ],
        }),
      },
    }),
    adminEmail
      ? sendEmail({
          to: adminEmail,
          subject: `[N'arte] Nuovo organizzatore da approvare — ${input.nome}`,
          template: "organizer_registration_admin",
          react: createElement(NoticeEmail, {
            preview: "Un nuovo organizzatore attende l'approvazione.",
            heading: "Nuovo organizzatore da approvare",
            paragraphs: ["Un nuovo account organizzatore attende la verifica del team."],
            rows: [
              { label: "Locale o realtà", value: input.nome },
              { label: "Città", value: input.citta ?? "" },
              { label: "Email", value: input.email },
            ],
            button: {
              label: "Apri le richieste in attesa",
              href: `${base}/admin/utenti?filtro=organizzatori-in-attesa`,
            },
          }),
        })
      : Promise.resolve(),
  ]);
}

/** Quanti organizzatori attendono. Errore (anche colonna assente) = 0: il badge si nasconde. */
export async function contaOrganizzatoriInAttesa(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("organizers")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
