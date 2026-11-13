import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { isAccountNuovo } from "@/lib/auth/costanti";
import { leggiStatoOrganizzatore } from "@/lib/organizers/approvazione";

/**
 * Email di benvenuto (template Brevo `welcome_user`) a chi ha appena creato
 * l'account e ha accettato i consensi.
 *
 * A CHI. Solo account nuovi (isAccountNuovo) con ruolo `user`, oppure
 * `organizer` GIÀ approvato: il testo dice «il tuo account è attivo», e a un
 * organizzatore in attesa sarebbe falso — lui riceve già «richiesta ricevuta».
 * Artisti, consulenti e superadmin hanno le loro email.
 *
 * UNA VOLTA SOLA. L'idempotenza è il registro `email_log`: se esiste già una
 * riga `welcome_user` per quell'indirizzo (qualunque esito) non si rimanda.
 * Se la lettura del registro fallisce NON si invia: meglio un benvenuto perso
 * che due.
 *
 * Best effort: non solleva mai.
 */
export async function inviaBenvenutoSeNuovo(utente: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  ruolo?: string | null;
  nome?: string | null;
}): Promise<void> {
  try {
    const email = utente.email?.trim().toLowerCase();
    if (!email) return;
    if (!isAccountNuovo(utente.created_at)) return;
    if (utente.ruolo !== "user" && utente.ruolo !== "organizer") return;
    if (utente.ruolo === "organizer" && (await leggiStatoOrganizzatore(utente.id)) !== "approved") return;

    const admin = createAdminClient();
    const { data: giaInviata, error } = await admin
      .from("email_log")
      .select("id")
      .eq("template", "welcome_user")
      .contains("to_addresses", [email])
      .limit(1);
    if (error) {
      logger.warn("auth/benvenuto", "registro email non letto, benvenuto non inviato:", error.message);
      return;
    }
    if ((giaInviata?.length ?? 0) > 0) return;

    const base = getSiteUrl();
    const nome = utente.nome?.trim().split(/\s+/)[0] || email.split("@")[0] || "";
    await dispatchEmail({
      key: "welcome_user",
      to: email,
      params: { name: nome, artistsUrl: `${base}/artisti`, eventsUrl: `${base}/eventi` },
      subjectPreview: "Benvenuto su N'arte",
      meta: { user_id: utente.id },
    });
  } catch (e) {
    logger.warn("auth/benvenuto", "benvenuto non inviato:", e instanceof Error ? e.message : String(e));
  }
}
