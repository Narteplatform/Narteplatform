import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

/**
 * Disattivazione delle segnalazioni del profilo: hash dell'email e token.
 *
 * SEGRETO. `REFERRAL_OPTOUT_SECRET` se presente; in mancanza si ripiega su
 * `SUPABASE_SERVICE_ROLE_KEY`, che sul server c'è sempre. Il token contiene
 * solo un HMAC: la chiave non esce mai dal server e non si ricava dal token.
 * Cambiare il segreto invalida tutti i link già spediti: impostare
 * REFERRAL_OPTOUT_SECRET una volta e non toccarlo più.
 *
 * Il token non scade: il link sta in un'email che può essere aperta mesi dopo,
 * e disattivare non è un'azione che vada protetta da una scadenza.
 */

function segreto(): string | null {
  const s = process.env.REFERRAL_OPTOUT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    logger.error("referrals", "Né REFERRAL_OPTOUT_SECRET né SUPABASE_SERVICE_ROLE_KEY sono configurate.");
    return null;
  }
  return s;
}

export function normalizzaEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(normalizzaEmail(email)).digest("hex");
}

function firma(payload: string, key: string): string {
  return createHmac("sha256", key).update(`referral-optout|${payload}`).digest("base64url");
}

/** Token `<email in base64url>.<hmac>`, o null se manca il segreto. */
export function creaTokenOptout(email: string): string | null {
  const key = segreto();
  if (!key) return null;
  const payload = Buffer.from(normalizzaEmail(email), "utf8").toString("base64url");
  return `${payload}.${firma(payload, key)}`;
}

/** L'email contenuta nel token se la firma è valida, altrimenti null. */
export function verificaTokenOptout(token: string | null | undefined): string | null {
  if (!token || token.length > 1024) return null;
  const key = segreto();
  if (!key) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const attesa = Buffer.from(firma(payload, key));
  const ricevuta = Buffer.from(sig);
  if (attesa.length !== ricevuta.length || !timingSafeEqual(attesa, ricevuta)) return null;
  const email = Buffer.from(payload, "base64url").toString("utf8");
  return email.includes("@") ? email : null;
}
