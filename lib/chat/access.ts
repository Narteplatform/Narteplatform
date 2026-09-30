import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";

/**
 * Accesso motivato alle chat private (termini d'uso art. 8.6, doc. 06 art. 15).
 *
 * Il Team legge una conversazione solo dopo aver dichiarato perché, e solo per
 * una finestra breve. Ogni apertura è una riga di `chat_access_log`.
 *
 * SENZA REGISTRO NON SI LEGGE. Se la tabella non esiste (migration 0064 non
 * applicata) l'esito è `registro_assente` e il chiamante non deve mostrare
 * alcun messaggio: è il contrario del degrado morbido usato altrove, ed è
 * voluto, perché una lettura non registrata è proprio ciò che i termini
 * escludono.
 */

export const DURATA_ACCESSO_MINUTI = 120;

export type CategoriaAccesso = Database["public"]["Tables"]["chat_access_log"]["Row"]["reason_category"];

export const CATEGORIE_ACCESSO: { value: CategoriaAccesso; label: string }[] = [
  { value: "assistenza", label: "Assistenza a una delle parti" },
  { value: "contestazione", label: "Contestazione su una trattativa" },
  { value: "segnalazione", label: "Segnalazione ricevuta" },
  { value: "obbligo_di_legge", label: "Obbligo di legge" },
];

export function etichettaCategoria(c: string): string {
  return CATEGORIE_ACCESSO.find((x) => x.value === c)?.label ?? c;
}

export type AccessoValido = {
  id: string;
  reasonCategory: CategoriaAccesso;
  reasonText: string;
  reportReference: string | null;
  expiresAt: string;
};

export type EsitoAccesso =
  | { stato: "valido"; accesso: AccessoValido }
  | { stato: "da_motivare" }
  | { stato: "registro_assente" }
  | { stato: "errore"; messaggio: string };

export function registroAssente(code: string | undefined): boolean {
  return code === "42P01" || code === "PGRST205";
}

export async function getAccessoValido(
  adminUserId: string,
  conversationId: string,
): Promise<EsitoAccesso> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_access_log")
    .select("id, reason_category, reason_text, report_reference, expires_at")
    .eq("admin_user_id", adminUserId)
    .eq("conversation_id", conversationId)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (registroAssente(error.code)) {
      logger.warn("chat-access", "chat_access_log assente: applicare la migration 0064. Nessun messaggio mostrato.");
      return { stato: "registro_assente" };
    }
    logger.error("chat-access", "lettura registro accessi fallita:", error.message);
    return { stato: "errore", messaggio: "Non riesco a verificare l'accesso registrato. Riprova." };
  }
  if (!data) return { stato: "da_motivare" };
  return {
    stato: "valido",
    accesso: {
      id: data.id,
      reasonCategory: data.reason_category,
      reasonText: data.reason_text,
      reportReference: data.report_reference,
      expiresAt: data.expires_at,
    },
  };
}
