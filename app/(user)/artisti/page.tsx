import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { PageHero } from "@/components/marketing/PageHero";
import { ArtistsExplorer } from "@/components/marketing/ArtistsExplorer";
import { heroImageFor } from "@/lib/content/hero-images";
import type { ArtistTier, PriceBand } from "@/lib/supabase/types";
import { getRatingsForArtists } from "@/lib/feedback/queries";

export const metadata = { title: "Artisti — N'arte" };

export default async function ArtistiPage() {
  const supabase = createAdminClient();
  type ArtistRow = {
    id: string;
    slug: string;
    stage_name: string;
    city: string | null;
    cover_image: string | null;
    genre: string[] | null;
    instruments?: string[] | null;
    price_band?: PriceBand | null;
    tier?: ArtistTier | null;
  };
  let rows: ArtistRow[] = [];
  {
    // Ranking per piano. `artist_tier_enum` è dichiarato ('free','pro','max') e
    // Postgres ordina gli enum per ordine di dichiarazione: `tier desc` è quindi
    // già max → pro → free, senza bisogno di una colonna di peso.
    // ArtistsExplorer filtra client-side preservando l'ordine dell'array, per
    // cui questo order copre tutto il roster e la ricerca a valle.
    const full = await supabase
      .from("artists")
      .select("id, slug, stage_name, city, genre, instruments, cover_image, price_band, tier")
      .eq("is_public", true)
      .order("tier", { ascending: false })
      .order("stage_name", { ascending: true });
    if (full.error) {
      console.error("[ArtistiPage] full select error", full.error);
      const minimal = await supabase
        .from("artists")
        .select("id, slug, stage_name, city, genre, cover_image")
        .eq("is_public", true)
        .order("stage_name", { ascending: true });
      if (minimal.error) console.error("[ArtistiPage] minimal select error", minimal.error);
      rows = ((minimal.data ?? []) as unknown) as ArtistRow[];
    } else {
      rows = ((full.data ?? []) as unknown) as ArtistRow[];
    }
  }

  const viewer = await getCurrentUser();
  const isGuest = !viewer;
  const canSeePrice =
    viewer?.profile?.role === "organizer" || viewer?.profile?.role === "superadmin";

  // Voti in un colpo solo: una query per l'intero elenco invece di una per
  // scheda. Se fallisce la mappa resta vuota e le schede semplicemente non
  // mostrano il voto — il catalogo non deve rompersi per questo.
  const ratings = await getRatingsForArtists(rows.map((a) => a.id));

  const artists = rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    stage_name: a.stage_name,
    city: a.city,
    cover_image: a.cover_image,
    genre: (a.genre ?? []) as string[],
    instruments: (a.instruments ?? []) as string[],
    price_band: (a.price_band ?? "standard") as PriceBand,
    // `free` e non `"standard"`: quello è un valore di price_band_enum, copiato
    // per errore dalla riga sopra. Nel ramo di fallback qui sotto la select non
    // chiede `tier`, quindi il default arriva davvero a destinazione — e con
    // "standard" nessun artista sarebbe più né TOP né Verificato.
    tier: (a.tier ?? "free") as ArtistTier,
    rating: ratings.get(a.id) ?? null,
  }));

  return (
    <>
      <PageHero
        image={heroImageFor("artisti")}
        label="roster"
        title="Gli artisti"
        description={
          <>
            Sfoglia il roster di artisti emergenti N&apos;arte: filtra per tipologia
            e genere, scopri le copertine e contatta direttamente l&apos;artista.
          </>
        }
      />

      <section className="bg-white py-12 text-notte md:py-16">
        <div className="container-narte">
          {artists.length === 0 ? (
            <p className="text-center text-notte/60">
              Nessun artista ancora pubblicato.
            </p>
          ) : (
            <ArtistsExplorer
              artists={artists}
              canSeePrice={canSeePrice}
              isGuest={isGuest}
            />
          )}
        </div>
      </section>
    </>
  );
}
