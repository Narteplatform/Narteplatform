import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { MediaSubmissionNotice } from "@/components/dashboard/profile/types";

/**
 * Letture per la coda di moderazione admin e per l'avviso "in attesa" lato
 * artista. Nessuna scrittura qui dentro: le approvazioni/i rifiuti passano
 * dalle server action in app/(admin)/admin/moderazione/_actions.ts, che sono
 * le uniche autorizzate a chiamare le RPC `security definer` della 0052.
 */

export type ModerationArtistRef = {
  id: string;
  stage_name: string;
  slug: string;
  cover_image: string | null;
};

export type ModerationSubmissionItem = {
  kind: "submission";
  id: string;
  target: "gallery" | "audio_files" | "cover_image";
  media_kind: "image" | "audio";
  url: string;
  title: string | null;
  created_at: string;
};

export type ModerationVideoItem = {
  kind: "video";
  id: string;
  url: string | null;
  storage_path: string | null;
  title: string | null;
  provider: string;
  bunny_guid: string | null;
  /** Stato della conversione Bunny: serve a sapere se il player può partire. */
  playback_state: string | null;
  created_at: string;
};

export type ModerationItem = ModerationSubmissionItem | ModerationVideoItem;

export type ModerationArtistGroup = {
  artist: ModerationArtistRef;
  items: ModerationItem[];
  /** Data del contenuto più vecchio del gruppo: governa l'ordinamento. */
  oldestCreatedAt: string;
};

export type ModerationQueue = {
  groups: ModerationArtistGroup[];
  totalCount: number;
  /**
   * Un messaggio per ogni sorgente che ha fallito la lettura. Se questo array
   * non è vuoto, la coda sottostante può essere incompleta: NON va letta come
   * "non c'è niente da approvare".
   */
  errors: string[];
};

type SubmissionRow = {
  id: string;
  artist_id: string;
  target: "gallery" | "audio_files" | "cover_image";
  media_kind: "image" | "audio";
  url: string;
  title: string | null;
  created_at: string;
  artists: ModerationArtistRef | null;
};

type VideoRow = {
  id: string;
  artist_id: string;
  url: string | null;
  storage_path: string | null;
  title: string | null;
  provider: string;
  bunny_guid: string | null;
  /** Stato della conversione Bunny: serve a sapere se il player può partire. */
  playback_state: string | null;
  created_at: string;
  artists: ModerationArtistRef | null;
};

function fallbackArtist(artistId: string): ModerationArtistRef {
  // Il join non ha risolto l'artista (letture di sola lettura non dovrebbero
  // mai trovarsi in questo caso, ma un record orfano non deve far sparire il
  // contenuto dalla coda: meglio un gruppo con dati minimi che uno perso).
  return { id: artistId, stage_name: "Artista sconosciuto", slug: "", cover_image: null };
}

/**
 * Coda raggruppata per artista, ordinata per data del contenuto più vecchio:
 * chi aspetta da più tempo va servito prima.
 */
