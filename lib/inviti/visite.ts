import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { clientIp, isBotUserAgent, romeDateISO, visitorHash } from "@/lib/analytics/visitor";
import { logger } from "@/lib/logger";
import { normalizzaCodice } from "@/lib/inviti/regole";
import type { InviteVisitKind } from "@/lib/supabase/types";

/**
 * Apertura di un link d'invito (migration 0079), per il pannello /admin/inviti.
 *
 * Stesso schema privacy delle statistiche del profilo (lib/analytics/visitor.ts):
 * in tabella finisce solo un hash giornaliero che dipende da VISIT_HASH_SALT.
 * Senza il sale non si registra niente. Lo slug dell'hash è prefissato con
 * «invito:» così un visitatore di un link e quello di un profilo con lo stesso
 * nome non producono lo stesso pseudonimo.
 *
 * Non lancia mai: un'apertura persa non deve toccare la navigazione.
 */
export async function registraAperturaInvito(input: {
  codice: unknown;
  kind: InviteVisitKind;
  headers: Headers;
}): Promise<void> {
  try {
    const code = normalizzaCodice(input.codice);
    if (!code) return;
    if (isBotUserAgent(input.headers.get("user-agent"))) return;
    const ip = clientIp(input.headers);
    if (!ip) return;
    const hash = visitorHash(ip, `invito:${code}`, romeDateISO());
    if (!hash) return;

    // Chi è collegato si legge dalla sessione: la RPC esclude il proprietario
    // del link e i superadmin.
    const viewer = await getCurrentUser();

    const admin = createAdminClient();
    const { error } = await admin.rpc("inviti_registra_visita", {
      p_code: code,
      p_visitor_hash: hash,
      p_kind: input.kind,
      p_viewer_user_id: viewer?.id ?? null,
    });
    // PGRST202: funzione assente, migration 0079 non applicata. Silenzio.
    if (error && error.code !== "PGRST202" && error.code !== "42883") {
      logger.warn("inviti", "apertura del link non registrata:", error.message);
    }
  } catch (e) {
    logger.warn("inviti", "registraAperturaInvito:", e instanceof Error ? e.message : String(e));
  }
}
