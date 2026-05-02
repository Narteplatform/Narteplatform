import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Music, Facebook, Youtube } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { BookingCalendar } from "@/components/marketing/BookingCalendar";

type SocialLinks = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  spotify?: string | null;
  website?: string | null;
};

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select(
      "id, slug, stage_name, bio, genre, instruments, city, cover_image, gallery, videos, social_links, status"
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (!artist) notFound();

  const { data: availability } = await supabase
    .from("artist_availability")
    .select("date, status")
    .eq("artist_id", artist.id);

  const busyDates = (availability ?? [])
    .filter((a) => a.status === "busy")
    .map((a) => a.date);

  const social = (artist.social_links ?? {}) as SocialLinks;
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
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm uppercase tracking-wide">
              <span>{artist.city ?? "—"}</span>
              <span aria-hidden>·</span>
              <ul className="flex flex-wrap gap-1">
                {artist.genre.map((g) => (
                  <li
                    key={g}
                    className="rounded-full border border-foreground/30 bg-muted px-2 py-0.5 text-xs lowercase"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
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

          {(social.instagram || social.facebook || social.tiktok || social.youtube || social.spotify || social.website) && (
            <Reveal delay={0.45}>
              <ul className="mt-6 flex flex-wrap gap-3 text-sm">
                {social.instagram && (
                  <li>
                    <a
                      href={social.instagram.startsWith("http") ? social.instagram : `https://instagram.com/${social.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 hover:border-foreground"
                    >
                      <Instagram className="size-4" /> Instagram
                    </a>
                  </li>
                )}
                {social.facebook && (
                  <li>
                    <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 hover:border-foreground">
                      <Facebook className="size-4" /> Facebook
                    </a>
                  </li>
                )}
                {social.tiktok && (
                  <li>
                    <a
                      href={social.tiktok.startsWith("http") ? social.tiktok : `https://tiktok.com/@${social.tiktok.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 hover:border-foreground"
                    >
                      <Music className="size-4" /> TikTok
                    </a>
                  </li>
                )}
                {social.youtube && (
                  <li>
                    <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 hover:border-foreground">
                      <Youtube className="size-4" /> YouTube
                    </a>
                  </li>
                )}
                {social.spotify && (
                  <li>
                    <a href={social.spotify} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 hover:border-foreground">
                      <Music className="size-4" /> Spotify
                    </a>
                  </li>
                )}
                {social.website && (
                  <li>
                    <a href={social.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 hover:border-foreground">
                      <Globe className="size-4" /> Sito
                    </a>
                  </li>
                )}
              </ul>
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
                      <a href={v} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                        ▶︎ {v}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </div>

        <div className="space-y-10 md:sticky md:top-8 md:self-start">
          <Reveal>
            <section className="border border-border p-6">
              <h2 className="font-display text-2xl uppercase">Calendario disponibilità</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Clicca un giorno libero per richiedere {artist.stage_name} per il tuo evento.
              </p>
              <div className="mt-4">
                <BookingCalendar
                  artistId={artist.id}
                  artistName={artist.stage_name}
                  busyDates={busyDates}
                />
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-xs text-muted-foreground">
              <Link href="/artisti" className="underline-offset-2 hover:underline">← Torna a tutti gli artisti</Link>
            </p>
          </Reveal>
        </div>
      </div>
    </article>
  );
}
