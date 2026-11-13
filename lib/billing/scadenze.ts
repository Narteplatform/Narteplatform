import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { entitlementsFor, PLAN_LABELS } from "@/lib/billing/plans";
import { funzioneAssente, rpcSenzaTipi } from "@/lib/billing/rpc";
import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Piani scaduti e profili sospesi.
 *
 * `artists.tier` è una cache aggiornata dai trigger quando cambia un dato, non
 * quando passa il tempo: un omaggio o un premio inviti che scade lascerebbe il
 * piano alto finché qualcuno non tocca l'account. Ogni notte il cron
 * /api/cron/abbonamenti riallinea la cache e le sospensioni dei profili.
 */

const AREA = "billing/scadenze";

type RigaRicalcolo = {
  account_id: string;
  piano_prima: ArtistTier | null;
  piano_dopo: ArtistTier | null;
  sospesi: string[] | null;
  riattivati: string[] | null;
};

export type EsitoRicalcolo =
  | {
      ok: true;
      /** "0082" = funzione completa; "inviti" = ripiego su inviti_sync_scaduti (48 ore, senza sospensioni). */
      via: "0082" | "inviti";
      account: number;
      cambi: { userId: string; prima: ArtistTier | null; dopo: ArtistTier | null; sospesi: number; riattivati: number }[];
    }
  | { ok: false; error: string };

export async function ricalcolaPianiScaduti(limite = 200): Promise<EsitoRicalcolo> {
  const { data, error } = await rpcSenzaTipi<RigaRicalcolo[]>("abbonamenti_ricalcola_piani", { p_limite: limite });
  if (!error) {
    const righe = data ?? [];
    return {
      ok: true,
      via: "0082",
      account: righe.length,
      cambi: righe.map((r) => ({
        userId: r.account_id,
        prima: r.piano_prima,
        dopo: r.piano_dopo,
        sospesi: (r.sospesi ?? []).length,
        riattivati: (r.riattivati ?? []).length,
      })),
    };
  }
  if (!funzioneAssente(error)) {
    logger.error(AREA, "ricalcolo dei piani fallito:", error.message);
    return { ok: false, error: error.message };
  }

  // Migration 0082 non applicata: il ricalcolo di prima (ultime 48 ore).
  const { data: n, error: errInviti } = await createAdminClient().rpc("inviti_sync_scaduti");
  if (errInviti) {
    logger.error(AREA, "ripiego inviti_sync_scaduti fallito:", errInviti.message);
    return { ok: false, error: errInviti.message };
  }
  return { ok: true, via: "inviti", account: n ?? 0, cambi: [] };
}

/**
 * Email `profiles_suspended` agli account con profili sospesi per il piano
 * negli ultimi `giorni` giorni — da qualunque strada sia arrivata la
 * sospensione (cron, disdetta via webhook, omaggio scaduto).
 *
 * IDEMPOTENZA: per ogni account si invia una volta per «ondata» di
 * sospensioni, identificata dalla data dell'ultima sospensione. Se il registro
 * email non è leggibile NON si invia (meglio un avviso in meno che uno doppio
 * ogni notte). Solo gli invii riusciti contano: un fallimento si riprova.
 */
export async function inviaAvvisiSospensione(
  opts: { userIds?: string[]; giorni?: number } = {},
): Promise<{ inviati: number; saltati: number; errori: number }> {
  const esito = { inviati: 0, saltati: 0, errori: 0 };
  const admin = createAdminClient();
  const giorni = opts.giorni ?? 3;
  const da = new Date(Date.now() - giorni * 86_400_000).toISOString();

  let q = admin
    .from("artists")
    .select("user_id")
    .eq("plan_suspended", true)
    // Solo profili approvati: uno ancora in revisione non era online, e
    // l'email direbbe il falso («non sono più visibili sul sito»).
    .eq("status", "approved")
    .not("user_id", "is", null)
    .gte("plan_suspended_at", da)
    .limit(500);
  if (opts.userIds && opts.userIds.length > 0) q = q.in("user_id", opts.userIds);
  const { data: recenti, error } = await q;
  if (error) {
    logger.error(AREA, "profili sospesi non leggibili:", error.message);
    return { ...esito, errori: 1 };
  }
  const utenti = [...new Set((recenti ?? []).map((r) => r.user_id).filter((u): u is string => Boolean(u)))];

  for (const userId of utenti.slice(0, 100)) {
    try {
      const { data: profili, error: pErr } = await admin
        .from("artists")
        .select("id, stage_name, plan_suspended_at")
        .eq("user_id", userId)
        .eq("plan_suspended", true)
        .eq("status", "approved")
        .order("created_at", { ascending: true });
      if (pErr) {
        esito.errori++;
        logger.warn(AREA, "profili dell'account non leggibili:", pErr.message);
        continue;
      }
      const sospesi = profili ?? [];
      if (sospesi.length === 0) {
        esito.saltati++;
        continue;
      }
      const date = sospesi.map((p) => p.plan_suspended_at ?? "").sort();
      const ondata = date[date.length - 1] ?? "";

      const { count, error: logErr } = await admin
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("template", "profiles_suspended")
        .eq("status", "sent")
        .contains("meta", { sospensione_piano: userId, ondata });
      if (logErr) {
        esito.errori++;
        logger.warn(AREA, "email_log non leggibile, avviso rinviato:", logErr.message);
        continue;
      }
      if ((count ?? 0) > 0) {
        esito.saltati++;
        continue;
      }

      const { data: u, error: uErr } = await admin.auth.admin.getUserById(userId);
      if (uErr || !u.user?.email) {
        esito.errori++;
        continue;
      }
      const { data: tier, error: tErr } = await admin.rpc("account_tier", { p_user_id: userId });
      if (tErr) {
        esito.errori++;
        logger.warn(AREA, "piano dell'account non leggibile:", tErr.message);
        continue;
      }
      const piano: ArtistTier = tier ?? "free";
      const ammessi = entitlementsFor(piano).artistProfilesMax;
      const nome = (u.user.user_metadata as { full_name?: string } | null)?.full_name?.trim() || "ciao";

      const res = await dispatchEmail({
        key: "profiles_suspended",
        to: u.user.email,
        params: {
          artistName: nome,
          planName: PLAN_LABELS[piano],
          profileNames: sospesi.map((p) => p.stage_name).join(", "),
          allowedLabel: ammessi === 1 ? "1 profilo" : `${ammessi} profili`,
          billingUrl: `${getSiteUrl()}/dashboard/abbonamento`,
        },
        meta: { sospensione_piano: userId, ondata },
        subjectPreview: "Alcuni tuoi profili non sono più online",
      });
      if (res.ok) esito.inviati++;
      else esito.errori++;
    } catch (e) {
      esito.errori++;
      logger.error(AREA, "avviso sospensione:", e instanceof Error ? e.message : String(e));
    }
  }
  return esito;
}
