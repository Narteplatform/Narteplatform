import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArtistCard, type ArtistCardProps } from "./ArtistCard";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { createAdminClient } from "@/lib/supabase/server";

async function getStars(limit = 8): Promise<ArtistCardProps[]> {
  try {
    // Admin client server-side: bypassa RLS (lettura di dati pubblici approved).
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("artists")
      .select("slug, stage_name, city, cover_image, genre")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((a) => ({
      slug: a.slug,
      stageName: a.stage_name,
      city: a.city,
      coverImage: a.cover_image,
      genres: a.genre,
    }));
  } catch {
    return [];
  }
}

export async function StarsSection() {
  const artists = await getStars();

  return (
    <section className="bg-muted py-20 text-foreground md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">gli artisti</p>
        </Reveal>
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl text-4xl md:text-6xl">
              Scegli l&apos;artista per le tue esigenze
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <Button asChild variant="accent" size="md">
              <Link href="/artisti">Vedi tutti gli artisti</Link>
            </Button>
          </Reveal>
        </div>

        {artists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Stiamo aggiornando il roster. Torna a trovarci a breve.
          </p>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <ArtistCard key={a.slug} {...a} />
            ))}
          </StaggerList>
        )}
      </div>
    </section>
  );
}
