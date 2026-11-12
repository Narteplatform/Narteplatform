import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { creaNotificaRaggruppata } from "@/lib/notifications";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Avvisi a chi invita. Best-effort: non lanciano mai, perché un avviso perso
 * non deve fermare né il webhook né il cron.
 *
 * Una notifica per invito (`refKey`): le tappe successive aggiornano la stessa
 * voce della campanella invece di accumularne cinque.
 */
const AREA = "inviti";
export const HREF_INVITI = "/dashboard/invita";

export async function avvisaChiInvita(input: {
  inviterUserId: string;
  inviteId: string;
  title: string;
  body: string;
}): Promise<void> {
  await creaNotificaRaggruppata({
    userId: input.inviterUserId,
    kind: "invito_artista",
    title: input.title,
    body: input.body,
    href: HREF_INVITI,
    refKey: `invito:${input.inviteId}`,
  });
}

/** Nome da usare nei saluti: il primo profilo dell'account, o niente. */
async function nomeArtista(userId: string): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("artists")
    .select("stage_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) return "";
  return (data ?? [])[0]?.stage_name ?? "";
}

export async function emailPremioAccreditato(input: {
  inviterUserId: string;
  inviteId: string;
  inviteeName: string;
  rewardDetail: string;
  yearLabel: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(input.inviterUserId);
    const email = data?.user?.email;
    if (error || !email) {
      logger.warn(AREA, "email del premio non inviata: indirizzo non leggibile", error?.message ?? "");
      return;
    }
    await dispatchEmail({
      key: "invite_reward_granted",
      to: email,
      params: {
        artistName: (await nomeArtista(input.inviterUserId)) || "artista",
        inviteeName: input.inviteeName,
        rewardDetail: input.rewardDetail,
        yearLabel: input.yearLabel,
        invitesUrl: `${getSiteUrl()}${HREF_INVITI}`,
      },
      subjectPreview: "Hai guadagnato 1 mese di Pro",
      meta: { invite_id: input.inviteId },
    });
  } catch (e) {
    logger.error(AREA, "email premio:", e instanceof Error ? e.message : String(e));
  }
}
