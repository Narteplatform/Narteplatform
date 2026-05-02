"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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
