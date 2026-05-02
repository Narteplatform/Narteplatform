import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { StaggerList, Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Artisti — N'arte" };

export default async function ArtistiPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, slug, stage_name, city, genre, cover_image, bio")
    .eq("status", "approved")
    .order("stage_name", { ascending: true });

  const artists = data ?? [];

  return (
    <div className="container-narte py-16">
      <Reveal>
        <p className="accent-label">roster</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-5xl md:text-7xl">Artisti</h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-4 max-w-xl text-base text-foreground/80">
          Sfoglia il roster di artisti emergenti disponibili per booking. Clicca per vedere
          disponibilità e mandare una richiesta.
        </p>
      </Reveal>

      <div className="mt-12">
        {artists.length === 0 ? (
          <p className="text-muted-foreground">Nessun artista ancora pubblicato.</p>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <Link key={a.id} href={`/artisti/${a.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  {a.cover_image ? (
                    <img
                      src={a.cover_image}
                      alt={a.stage_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-3xl text-muted-foreground">
                      {a.stage_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg uppercase">{a.stage_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {a.city ?? "—"} · {a.genre.slice(0, 2).join(", ")}
                </p>
              </Link>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
