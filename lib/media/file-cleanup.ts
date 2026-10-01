import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteObject } from "@/lib/storage/bunny/storage";
import { isBunnyStorageUrl, isSupabasePublicUrl } from "@/lib/storage/bunny/urls";
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
 * Toglie un file da Bunny Storage o dai bucket media di Supabase, ma SOLO se nessuna parte dei profili
 * dell'account lo usa (gallery, cover_image, audio_files) e nessuna altra
 * richiesta di moderazione lo riguarda.
 *
 * Fail-safe: ogni lettura fallita o ambigua → NON si cancella nulla. Mai
 * bloccante per la decisione già presa. Estratta da
 * app/(admin)/admin/moderazione/_actions.ts per usarla anche nella rimozione
 * di un media già pubblicato.
 */
/** Bucket pubblici dei media artista su Supabase che questa funzione può toccare. */
const BUCKET_SUPABASE = new Set(["artist-images", "artist-audio"]);

/** `{ bucket, path }` di un URL pubblico Supabase di questo progetto, o null. */
function oggettoSupabase(url: string): { bucket: string; path: string } | null {
  if (!isSupabasePublicUrl(url)) return null;
  const m = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(url.split("?")[0]);
  if (!m || !BUCKET_SUPABASE.has(m[1])) return null;
  try {
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

export async function rimuoviFileSeNonUsato(admin: AdminClient, file: FileDaPulire): Promise<void> {
  // Solo la NOSTRA pull zone Bunny o i bucket media del NOSTRO Supabase: URL
  // esterni non si toccano.
  if (!file.artistId) return;
  const supa = isBunnyStorageUrl(file.url) ? null : oggettoSupabase(file.url);
  if (!supa && !isBunnyStorageUrl(file.url)) return;

  let key = supa ? supa.path : file.storageKey?.trim() || null;
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

    // Anche l'avatar dell'account può puntare allo stesso file.
    let avatar: string | null = null;
    if (profilo.user_id) {
      const { data: acc, error: accErr } = await admin
        .from("profiles")
        .select("avatar_url")
        .eq("id", profilo.user_id)
        .maybeSingle();
      if (accErr) {
        logger.warn(file.contesto, "avatar non leggibile: file NON cancellato", { error: accErr.message });
        return;
      }
      avatar = acc?.avatar_url ?? null;
    }

    const inUso = JSON.stringify([avatar, ...profili.data.map((p) => [p.gallery, p.cover_image, p.audio_files])]);
    const varianti = [file.url, key, encodeURI(key)];
    if (varianti.some((v) => inUso.includes(v))) {
      logger.debug(file.contesto, "file ancora usato: non cancellato");
      return;
    }

    if (supa) {
      const { error: rmErr } = await admin.storage.from(supa.bucket).remove([supa.path]);
      if (rmErr) throw new Error(rmErr.message);
      logger.debug(file.contesto, "file rimosso da Supabase Storage");
      return;
    }
    const esito = await deleteObject(key);
    logger.debug(file.contesto, "file rimosso da Bunny", { esito });
  } catch (e) {
    logger.error(file.contesto, "rimozione del file fallita", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
