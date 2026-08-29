import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Registra un oggetto scritto su Bunny Storage.
 *
 * A cosa serve: senza, l'unico modo per sapere cosa esiste davvero su Bunny
 * sarebbe elencare la storage zone e confrontarla a mano con sei colonne sparse
 * su cinque tabelle. È ciò che rende verificabile la promessa "nessun dato
 * perso", e ciò che in futuro permetterà di individuare i file orfani — quelli
 * che un artista carica e poi abbandona chiudendo la scheda — per poterli
 * elencare PRIMA di decidere se cancellarli.
 *
 * ⚠️ BEST-EFFORT, SEMPRE. Un errore qui viene registrato e ignorato: il file è
 * già sul CDN e l'utente ha già l'URL. Far fallire un upload riuscito perché
 * non si è potuta scrivere una riga di registro sarebbe il rimedio peggiore
 * del male.
 */
export async function recordMediaAsset(input: {
  storageKey: string;
  publicUrl: string;
  kind: "image" | "audio";
  ownerUserId?: string | null;
  artistId?: string | null;
  bytes?: number | null;
  mimeType?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("media_assets").insert({
      provider: "bunny",
      storage_key: input.storageKey,
      public_url: input.publicUrl,
      kind: input.kind,
      owner_user_id: input.ownerUserId ?? null,
      artist_id: input.artistId ?? null,
      bytes: input.bytes ?? null,
      mime_type: input.mimeType ?? null,
    });
    // 23505 = chiave già presente: è un rientro, non un problema.
    if (error && error.code !== "23505") {
      logger.warn("bunny/registry", "registrazione asset fallita", error);
    }
  } catch (e) {
    logger.warn("bunny/registry", "registrazione asset fallita", e);
  }
}
