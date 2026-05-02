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
    <div className="container-narte py-16">
      <Reveal>
        <p className="accent-label">roster</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-5xl md:text-7xl">Gli artisti</h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-4 max-w-xl text-base text-foreground/80">
          Sfoglia il roster di artisti emergenti N&apos;arte disponibili per booking. Clicca su un
          nome per scoprire la bio, il calendario e inviare una richiesta.
        </p>
      </Reveal>

      <div className="mt-12">
        {artists.length === 0 ? (
          <p className="text-muted-foreground">Nessun artista ancora pubblicato.</p>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <ArtistCard
                key={a.id}
                slug={a.slug}
                stageName={a.stage_name}
                city={a.city}
                coverImage={a.cover_image}
              />
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
