"use server";

import { revalidatePath } from "next/cache";
import { deleteStreamVideo } from "@/lib/storage/bunny/stream";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { logger } from "@/lib/logger";

type Result = { ok: true } | { ok: false; error: string };
type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Le due RPC di 0052_media_moderation_rpc.sql non sono (ancora) dichiarate in
 * `Database["public"]["Functions"]` di lib/supabase/types.ts, che è fuori
 * perimetro per questo lavoro. Piuttosto che chiamare `.rpc()` con `any`,
 * questa interfaccia locale tipizza SOLO le due funzioni che servono qui: se
 * un giorno vengono aggiunte al tipo condiviso, questo cast diventa
 * ridondante ma resta comunque corretto.
 */
interface MediaModerationRpc {
  rpc(
    fn: "approve_artist_media_submission",
    args: { p_submission_id: string; p_reviewer: string }
  ): PromiseLike<{ error: { message: string } | null }>;
  rpc(
    fn: "reject_artist_media_submission",
    args: { p_submission_id: string; p_reviewer: string; p_note: string }
  ): PromiseLike<{ error: { message: string } | null }>;
}

function moderationRpc(admin: AdminClient): MediaModerationRpc {
  return admin as unknown as MediaModerationRpc;
}

/**
 * Rigenera la pagina pubblica dell'artista dopo una decisione di moderazione.
 * Best-effort: un fallimento qui non deve far credere all'admin che
 * l'approvazione/il rifiuto non sia andato a buon fine — quello è già scritto.
 */
async function revalidateArtist(admin: AdminClient, artistId: string | null | undefined) {
  revalidatePath("/admin/moderazione");
  revalidatePath("/artisti");
  if (!artistId) return;
  try {
    const { data, error } = await admin.from("artists").select("slug").eq("id", artistId).maybeSingle();
    if (error) {
      logger.warn("[admin/moderazione] lettura slug per revalidate fallita", { artistId, error: error.message });
      return;
    }
    if (data?.slug) revalidatePath(`/artisti/${data.slug}`);
  } catch (err) {
    logger.warn("[admin/moderazione] revalidate artista fallita", { artistId, err });
  }
}

export async function approveMediaSubmission(id: string): Promise<Result> {
  const user = await requireAdminPageAccess("moderazione");
  const admin = createAdminClient();

  const { data: submission, error: fetchError } = await admin
    .from("artist_media_submissions")
    .select("id, artist_id, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!submission) return { ok: false, error: "Contenuto non trovato" };
  if (submission.status !== "pending") {
    return { ok: false, error: "Questo contenuto è già stato valutato" };
  }

  const { error } = await moderationRpc(admin).rpc("approve_artist_media_submission", {
    p_submission_id: id,
    p_reviewer: user.id,
  });
  if (error) return { ok: false, error: error.message };

  await revalidateArtist(admin, submission.artist_id);
  return { ok: true };
}

export async function rejectMediaSubmission(id: string, note: string): Promise<Result> {
  const user = await requireAdminPageAccess("moderazione");
  const admin = createAdminClient();

  const { data: submission, error: fetchError } = await admin
    .from("artist_media_submissions")
    .select("id, artist_id, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!submission) return { ok: false, error: "Contenuto non trovato" };
  if (submission.status !== "pending") {
    return { ok: false, error: "Questo contenuto è già stato valutato" };
  }

  const { error } = await moderationRpc(admin).rpc("reject_artist_media_submission", {
    p_submission_id: id,
    p_reviewer: user.id,
    p_note: note ?? "",
  });
  if (error) return { ok: false, error: error.message };

  await revalidateArtist(admin, submission.artist_id);
  return { ok: true };
}

export async function approveArtistVideo(id: string): Promise<Result> {
  const user = await requireAdminPageAccess("moderazione");
  const admin = createAdminClient();

  const { data: video, error: fetchError } = await admin
    .from("artist_videos")
    .select("id, artist_id, moderation_state")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!video) return { ok: false, error: "Video non trovato" };
  if (video.moderation_state !== "pending") {
    return { ok: false, error: "Questo video è già stato valutato" };
  }

  const { error } = await admin
    .from("artist_videos")
    .update({
      moderation_state: "approved",
      moderation_note: null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await revalidateArtist(admin, video.artist_id);
  return { ok: true };
}

export async function rejectArtistVideo(id: string, note: string): Promise<Result> {
  const user = await requireAdminPageAccess("moderazione");
  const admin = createAdminClient();

  const { data: video, error: fetchError } = await admin
    .from("artist_videos")
    .select("id, artist_id, moderation_state, provider, bunny_guid")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!video) return { ok: false, error: "Video non trovato" };
  if (video.moderation_state !== "pending") {
    return { ok: false, error: "Questo video è già stato valutato" };
  }

  const { error } = await admin
    .from("artist_videos")
    .update({
      moderation_state: "rejected",
      moderation_note: note?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Il file esce da Bunny, la riga resta.
  //
  // Un video rifiutato non tornerà mai pubblico, ma su Bunny continuerebbe a
  // occupare storage a pagamento per sempre — e se la conversione non è ancora
  // partita, a consumare anche minuti di encoding per produrre risoluzioni che
  // nessuno guarderà. È credito speso per niente.
  //
  // La riga in `artist_videos` NON viene toccata: restano titolo, data,
  // motivazione e chi ha deciso, così lo storico della moderazione resta
  // leggibile e l'artista continua a vedere il suo "non approvato" con il
  // perché. Sparisce il file, non la memoria di cosa è successo.
  //
  // L'esito non blocca il rifiuto: se Bunny è irraggiungibile la decisione vale
  // lo stesso e il file resterà da ripulire, che è meno grave di una
  // moderazione che si inceppa.
  if (video.provider === "bunny" && video.bunny_guid) {
    try {
      await deleteStreamVideo(video.bunny_guid);
    } catch (e) {
      logger.error("admin/moderazione", "rimozione da Bunny del video rifiutato fallita", {
        videoId: id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await revalidateArtist(admin, video.artist_id);
  return { ok: true };
}

/**
 * Approva in blocco tutto quello che è in coda per UN artista: le submission
 * via RPC (append atomico, una alla volta — niente Promise.all sulla stessa
 * riga `artists`, per non far accodare lock inutili) e i video con un update
 * unico.
 */
export async function approveAllForArtist(artistId: string): Promise<Result> {
  const user = await requireAdminPageAccess("moderazione");
  const admin = createAdminClient();

  const [{ data: submissions, error: subsError }, { data: videos, error: videosError }] = await Promise.all([
    admin
      .from("artist_media_submissions")
      .select("id")
      .eq("artist_id", artistId)
      .eq("status", "pending"),
    admin
      .from("artist_videos")
      .select("id")
      .eq("artist_id", artistId)
      .eq("moderation_state", "pending"),
  ]);
  if (subsError) return { ok: false, error: subsError.message };
  if (videosError) return { ok: false, error: videosError.message };

  const errors: string[] = [];

  for (const s of submissions ?? []) {
    const { error } = await moderationRpc(admin).rpc("approve_artist_media_submission", {
      p_submission_id: s.id,
      p_reviewer: user.id,
    });
    if (error) errors.push(error.message);
  }

  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length > 0) {
    const { error } = await admin
      .from("artist_videos")
      .update({
        moderation_state: "approved",
        moderation_note: null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .in("id", videoIds);
    if (error) errors.push(error.message);
  }

  await revalidateArtist(admin, artistId);

  if (errors.length > 0) {
    return { ok: false, error: `Alcuni elementi non sono stati approvati: ${errors.join("; ")}` };
  }
  return { ok: true };
}
