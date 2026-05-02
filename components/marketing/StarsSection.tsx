import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArtistCard, type ArtistCardProps } from "./ArtistCard";
import { StaggerList } from "@/components/animations/Reveal";
import { createAdminClient } from "@/lib/supabase/server";

async function getStars(limit = 8): Promise<ArtistCardProps[]> {
  try {
    // Admin client server-side: bypassa RLS (lettura di dati pubblici approved).
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("artists")
      .select("slug, stage_name, city, cover_image")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((a) => ({
      slug: a.slug,
      stageName: a.stage_name,
      city: a.city,
      coverImage: a.cover_image,
    }));
  } catch {
    return [];
  }
}

export async function StarsSection() {
  const artists = await getStars();

  return (
    <section className="bg-foreground py-16 text-background md:py-24">
      <div className="container-narte">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className="display-xl text-5xl md:text-7xl">Gli artisti</h2>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <p className="max-w-xs text-sm uppercase tracking-wide text-background/70 md:text-right">
              Più di 100 artisti emergenti sul nostro palco
            </p>
            <Button asChild variant="accent" size="md">
              <Link href="/artisti">Vedi tutti gli artisti</Link>
            </Button>
          </div>
        </div>

        {artists.length === 0 ? (
          <p className="text-sm text-background/60">
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
