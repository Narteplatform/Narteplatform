"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type AudioTrack = { url: string; title: string };
type PersonnelMember = { name: string; role: string };

type ProfileUpdate = {
  stage_name: string;
  bio: string | null;
  genre: string[];
  instruments: string[];
  city: string | null;
  cover_image: string | null;
  social_links: Record<string, string>;
  gallery: string[];
  videos: string[];
  audio_files: AudioTrack[];
  percorso_artistico: "cover_artist" | "tribute_band" | "progetto_inedito" | null;
  // Booking information (sezione GigSalad-style)
  price_range?: string | null;
  gig_min_minutes?: number | null;
  gig_max_minutes?: number | null;
  languages?: string[];
  what_to_expect?: string | null;
  about_extended?: string | null;
  personnel?: PersonnelMember[];
  set_list?: string | null;
  influences?: string[];
  setup_requirements?: string | null;
};

async function ownsArtist(artistId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist) return null;

  // Anche superadmin può modificare; altrimenti deve essere il proprietario.
  if (artist.user_id === user.id) return user;
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "superadmin") return user;
  return null;
}

export async function updateArtistProfile(artistId: string, update: ProfileUpdate) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  if (update.genre.length > 3) {
    return { ok: false as const, error: "Massimo 3 generi" };
  }

  const admin = createAdminClient();

  // percorso_artistico solo per tier pro/max — verifica server-side
  let payload: ProfileUpdate = update;
  if (payload.percorso_artistico) {
    const { data: artistRow } = await admin
      .from("artists")
      .select("tier")
      .eq("id", artistId)
      .maybeSingle();
    const tier = (artistRow as { tier?: string } | null)?.tier ?? "free";
    if (tier !== "pro" && tier !== "max") {
      payload = { ...payload, percorso_artistico: null };
    }
  }

  const { error } = await admin
    .from("artists")
    .update(payload)
    .eq("id", artistId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/artisti");
  revalidatePath(`/artisti`);
  revalidatePath("/");
  return { ok: true as const };
}

export async function setAvailability(
  artistId: string,
  date: string,
  status: "available" | "busy"
) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_availability")
    .upsert({ artist_id: artistId, date, status }, { onConflict: "artist_id,date" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function removeAvailability(artistId: string, date: string) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_availability")
    .delete()
    .eq("artist_id", artistId)
    .eq("date", date);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Slot generali (default per ogni giorno)
// =========================================
function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export async function addDefaultSlot(
  artistId: string,
  input: { label?: string | null; start_time: string; end_time: string }
) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (!isValidTime(input.start_time) || !isValidTime(input.end_time))
    return { ok: false as const, error: "Orario non valido" };

  const admin = createAdminClient();
  const { error } = await admin.from("artist_default_slots").insert({
    artist_id: artistId,
    label: input.label?.trim() || null,
    start_time: input.start_time,
    end_time: input.end_time,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteDefaultSlot(artistId: string, slotId: string) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_default_slots")
    .delete()
    .eq("id", slotId)
    .eq("artist_id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Slot specifici per data (override dei default)
// =========================================
export async function addDateSlot(
  artistId: string,
  input: { date: string; label?: string | null; start_time: string; end_time: string }
) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (!isValidTime(input.start_time) || !isValidTime(input.end_time))
    return { ok: false as const, error: "Orario non valido" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return { ok: false as const, error: "Data non valida" };

  const admin = createAdminClient();
  const { error } = await admin.from("artist_date_slots").insert({
    artist_id: artistId,
    date: input.date,
    label: input.label?.trim() || null,
    start_time: input.start_time,
    end_time: input.end_time,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteDateSlot(artistId: string, slotId: string) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_date_slots")
    .delete()
    .eq("id", slotId)
    .eq("artist_id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Video artista (artist_videos)
// =========================================
export async function addArtistVideo(input: {
  artist_id: string;
  url: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  title?: string;
}) {
  const user = await ownsArtist(input.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artist_videos")
    .insert({
      artist_id: input.artist_id,
      url: input.url,
      storage_path: input.storage_path,
      size_bytes: input.size_bytes,
      mime_type: input.mime_type,
      title: input.title ?? null,
    })
    .select("id, artist_id, url, storage_path, title, size_bytes, mime_type, created_at")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Errore" };
  revalidatePath("/dashboard/profilo-artista/video");
  revalidatePath("/artisti");
  return { ok: true as const, video: data };
}

export async function deleteArtistVideo(videoId: string) {
  const admin = createAdminClient();
  const { data: video } = await admin
    .from("artist_videos")
    .select("id, artist_id, storage_path")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return { ok: false as const, error: "Video non trovato" };
  const user = await ownsArtist(video.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  if (video.storage_path) {
    await admin.storage.from("artist-videos").remove([video.storage_path]);
  }
  const { error } = await admin.from("artist_videos").delete().eq("id", videoId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/profilo-artista/video");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Mass editing disponibilità
// =========================================
export async function bulkSetAvailability(input: {
  artist_id: string;
  date_from: string;
  date_to: string;
  status: "available" | "busy";
  slot_ids?: string[];
}) {
  const user = await ownsArtist(input.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const from = new Date(input.date_from);
  const to = new Date(input.date_to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: false as const, error: "Date non valide" };
  }
  if (from.getTime() > to.getTime()) {
    return { ok: false as const, error: "Data 'da' successiva a 'a'" };
  }
  const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (diffDays > 365) {
    return { ok: false as const, error: "Massimo 365 giorni per operazione" };
  }

  const admin = createAdminClient();

  const dates: string[] = [];
  for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    dates.push(iso);
  }

  // Upsert availability per ogni data
  const rows = dates.map((date) => ({
    artist_id: input.artist_id,
    date,
    status: input.status,
  }));
  const { error: upErr } = await admin
    .from("artist_availability")
    .upsert(rows, { onConflict: "artist_id,date" });
  if (upErr) return { ok: false as const, error: upErr.message };

  // Se richiesti slot specifici, copia gli orari dai default come override per data
  if (input.slot_ids && input.slot_ids.length > 0 && input.status === "available") {
    const { data: defaultSlots } = await admin
      .from("artist_default_slots")
      .select("id, label, start_time, end_time")
      .eq("artist_id", input.artist_id)
      .in("id", input.slot_ids);
    if (defaultSlots && defaultSlots.length > 0) {
      const overrides: {
        artist_id: string;
        date: string;
        label: string | null;
        start_time: string;
        end_time: string;
      }[] = [];
      for (const date of dates) {
        for (const slot of defaultSlots) {
          overrides.push({
            artist_id: input.artist_id,
            date,
            label: slot.label,
            start_time: slot.start_time,
            end_time: slot.end_time,
          });
        }
      }
      // Idempotenza: prima rimuovi eventuali override esistenti negli stessi (artist,date)
      // poi inserisci i nuovi. Non blocchiamo se cancellazione fallisce.
      await admin
        .from("artist_date_slots")
        .delete()
        .eq("artist_id", input.artist_id)
        .in("date", dates);
      const { error: insErr } = await admin.from("artist_date_slots").insert(overrides);
      if (insErr) return { ok: false as const, error: insErr.message };
    }
  }

  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const, count: dates.length };
}
