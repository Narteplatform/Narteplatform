import "server-only";

import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Avvisa il superadmin che un artista ha caricato contenuti da approvare.
 *
 * Senza questa notifica la moderazione va a memoria: l'artista carica, non
 * vede comparire niente sul proprio profilo e scrive per sapere perché, mentre
 * la coda in /admin resta lì. La mail è quello che rende praticabile
 * l'approvazione preventiva.
 *
 * Una per artista ogni mezz'ora, non una per file: chi carica una galleria
 * carica dodici foto in due minuti, e dodici email di fila fanno smettere di
 * leggerle. La finestra si ricava da `email_log`, come già fa la chat: nessuna
 * colonna nuova.
 */

const THROTTLE_MINUTES = 30;
const TEMPLATE = "media_pending_admin";

function adminEmail(): string | null {
  const raw = process.env.SUPERADMIN_EMAIL?.trim();
  return raw && raw.includes("@") ? raw : null;
}

async function recentlyNotified(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString();

  const { data, error } = await admin
    .from("email_log")
    .select("id")
    .eq("template", TEMPLATE)
    .eq("status", "sent")
    .contains("to_addresses", [email])
    .gt("sent_at", since)
    .limit(1);

  // Lettura fallita: si manda comunque. Un doppione si cestina, una coda di
  // moderazione dimenticata blocca il lavoro di un artista.
  if (error) {
    logger.error("[media/notify] controllo throttle fallito", { error: error.message });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function notifyMediaSubmission(
  artistId: string,
  count: number
): Promise<void> {
  if (count <= 0) return;

  const to = adminEmail();
  if (!to) return;
  if (await recentlyNotified(to)) return;

  const admin = createAdminClient();
  const { data: artist, error: artistErr } = await admin
    .from("artists")
    .select("stage_name")
    .eq("id", artistId)
    .maybeSingle();
  // Il nome serve solo all'etichetta: se la lettura fallisce l'avviso parte
  // comunque, con un nome generico.
  if (artistErr) {
    logger.warn("media/notify", "nome artista non letto:", artistErr.message);
  }

  const artistName = artist?.stage_name ?? "Un artista";
  const moderationUrl = `${getSiteUrl()}/admin/moderazione`;

  await dispatchEmail({
    key: "media_pending_admin",
    to,
    params: { artistName, count, moderationUrl },
    fallback: {
      subject: `[N'arte] Contenuti da approvare — ${artistName}`,
      template: TEMPLATE,
      react: createElement(NoticeEmail, {
        preview: "Un artista ha caricato contenuti in attesa di approvazione.",
        heading: "Contenuti da approvare",
        paragraphs: [
          `${artistName} ha caricato nuovi contenuti: restano nascosti dal profilo pubblico finché non li approvi.`,
        ],
        rows: [
          { label: "Artista", value: artistName },
          { label: "Contenuti da approvare", value: String(count) },
        ],
        button: { label: "Apri la coda di moderazione", href: moderationUrl },
      }),
    },
  });
}
