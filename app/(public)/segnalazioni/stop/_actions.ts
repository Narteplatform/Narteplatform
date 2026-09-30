"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { hashEmail, verificaTokenOptout } from "@/lib/referrals/optout";
import { tabellaAssente } from "@/lib/referrals/periodo";
import { logger } from "@/lib/logger";

/**
 * Disattiva le segnalazioni di profilo per l'indirizzo contenuto nel token.
 * Parte solo dall'invio esplicito del modulo (POST): aprire il link non basta.
 * Idempotente: disattivare due volte non è un errore.
 */
export async function disattivaSegnalazioniAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const email = verificaTokenOptout(token);
  if (!email) redirect("/segnalazioni/stop?esito=non-valido");

  const admin = createAdminClient();
  const { error } = await admin
    .from("referral_optouts")
    .upsert({ email_hash: hashEmail(email) }, { onConflict: "email_hash", ignoreDuplicates: true });

  if (error) {
    if (tabellaAssente(error.code)) {
      logger.warn("referrals", "referral_optouts assente: applicare la migration 0068.");
    } else {
      logger.error("referrals", "registrazione opt-out fallita:", error.message);
    }
    redirect("/segnalazioni/stop?esito=errore");
  }
  redirect("/segnalazioni/stop?esito=fatto");
}
