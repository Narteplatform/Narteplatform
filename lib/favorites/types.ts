import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Un artista salvato nei preferiti.
 *
 * ⚠️  `id` è OPZIONALE, e deve restare tale: le voci già presenti nel
 *     localStorage degli utenti sono state scritte quando i preferiti vivevano
 *     solo nel browser e quel campo non esisteva. Renderlo obbligatorio non
 *     produrrebbe un errore di compilazione utile, produrrebbe `undefined` a
 *     runtime sulle liste esistenti.
 *
 *     È anche il motivo per cui la migrazione verso il database risolve per
 *     SLUG e non per id (vedi importLocalFavorites in app/_actions/favorites.ts).
 */
export type FavoriteArtist = {
  slug: string;
  stage_name: string;
  cover_image: string | null;
  city: string | null;
  id?: string;
  tier?: ArtistTier | null;
};
