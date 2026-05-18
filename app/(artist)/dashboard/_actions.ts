"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type AudioTrack = { url: string; title: string };

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

  const admin = createAdminClient();
  const { error } = await admin
    .from("artists")
    .update(update)
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
