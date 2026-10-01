import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { PageHero } from "@/components/marketing/PageHero";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";
import { ArtistsExplorer, type ExplorerArtist } from "@/components/marketing/ArtistsExplorer";
import { heroImageFor } from "@/lib/content/hero-images";
import type { ArtistTier, PriceBand } from "@/lib/supabase/types";
import { getRatingsForArtists } from "@/lib/feedback/queries";

export const metadata = { title: "Artisti — N'arte" };

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

/**
 * Catalogo per chi non ha una sessione. Legge SOLO le colonne che anche la
 * migration 0070 concede al ruolo anonimo (id, genre, instruments, tier,
 * is_public): niente nome d'arte, slug, città, copertina, prezzi, voti. Quello
 * che non viene letto non può finire nel payload RSC/HTML.
 *
 * Nessun fallback "minimal": se la query fallisce il catalogo ospite è vuoto,
 * e si registra l'errore.
 */
async function loadGuestArtists() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("artists")
    .select("id, genre, instruments, tier")
    .eq("is_public", true)
    // `artist_tier_enum` è dichiarato ('free','pro','max'): `desc` = max → pro → free.
    .order("tier", { ascending: false });
  if (error) {
    logger.error("ArtistiPage", "lettura catalogo ospiti fallita", error);
    return [];
  }
  return (data ?? []).map((a) => ({
    id: a.id,
    genre: (a.genre ?? []) as string[],
    instruments: (a.instruments ?? []) as string[],
    tier: (a.tier ?? "free") as ArtistTier,
  }));
}

export default async function ArtistiPage() {
  const viewer = await getCurrentUser();
  const isGuest = !viewer;
  const canSeePrice =
    viewer?.profile?.role === "organizer" || viewer?.profile?.role === "superadmin";

  let artists: ExplorerArtist[];
  if (isGuest) {
    artists = await loadGuestArtists();
  } else {
    const supabase = createAdminClient();
    let rows: ArtistRow[] = [];
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

    // Voti in un colpo solo: una query per l'intero elenco invece di una per
    // scheda. Se fallisce la mappa resta vuota e le schede semplicemente non
    // mostrano il voto — il catalogo non deve rompersi per questo.
    const ratings = await getRatingsForArtists(rows.map((a) => a.id));

    artists = rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      stage_name: a.stage_name,
      city: a.city,
      cover_image: a.cover_image,
      genre: (a.genre ?? []) as string[],
      instruments: (a.instruments ?? []) as string[],
      price_band: (a.price_band ?? "standard") as PriceBand,
      // `free` e non `"standard"`: quello è un valore di price_band_enum.
      tier: (a.tier ?? "free") as ArtistTier,
      rating: ratings.get(a.id) ?? null,
    }));
  }

  return (
    <>
      <PageHero
        image={heroImageFor("artisti")}
        label="roster"
        title="Gli artisti"
        description={
          isGuest ? (
            <>
              Il roster di artisti emergenti N&apos;arte. Nomi, copertine e contatti sono
              riservati a chi è registrato: l&apos;iscrizione è gratuita.
            </>
          ) : (
            <>
              Sfoglia il roster di artisti emergenti N&apos;arte: filtra per tipologia
              e genere, scopri le copertine e contatta direttamente l&apos;artista.
            </>
          )
        }
      />

      <section className="bg-white py-12 text-notte md:py-16">
        <div className="container-narte">
          {isGuest && (
            <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-notte px-6 py-6 text-palco md:flex-row md:items-center">
              <p className="font-display text-xl md:text-2xl">
                Registrati gratis per scoprire chi sono
              </p>
              <Button asChild variant="accent" size="md">
                <Link href="/register">Registrati gratis</Link>
              </Button>
            </div>
          )}
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
