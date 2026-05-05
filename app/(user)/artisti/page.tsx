import { createAdminClient } from "@/lib/supabase/server";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { ArtistCard } from "@/components/marketing/ArtistCard";

export const metadata = { title: "Artisti — N'arte" };

export default async function ArtistiPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("artists")
    .select("id, slug, stage_name, city, genre, cover_image")
    .eq("status", "approved")
    .order("stage_name", { ascending: true });

  const artists = data ?? [];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-32 pb-16 md:pt-44 md:pb-20">
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
              Clicca su un nome per scoprire bio, calendario e inviare una richiesta.
            </p>
          </Reveal>
        </div>
      </section>

      {/* GRID */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container-narte">
          {artists.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nessun artista ancora pubblicato.
            </p>
          ) : (
            <StaggerList className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {artists.map((a) => (
                <ArtistCard
                  key={a.id}
                  slug={a.slug}
                  stageName={a.stage_name}
                  city={a.city}
                  coverImage={a.cover_image}
                  genres={a.genre}
                />
              ))}
            </StaggerList>
          )}
        </div>
      </section>
    </>
  );
}
