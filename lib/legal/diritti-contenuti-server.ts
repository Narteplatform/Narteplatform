import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { LEGAL_VERSION } from "@/lib/legal/content";
import { logger } from "@/lib/logger";

export type EsitoDirittiContenuti =
  | { ok: true; dichiarato: boolean }
  | { ok: false; error: string };

/**
 * L'utente ha dichiarato di avere i diritti sui contenuti, per la versione
 * legale in vigore?
 *
 * Conta l'ULTIMO evento (accettazione o ritiro) per `diritti_contenuti` alla
 * versione corrente: un ritiro successivo annulla la dichiarazione.
 *
 * Un errore di lettura NON è «non dichiarato»: è «non lo so». Si restituisce
 * `ok: false` con un messaggio leggibile, così chi chiama può rifiutare
 * l'operazione senza mostrare all'artista la modale della dichiarazione (che
 * firmerebbe una seconda volta qualcosa che forse ha già firmato) e senza
 * scrivere niente sulla base di un dato che non si è letto.
 *
 * Legge con l'admin client perché serve anche a controllare un utente diverso
 * da quello in sessione; non scrive mai.
 */
export async function haDichiaratoDiritti(userId: string): Promise<EsitoDirittiContenuti> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_consents")
    .select("accepted")
    .eq("user_id", userId)
    .eq("kind", "diritti_contenuti")
    .eq("version", LEGAL_VERSION)
    .order("accepted_at", { ascending: false })
    .limit(1);

  if (error) {
    logger.error("legal/diritti-contenuti", `lettura dichiarazione fallita: ${error.message}`);
    return {
      ok: false,
      error:
        "Non riesco a verificare la dichiarazione sui diritti dei contenuti. Riprova fra poco.",
    };
  }
  return { ok: true, dichiarato: data?.[0]?.accepted === true };
}
