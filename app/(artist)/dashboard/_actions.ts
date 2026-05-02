"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ProfileUpdate = {
  stage_name: string;
  bio: string | null;
  genre: string[];
  city: string | null;
  cover_image: string | null;
  base_fee: number | null;
  social_links: Record<string, string>;
};

export async function updateArtistProfile(artistId: string, update: ProfileUpdate) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const { error } = await supabase
    .from("artists")
    .update(update)
    .eq("id", artistId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function setAvailability(
  artistId: string,
  date: string,
  status: "available" | "busy"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const { data: owns } = await supabase
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owns) return { ok: false as const, error: "Non sei il proprietario" };

  const { error } = await supabase
    .from("artist_availability")
    .upsert({ artist_id: artistId, date, status }, { onConflict: "artist_id,date" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/calendario");
  return { ok: true as const };
}

export async function removeAvailability(artistId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const { error } = await supabase
    .from("artist_availability")
    .delete()
    .eq("artist_id", artistId)
    .eq("date", date);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/calendario");
  return { ok: true as const };
}
