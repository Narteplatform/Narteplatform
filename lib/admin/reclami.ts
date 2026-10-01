import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Chi decide un reclamo non dovrebbe essere chi ha preso la decisione
 * contestata. Il reclamo riesamina una decisione (art. 20 DSA): lo fa una
 * persona diversa, o almeno in modo dichiarato.
 *
 * La decisione contestata si riconosce da `contested_reference`:
 *   - `D-XXXXXXXX` → riga di `moderation_actions` il cui id comincia con quegli
 *     otto caratteri; l'autore è `actor_id`;
 *   - altro (S-/R-…) → riferimento di un'altra segnalazione; l'autore è
 *     `decided_by`.
 */

export type EsitoConflitto =
  | { ok: true; conflitto: boolean; descrizione: string | null }
  | { ok: false };

const D_RE = /^D-([0-9A-F]{8})$/i;

export async function conflittoNelReclamo(
  report: { kind: string; contested_reference: string | null },
  userId: string,
): Promise<EsitoConflitto> {
  if (report.kind !== "reclamo" || !report.contested_reference) {
    return { ok: true, conflitto: false, descrizione: null };
  }
  const rif = report.contested_reference.trim().toUpperCase();
  const admin = createAdminClient();

  let autore: string | null = null;
  let origine = "";
  const m = D_RE.exec(rif);
  if (m) {
    const hex = m[1].toLowerCase();
    const { data, error } = await admin
      .from("moderation_actions")
      .select("actor_id")
      .gte("id", `${hex}-0000-0000-0000-000000000000`)
      .lte("id", `${hex}-ffff-ffff-ffff-ffffffffffff`)
      .limit(1);
    if (error) {
      logger.warn("admin/reclami", "decisione contestata non leggibile:", error.message);
      return { ok: false };
    }
    autore = data?.[0]?.actor_id ?? null;
    origine = `la decisione ${rif}`;
  } else {
    const { data, error } = await admin
      .from("content_reports")
      .select("decided_by")
      .eq("reference", rif)
      .maybeSingle();
    if (error) {
      logger.warn("admin/reclami", "segnalazione contestata non leggibile:", error.message);
      return { ok: false };
    }
    autore = data?.decided_by ?? null;
    origine = `l'esito della segnalazione ${rif}`;
  }

  if (autore && autore === userId) {
    return {
      ok: true,
      conflitto: true,
      descrizione: `Hai preso tu ${origine} che questo reclamo contesta. Meglio che lo riesamini un altro membro del team.`,
    };
  }
  return { ok: true, conflitto: false, descrizione: null };
}
