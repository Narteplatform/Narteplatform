import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { FavoriteArtist } from "@/lib/favorites/types";
import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Letture dei preferiti lato server.
 *
 * Sono letture, non mutazioni: usano l'admin client. Le SCRITTURE stanno in
 * app/_actions/favorites.ts e usano il client utente, perché su
 * `artist_favorites` le policy RLS sono l'enforcement reale (vedi 0047).
 */

type FavoriteRow = {
  artist_id: string;
  created_at: string;
  artists: {
    slug: string;
    stage_name: string;
    cover_image: string | null;
    city: string | null;
    tier: ArtistTier | null;
    is_public: boolean;
  } | null;
};

/** I preferiti dell'utente, dal più recente. Array vuoto se non ne ha. */
export async function getFavoritesForUser(userId: string): Promise<FavoriteArtist[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artist_favorites")
    .select(
      "artist_id, created_at, artists!inner(slug, stage_name, cover_image, city, tier, is_public)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // ⚠️  L'errore si gestisce e si ferma qui. Un `?? []` a valle di una query
  //     fallita direbbe "questo utente non ha preferiti", e il provider
  //     partirebbe con una lista vuota: i cuori si spegnerebbero tutti e il
  //     primo click li riscriverebbe da capo.
  if (error) {
    console.error("[favorites] getFavoritesForUser", error);
    return [];
  }

  return ((data ?? []) as unknown as FavoriteRow[])
    // Un profilo sospeso o non più approvato resta salvato nel database — non
    // si cancella mai il preferito di qualcuno — ma sparisce dal menu: il link
    // porterebbe a un 404.
    .filter((r) => r.artists?.is_public)
    .map((r) => ({
      id: r.artist_id,
      slug: r.artists!.slug,
      stage_name: r.artists!.stage_name,
      cover_image: r.artists!.cover_image,
      city: r.artists!.city,
      tier: r.artists!.tier,
    }));
}

/**
 * Quanti utenti REGISTRATI hanno salvato questo artista.
 *
 * I salvataggi degli ospiti vivono nel loro browser e non sono contabili: la
 * pagina statistiche deve dirlo, non lasciarlo intuire.
 */
export async function countFavoritesForArtist(artistId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("artist_favorites")
    .select("artist_id", { count: "exact", head: true })
    .eq("artist_id", artistId);

  if (error) {
    console.error("[favorites] countFavoritesForArtist", error);
    return 0;
  }
  return count ?? 0;
}
