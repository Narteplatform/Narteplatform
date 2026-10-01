"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import {
  registraProvaSuIubendaInBackground,
  TESTO_CASELLA,
} from "@/lib/legal/iubenda-consent";
import { logger } from "@/lib/logger";
import { contestoRichiesta } from "@/lib/legal/consents";
import { iscriviNewsletter } from "@/lib/brevo/contacts";

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

    await completaContestoConsensi(admin, user.id, ETA_MAX_MS);

    if (meta.accepted_marketing === true && user.email) {
      const nomeNl = typeof meta.full_name === "string" ? meta.full_name : undefined;
      await iscriviNewsletter(user.email, nomeNl);
    }

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

/**
 * Completa le righe di `user_consents` scritte dalla trigger di registrazione
 * con il contesto tecnico (user agent, impronta IP) e il ruolo.
 *
 * La trigger non vede la richiesta HTTP, quindi quelle colonne restano vuote:
 * qui, dalla server action chiamata subito dopo il signUp, il contesto è quello
 * del browser che si è appena registrato.
 *
 * REGOLE: solo righe dell'utente create da meno di `etaMaxMs`; ogni colonna si
 * scrive SOLO dove è ancora null (`is null`), quindi non si sovrascrive mai un
 * valore già presente; il ruolo si legge da `profiles` con errore controllato e,
 * se la lettura fallisce, non si scrive (niente ruolo inventato). Se le colonne
 * non esistono (0070 non applicata) l'errore è atteso: avviso e si prosegue.
 * Non solleva.
 */
async function completaContestoConsensi(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  etaMaxMs: number
): Promise<void> {
  try {
    const ctx = await contestoRichiesta();
    const dal = new Date(Date.now() - etaMaxMs).toISOString();

    const { data: profilo, error: profiloErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profiloErr) {
      logger.warn("register/contesto", "ruolo non letto:", profiloErr.message);
    }
    const ruolo = profiloErr ? null : (profilo?.role ?? null);

    // Una scrittura per colonna, ciascuna solo dove è ancora null: un valore
    // già presente non si tocca mai.
    const tentativi: Array<{ colonna: string; esegui: () => PromiseLike<{ error: { message: string } | null }> }> = [];
    const userAgent = ctx.userAgent ? ctx.userAgent.slice(0, 400) : null;
    if (userAgent) {
      tentativi.push({
        colonna: "user_agent",
        esegui: () =>
          admin
            .from("user_consents")
            .update({ user_agent: userAgent })
            .eq("user_id", userId)
            .gte("accepted_at", dal)
            .is("user_agent", null),
      });
    }
    if (ctx.ipHash) {
      const ipHash = ctx.ipHash;
      tentativi.push({
        colonna: "ip_hash",
        esegui: () =>
          admin
            .from("user_consents")
            .update({ ip_hash: ipHash })
            .eq("user_id", userId)
            .gte("accepted_at", dal)
            .is("ip_hash", null),
      });
    }
    if (ruolo) {
      tentativi.push({
        colonna: "role",
        esegui: () =>
          admin
            .from("user_consents")
            .update({ role: ruolo })
            .eq("user_id", userId)
            .gte("accepted_at", dal)
            .is("role", null),
      });
    }

    for (const { colonna, esegui } of tentativi) {
      const { error } = await esegui();
      if (error) {
        // Colonna inesistente = 0070 non ancora applicata: nessun danno.
        logger.warn("register/contesto", `colonna ${colonna} non aggiornata:`, error.message);
        return;
      }
    }
  } catch (e) {
    logger.warn("register/contesto", "contesto non registrato:", e instanceof Error ? e.message : String(e));
  }
}
