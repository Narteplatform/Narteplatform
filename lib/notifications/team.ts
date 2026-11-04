import "server-only";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { adminRecipients } from "@/lib/emails/admin-recipients";
import ContactMessageEmail from "@/lib/emails/templates/ContactMessageEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { creaNotificheAdmin } from "@/lib/notifications";

/**
 * Avviso al team per un messaggio arrivato dall'interno della piattaforma
 * (feedback, «scrivi al team» dalla pagina Consulente): notifica in-app ai
 * superadmin, in tempo reale, ed email alla casella del team.
 *
 * L'email riusa la chiave `contact_message` (stesso modello del modulo
 * contatti, con risposta diretta al mittente): niente template nuovi da
 * pubblicare su Brevo. Best-effort: non solleva mai.
 */
export async function avvisaTeam(input: {
  kind: string;
  /** Titolo della notifica in-app. */
  titolo: string;
  /** Testo breve della notifica in-app. */
  anteprima?: string | null;
  /** Pagina admin dove leggere il messaggio, es. "/admin/feedback". */
  adminPath: string;
  mittente: { nome: string; email: string | null };
  oggettoEmail: string;
  messaggio: string;
}): Promise<void> {
  const adminUrl = `${getSiteUrl()}${input.adminPath}`;
  const esiti = await Promise.allSettled([
    creaNotificheAdmin({
      kind: input.kind,
      title: input.titolo,
      body: input.anteprima ?? null,
      href: input.adminPath,
    }),
    dispatchEmail({
      key: "contact_message",
      to: adminRecipients(),
      replyTo: input.mittente.email ?? undefined,
      params: {
        name: input.mittente.nome,
        email: input.mittente.email ?? "",
        subject: input.oggettoEmail,
        message: input.messaggio,
        adminUrl,
      },
      subjectPreview: input.oggettoEmail,
      fallback: {
        subject: input.oggettoEmail,
        template: "ContactMessage",
        react: ContactMessageEmail({
          name: input.mittente.nome,
          email: input.mittente.email ?? "",
          subject: input.oggettoEmail,
          message: input.messaggio,
        }),
      },
    }),
  ]);
  for (const e of esiti) {
    if (e.status === "rejected") {
      logger.error("team", "avviso al team non riuscito:", e.reason instanceof Error ? e.reason.message : String(e.reason));
    }
  }
}
