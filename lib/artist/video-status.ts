import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getStreamVideo, isFailed, isPlayable } from "@/lib/storage/bunny/stream";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";

type ArtistVideoUpdate = Database["public"]["Tables"]["artist_videos"]["Update"];

/** Colonne restituite al client. Un posto solo, così i chiamanti non divergono. */
export const ARTIST_VIDEO_SELECT =
  "id, artist_id, url, storage_path, title, duration_ms, size_bytes, mime_type, created_at, provider, bunny_guid, bunny_status, playback_state, upload_state, width, height, bunny_error, ready_at";

export type ReconcilableVideo = {
  id: string;
  bunny_guid: string | null;
  playback_state: string;
  ready_at?: string | null;
};

/**
 * Allinea una riga allo stato AUTOREVOLE del video su Bunny.
 *
 * Non si fida del payload che ha innescato la chiamata — stesso principio del
 * webhook Stripe, che rilegge lo stato invece di applicare quello ricevuto: i
 * webhook possono arrivare fuori ordine, duplicati, o non arrivare affatto.
 *
 * ⚠️ `playback_state` NON rispecchia lo stato grezzo di Bunny, ed è la trappola
 * principale di tutta l'integrazione:
 *   - lo stato 4 (una risoluzione pronta) arriva PRIMA del 3 (encoding
 *     completo): sono equivalenti, il video si guarda già;
 *   - gli stati 9 e 10 (sottotitoli e titolo generati automaticamente) arrivano
 *     DOPO il 3. Se il profilo pubblico filtrasse sullo stato grezzo, l'arrivo
 *     di un 9 farebbe sparire dalla pagina un video perfettamente funzionante.
 * Per questo `playback_state` avanza verso `ready` e non torna mai indietro,
 * mentre `bunny_status` conserva l'ultimo valore ricevuto solo per diagnostica.
 *
 * `duration_ms`, `width`, `height` e `size_bytes` arrivano da Bunny e non dal
 * browser: dopo la transcodifica i valori misurati sul file originale sono
 * semplicemente sbagliati.
 */
export async function reconcileBunnyVideo(row: ReconcilableVideo) {
  if (!row.bunny_guid) return null;
  const admin = createAdminClient();

  const remote = await getStreamVideo(row.bunny_guid).catch((e) => {
    logger.warn("bunny/video-status", "getStreamVideo fallita", e);
    return undefined;
  });
  if (remote === undefined) return null;

  const patch: ArtistVideoUpdate = {};

  if (remote === null) {
    // Il video non esiste più su Bunny. Senza questo la riga resterebbe "in
    // elaborazione" per sempre, in attesa di un webhook che non arriverà mai.
    if (row.playback_state !== "ready") {
      patch.playback_state = "failed";
      patch.bunny_error = "Il video non è più disponibile su Bunny.";
    }
  } else {
    patch.bunny_status = remote.status;
    if (isPlayable(remote.status)) {
      patch.playback_state = "ready";
      if (!row.ready_at) patch.ready_at = new Date().toISOString();
      if (remote.length) patch.duration_ms = Math.round(remote.length * 1000);
      if (remote.width) patch.width = remote.width;
      if (remote.height) patch.height = remote.height;
      if (remote.storageSize) patch.size_bytes = remote.storageSize;
    } else if (isFailed(remote.status)) {
      patch.playback_state = "failed";
      patch.bunny_error = "La conversione del video non è riuscita.";
    }
  }

  if (Object.keys(patch).length === 0) return null;

  // La garanzia di monotonia: solo un passaggio A `ready` può toccare una riga
  // già `ready`. Tutto il resto la lascia com'è, qualunque cosa arrivi dopo.
  const base = admin.from("artist_videos").update(patch).eq("id", row.id);
  const { data, error } = await (patch.playback_state === "ready"
    ? base
    : base.neq("playback_state", "ready")
  )
    .select(ARTIST_VIDEO_SELECT)
    .maybeSingle();

  if (error) {
    logger.warn("bunny/video-status", "update stato video fallito", error);
    return null;
  }
  return data;
}

/**
 * Trova la riga di un video Bunny a partire dal suo GUID.
 * `null` se non esiste: una riga cancellata nel frattempo non è un errore.
 */
export async function findVideoByGuid(guid: string): Promise<
  (ReconcilableVideo & { artist_id: string }) | null
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artist_videos")
    .select("id, artist_id, bunny_guid, playback_state, ready_at")
    .eq("bunny_guid", guid)
    .maybeSingle();
  if (error) {
    logger.error("bunny/video-status", "lookup per guid fallito", error);
    return null;
  }
  return data;
}
