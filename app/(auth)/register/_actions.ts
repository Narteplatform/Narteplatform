"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import {
  registraProvaSuIubendaInBackground,
  TESTO_CASELLA,
} from "@/lib/legal/iubenda-consent";
import { logger } from "@/lib/logger";

const uuidSchema = z.string().uuid();

/** Oltre questa età l'account non è più «appena creato»: nessuna prova. */
const ETA_MAX_MS = 10 * 60 * 1000;

/**
 * Copia presso iubenda della prova di consenso data in registrazione.
 *
 * Il signUp avviene dal browser, quindi la prova va inviata da qui. Poiché la
 * action è raggiungibile da chiunque, si accetta solo per un utente creato da
 * meno di 10 minuti e per cui la trigger `record_signup_consents` ha già scritto
 * il consenso ai termini: nessuno può generare prove per account altrui vecchi.
 *
 * Non solleva e non restituisce dettagli: l'esito finisce solo nei log.
 */
export async function registraProvaRegistrazione(userId: string): Promise<void> {
  try {
    const id = uuidSchema.safeParse(userId);
    if (!id.success) return;

    if (!(await allowByIp(LIMITI.provaIubenda))) return;

    const admin = createAdminClient();

    const { data: lettura, error: userErr } = await admin.auth.admin.getUserById(id.data);
    if (userErr || !lettura?.user) {
      logger.warn("register/iubenda", "utente non letto:", userErr?.message ?? "assente");
      return;
    }
    const user = lettura.user;

    const creato = Date.parse(user.created_at);
    if (!Number.isFinite(creato) || Date.now() - creato > ETA_MAX_MS) return;

    const { data: righe, error: consErr } = await admin
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", "termini")
      .limit(1);
    if (consErr) {
      logger.warn("register/iubenda", "consensi non letti:", consErr.message);
      return;
    }
    if (!righe || righe.length === 0) return;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const nome = typeof meta.full_name === "string" && meta.full_name ? meta.full_name : undefined;

    registraProvaSuIubendaInBackground({
      soggettoId: user.id,
      email: user.email ?? undefined,
      nomeCompleto: nome,
      documenti: ["privacy_policy", "terms"],
      preferenze: {
        privacy_policy: true,
        terms: true,
        maggiore_eta: true,
        marketing: meta.accepted_marketing === true,
      },
      modulo: "Registrazione",
      testoCasella: `${TESTO_CASELLA.termini} — ${TESTO_CASELLA.eta}`,
    });
  } catch (e) {
    logger.warn("register/iubenda", "prova non inviata:", e instanceof Error ? e.message : String(e));
  }
}
