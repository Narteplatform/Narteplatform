import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteObject } from "@/lib/storage/bunny/storage";
import { isBunnyStorageUrl } from "@/lib/storage/bunny/urls";
import { logger } from "@/lib/logger";

type AdminClient = ReturnType<typeof createAdminClient>;

export type FileDaPulire = {
  /** Profilo a cui apparteneva il file. */
  artistId: string | null;
  url: string;
  storageKey?: string | null;
  /** Richiesta di moderazione da non contare come «altro utilizzo» (quella rifiutata ora). */
  ignoraSubmissionId?: string;
  /**
   * `true` per un file già pubblicato e appena tolto dal profilo: le richieste
   * `approved` con lo stesso indirizzo sono quella stessa pubblicazione e non
   * vanno contate; contano solo quelle ancora in attesa.
   */
  soloInAttesa?: boolean;
  /** Etichetta per i log. */
  contesto: string;
};

/**
 * Toglie da Bunny Storage un file, ma SOLO se nessuna parte dei profili
 * dell'account lo usa (gallery, cover_image, audio_files) e nessuna altra
 * richiesta di moderazione lo riguarda.
 *
 * Fail-safe: ogni lettura fallita o ambigua → NON si cancella nulla. Mai
 * bloccante per la decisione già presa. Estratta da
 * app/(admin)/admin/moderazione/_actions.ts per usarla anche nella rimozione
 * di un media già pubblicato.
 */
export async function rimuoviFileSeNonUsato(admin: AdminClient, file: FileDaPulire): Promise<void> {
  // Solo la NOSTRA pull zone Bunny: chiavi Supabase o URL esterni non si toccano.
  if (!file.artistId || !isBunnyStorageUrl(file.url)) return;

  let key = file.storageKey?.trim() || null;
  if (!key) {
    try {
      key = decodeURIComponent(new URL(file.url).pathname).replace(/^\/+/, "") || null;
    } catch {
      key = null;
    }
  }
  if (!key) return;

  try {
    const { data: profilo, error } = await admin
      .from("artists")
      .select("user_id")
      .eq("id", file.artistId)
      .maybeSingle();
    if (error || !profilo) {
      logger.warn(file.contesto, "profilo non leggibile: file NON cancellato", {
        error: error?.message ?? "profilo non trovato",
      });
      return;
    }
    const profili = profilo.user_id
      ? await admin.from("artists").select("gallery, cover_image, audio_files").eq("user_id", profilo.user_id)
      : await admin.from("artists").select("gallery, cover_image, audio_files").eq("id", file.artistId);
    if (profili.error || !profili.data) {
      logger.warn(file.contesto, "profili dell'account non leggibili: file NON cancellato", {
        error: profili.error?.message,
      });
      return;
    }

    let altre = admin
      .from("artist_media_submissions")
      .select("id", { count: "exact", head: true })
      .eq("url", file.url);
    if (file.ignoraSubmissionId) altre = altre.neq("id", file.ignoraSubmissionId);
    altre = file.soloInAttesa ? altre.eq("status", "pending") : altre.neq("status", "rejected");
    const altreEsito = await altre;
    if (altreEsito.error) {
      logger.warn(file.contesto, "altre richieste non leggibili: file NON cancellato", {
        error: altreEsito.error.message,
      });
      return;
    }
    if ((altreEsito.count ?? 0) > 0) return;

    const inUso = JSON.stringify(profili.data.map((p) => [p.gallery, p.cover_image, p.audio_files]));
    const varianti = [file.url, key, encodeURI(key)];
    if (varianti.some((v) => inUso.includes(v))) {
      logger.debug(file.contesto, "file ancora usato: non cancellato");
      return;
    }

    const esito = await deleteObject(key);
    logger.debug(file.contesto, "file rimosso da Bunny", { esito });
  } catch (e) {
    logger.error(file.contesto, "rimozione da Bunny Storage fallita", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
