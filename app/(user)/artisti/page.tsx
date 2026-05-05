import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { ArtistsExplorer } from "@/components/marketing/ArtistsExplorer";

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
  };
  let rows: ArtistRow[] = [];
  {
    const full = await supabase
      .from("artists")
      .select("id, slug, stage_name, city, genre, instruments, cover_image")
      .eq("status", "approved")
      .order("stage_name", { ascending: true });
    if (full.error) {
      console.error("[ArtistiPage] full select error", full.error);
      const minimal = await supabase
        .from("artists")
        .select("id, slug, stage_name, city, genre, cover_image")
        .eq("status", "approved")
        .order("stage_name", { ascending: true });
      if (minimal.error) console.error("[ArtistiPage] minimal select error", minimal.error);
      rows = ((minimal.data ?? []) as unknown) as ArtistRow[];
    } else {
      rows = ((full.data ?? []) as unknown) as ArtistRow[];
    }
  }

  const artists = rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    stage_name: a.stage_name,
    city: a.city,
    cover_image: a.cover_image,
    genre: (a.genre ?? []) as string[],
    instruments: (a.instruments ?? []) as string[],
  }));

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-24 pb-10 md:pt-32 md:pb-14">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">roster</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">Gli artisti</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Sfoglia il roster di artisti emergenti N&apos;arte disponibili per booking.
              Filtra per tipologia o genere e clicca su un nome per scoprire bio, calendario
              e inviare una richiesta.
            </p>
          </Reveal>
        </div>
      </section>

      {/* GRID + FILTERS */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container-narte">
          {artists.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nessun artista ancora pubblicato.
            </p>
          ) : (
            <ArtistsExplorer artists={artists} />
          )}
        </div>
      </section>
    </>
  );
}