export async function getModerationQueue(): Promise<ModerationQueue> {
  const admin = createAdminClient();
  const errors: string[] = [];

  const [subsRes, videosRes] = await Promise.all([
    admin
      .from("artist_media_submissions")
      .select(
        "id, artist_id, target, media_kind, url, title, created_at, artists(id, stage_name, slug, cover_image)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("artist_videos")
      .select(
        "id, artist_id, url, storage_path, title, provider, bunny_guid, playback_state, created_at, artists(id, stage_name, slug, cover_image)"
      )
      .eq("moderation_state", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (subsRes.error) {
    logger.error("[media/moderation-queries] lettura submissions fallita", {
      error: subsRes.error.message,
    });
    errors.push(
      `Impossibile leggere foto/audio in attesa (${subsRes.error.message}). La lista potrebbe essere incompleta.`
    );
  }
  if (videosRes.error) {
    logger.error("[media/moderation-queries] lettura video fallita", {
      error: videosRes.error.message,
    });
    errors.push(
      `Impossibile leggere i video in attesa (${videosRes.error.message}). La lista potrebbe essere incompleta.`
    );
  }

  const subs = (subsRes.data ?? []) as unknown as SubmissionRow[];
  const videos = (videosRes.data ?? []) as unknown as VideoRow[];

  const groupsByArtistId = new Map<string, ModerationArtistGroup>();

  function addItem(artistId: string, artistRef: ModerationArtistRef | null, item: ModerationItem) {
    const ref = artistRef ?? fallbackArtist(artistId);
    let group = groupsByArtistId.get(artistId);
    if (!group) {
      group = { artist: ref, items: [], oldestCreatedAt: item.created_at };
      groupsByArtistId.set(artistId, group);
    }
    group.items.push(item);
    if (item.created_at < group.oldestCreatedAt) group.oldestCreatedAt = item.created_at;
  }

  for (const s of subs) {
    addItem(s.artist_id, s.artists, {
      kind: "submission",
      id: s.id,
      target: s.target,
      media_kind: s.media_kind,
      url: s.url,
      title: s.title,
      created_at: s.created_at,
    });
  }
  for (const v of videos) {
    addItem(v.artist_id, v.artists, {
      kind: "video",
      id: v.id,
      url: v.url,
      storage_path: v.storage_path,
      title: v.title,
      provider: v.provider,
      bunny_guid: v.bunny_guid,
      playback_state: v.playback_state,
      created_at: v.created_at,
    });
  }

  const groups = Array.from(groupsByArtistId.values());
  for (const g of groups) {
    g.items.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  groups.sort((a, b) => a.oldestCreatedAt.localeCompare(b.oldestCreatedAt));

  return { groups, totalCount: subs.length + videos.length, errors };
}

/**
 * Conteggio rapido per il badge di navigazione. Best-effort: un errore qui
 * non deve rompere la sidebar, resta solo un log.
 */
export async function getModerationPendingCount(): Promise<number> {
  const admin = createAdminClient();
  const [subs, videos] = await Promise.all([
    admin
      .from("artist_media_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("artist_videos")
      .select("id", { count: "exact", head: true })
      .eq("moderation_state", "pending"),
  ]);
  if (subs.error) {
    logger.warn("[media/moderation-queries] conteggio submissions fallito", {
      error: subs.error.message,
    });
  }
  if (videos.error) {
    logger.warn("[media/moderation-queries] conteggio video fallito", {
      error: videos.error.message,
    });
  }
  return (subs.count ?? 0) + (videos.count ?? 0);
}

/** Submission pending/rifiutate di un artista, raggruppate per destinazione. */
export type ArtistMediaNotices = {
  gallery: MediaSubmissionNotice[];
  audio_files: MediaSubmissionNotice[];
  cover_image: MediaSubmissionNotice[];
};

const EMPTY_NOTICES: ArtistMediaNotices = { gallery: [], audio_files: [], cover_image: [] };

/**
 * Da mostrare nella dashboard artista: cosa è in attesa e cosa è stato
 * rifiutato (con motivazione), per non far pensare che un caricamento sia
 * semplicemente sparito nel nulla.
 */
export async function getArtistMediaNotices(artistId: string): Promise<ArtistMediaNotices> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artist_media_submissions")
    .select("id, target, title, url, status, review_note, created_at")
    .eq("artist_id", artistId)
    .in("status", ["pending", "rejected"])
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("[media/moderation-queries] lettura notifiche artista fallita", {
      artistId,
      error: error.message,
    });
    return EMPTY_NOTICES;
  }

  const rows: MediaSubmissionNotice[] = (data ?? []).map((r) => ({
    id: r.id,
    target: r.target,
    title: r.title,
    url: r.url,
    status: r.status as "pending" | "rejected",
    review_note: r.review_note,
    created_at: r.created_at,
  }));

  return {
    gallery: rows.filter((r) => r.target === "gallery"),
    audio_files: rows.filter((r) => r.target === "audio_files"),
    cover_image: rows.filter((r) => r.target === "cover_image"),
  };
}
