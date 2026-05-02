import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Reveal } from "@/components/animations/Reveal";
import { ArtistAvailability } from "@/components/marketing/ArtistAvailability";
import { ArtistRequestForm } from "@/components/forms/ArtistRequestForm";
import { Button } from "@/components/ui/Button";

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name, bio, genre, city, cover_image, gallery, videos, social_links, base_fee, status")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (!artist) notFound();

  const { data: availability } = await supabase
    .from("artist_availability")
    .select("date, status")
    .eq("artist_id", artist.id);

  const gallery = artist.gallery ?? [];
  const videos = artist.videos ?? [];

  return (
    <article className="container-narte py-12">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <Reveal>
            <p className="accent-label">artista</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl">{artist.stage_name}</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 text-sm uppercase tracking-wide">
              {artist.city ?? "—"} · {artist.genre.join(" / ")}
            </p>
          </Reveal>
          {artist.cover_image && (
            <Reveal delay={0.3}>
              <div className="mt-8 aspect-[4/5] w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artist.cover_image} alt={artist.stage_name} className="h-full w-full object-cover" />
              </div>
            </Reveal>
          )}
          {artist.bio && (
            <Reveal delay={0.4}>
              <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed">{artist.bio}</p>
            </Reveal>
          )}

          {gallery.length > 0 && (
            <Reveal delay={0.5}>
              <section className="mt-10">
                <h2 className="font-display text-xl uppercase">Galleria</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {gallery.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {videos.length > 0 && (
            <Reveal delay={0.55}>
              <section className="mt-10">
                <h2 className="font-display text-xl uppercase">Video</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {videos.map((v) => (
                    <li key={v}>
                      <a
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline"
                      >
                        ▶︎ {v}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </div>

        <div className="space-y-10">
          <Reveal>
            <section>
              <h2 className="font-display text-2xl uppercase">Disponibilità</h2>
              <ArtistAvailability availability={availability ?? []} />
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section className="border border-border p-6">
              <h2 className="font-display text-2xl uppercase">Richiedi un booking</h2>
              {user ? (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Compila il modulo: l&apos;artista riceverà i dettagli via email.
                  </p>
                  <div className="mt-4">
                    <ArtistRequestForm
                      artistId={artist.id}
                      defaultEmail={user.email ?? ""}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Per inviare una richiesta devi avere un account.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button asChild>
                      <Link href={`/login?next=/artisti/${artist.slug}`}>Accedi</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/register">Registrati</Link>
                    </Button>
                  </div>
                </>
              )}
            </section>
          </Reveal>
        </div>
      </div>
    </article>
  );
}
