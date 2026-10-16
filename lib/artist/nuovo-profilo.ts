import "server-only";
import { createElement } from "react";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { adminRecipients } from "@/lib/emails/admin-recipients";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { registraAzione } from "@/lib/moderation/decisioni";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Un artista ha creato un profilo aggiuntivo: nasce `pending` e il team deve
 * saperlo. Avvisa gli admin per email e lascia una riga nel Registro.
 *
 * Best effort: non lancia mai. Il profilo è già creato, un'email o una riga di
 * registro non partite non devono trasformare la creazione in un errore.
 */
export async function avvisaNuovoProfilo(input: {
  artistId: string;
  stageName: string;
  ownerId: string;
  ownerEmail: string | null;
}): Promise<void> {
  const adminUrl = `${getSiteUrl()}/admin/artisti`;
  const ownerEmail = input.ownerEmail ?? "";

  await Promise.allSettled([
    registraAzione({
      actorId: input.ownerId,
      targetType: "profilo",
      targetId: input.artistId,
      action: "profilo_creato",
      descrizione: `Nuovo profilo «${input.stageName}» creato dall'artista${ownerEmail ? ` (${ownerEmail})` : ""}: in attesa di approvazione.`,
      affectedUserId: input.ownerId,
    }),
    dispatchEmail({
      key: "artist_profile_pending_admin",
      to: adminRecipients(),
      params: { profileName: input.stageName, ownerEmail, adminUrl },
      meta: { artist_id: input.artistId },
      replyTo: ownerEmail || undefined,
      fallback: {
        subject: `[N'arte] Nuovo profilo da approvare — ${input.stageName}`,
        template: "artist_profile_pending_admin",
        react: createElement(NoticeEmail, {
          preview: "Un artista ha creato un nuovo profilo in attesa di approvazione.",
          heading: "Nuovo profilo da approvare",
          paragraphs: [
            "Un artista ha creato un profilo aggiuntivo. Resta nascosto dal catalogo finché non lo approvi.",
          ],
          rows: [
            { label: "Profilo", value: input.stageName },
            { label: "Account", value: ownerEmail },
          ],
          button: { label: "Apri i profili in attesa", href: adminUrl },
        }),
      },
    }),
  ]).then((esiti) => {
    for (const e of esiti) {
      if (e.status === "rejected") {
        logger.warn("artist/nuovo-profilo", "avviso non completato:", e.reason instanceof Error ? e.reason.message : String(e.reason));
      }
    }
  });
}
