import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Music, Facebook, Youtube, MapPin } from "lucide-react";
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

  // Select base + tentativo colonne extra che potrebbero non esistere su prod
  type ArtistRow = {
    id: string;
    slug: string;
    stage_name: string;
    status: string;
    bio?: string | null;
    genre?: string[] | null;
    instruments?: string[] | null;
    city?: string | null;
    cover_image?: string | null;
    gallery?: string[] | null;
    videos?: string[] | null;
    social_links?: SocialLinks | null;
  };
  let artistRaw: ArtistRow | null = null;
  {
    const full = await supabase
      .from("artists")
      .select(
        "id, slug, stage_name, bio, genre, instruments, city, cover_image, gallery, videos, social_links, status"
      )
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();
    if (full.error) {
      console.error("[ArtistDetailPage] artists full select error", full.error);
      const minimal = await supabase
        .from("artists")
        .select("id, slug, stage_name, bio, genre, city, cover_image, status")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (minimal.error) {
        console.error("[ArtistDetailPage] artists minimal select error", minimal.error);
      }
      artistRaw = (minimal.data as unknown as ArtistRow) ?? null;
    } else {
      artistRaw = (full.data as unknown as ArtistRow) ?? null;
    }
  }
  if (!artistRaw) notFound();
  const artist = artistRaw;

  // Slots / availability — tabelle/colonne possono non esistere su prod, gestiamo soft
  type Avail = { date: string; status: string };
  type DefaultSlotRow = { id: string; label: string | null; start_time: string; end_time: string };
  type DateSlotRow = DefaultSlotRow & { date: string };
  let availability: Avail[] | null = [];
  let defaultSlots: DefaultSlotRow[] | null = [];
  let dateSlots: DateSlotRow[] | null = [];
  try {
    const r = await supabase
      .from("artist_availability")
      .select("date, status")
      .eq("artist_id", artist.id);
    if (!r.error) availability = (r.data ?? []) as Avail[];
  } catch (e) {
    console.error("[ArtistDetailPage] availability fetch error", e);
  }
  try {
    const r = await supabase
      .from("artist_default_slots")
      .select("id, label, start_time, end_time")
      .eq("artist_id", artist.id)
      .order("start_time");
    if (!r.error) defaultSlots = (r.data ?? []) as DefaultSlotRow[];
  } catch (e) {
    console.error("[ArtistDetailPage] default_slots fetch error", e);
  }
  try {
    const r = await supabase
      .from("artist_date_slots")
      .select("id, date, label, start_time, end_time")
      .eq("artist_id", artist.id)
      .order("start_time");
    if (!r.error) dateSlots = (r.data ?? []) as DateSlotRow[];
  } catch (e) {
    console.error("[ArtistDetailPage] date_slots fetch error", e);
  }

  const busyDates = (availability ?? [])
    .filter((a) => a.status === "busy")
    .map((a) => a.date);

  const social: SocialLinks = artist.social_links ?? {};
  const gallery = artist.gallery ?? [];
  const videos = artist.videos ?? [];
  const instruments = artist.instruments ?? [];
  const genres = artist.genre ?? [];
  const bio = artist.bio ?? null;
  const coverImage = artist.cover_image ?? null;
  const city = artist.city ?? null;

  const socials: { key: string; href: string; label: string; icon: React.ReactNode }[] = [];
  if (social.instagram)
    socials.push({
      key: "ig",
      href: social.instagram.startsWith("http")
        ? social.instagram
        : `https://instagram.com/${social.instagram.replace(/^@/, "")}`,
      label: "Instagram",
      icon: <Instagram className="size-4" />,
    });
  if (social.facebook)
    socials.push({ key: "fb", href: social.facebook, label: "Facebook", icon: <Facebook className="size-4" /> });
  if (social.tiktok)
    socials.push({
      key: "tt",
      href: social.tiktok.startsWith("http")
        ? social.tiktok
        : `https://tiktok.com/@${social.tiktok.replace(/^@/, "")}`,
      label: "TikTok",
      icon: <Music className="size-4" />,
    });
  if (social.youtube)
    socials.push({ key: "yt", href: social.youtube, label: "YouTube", icon: <Youtube className="size-4" /> });
  if (social.spotify)
    socials.push({ key: "sp", href: social.spotify, label: "Spotify", icon: <Music className="size-4" /> });
  if (social.website)
    socials.push({ key: "web", href: social.website, label: "Sito", icon: <Globe className="size-4" /> });

  return (
    <article>
      {/* HERO — cover left, title + genres + calendar right */}
      <section className="relative overflow-hidden border-b border-border pt-28 pb-12 md:pt-36 md:pb-16">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-start">
          {/* Cover portrait */}
          <Reveal>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-muted md:sticky md:top-28">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt={artist.stage_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-6xl uppercase text-foreground/30">
                  {artist.stage_name.slice(0, 2)}
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {city && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                  <MapPin className="size-3" /> {city}
                </span>
              )}
            </div>
          </Reveal>

          {/* Right column: title + genres + calendar */}
          <div>
            <Reveal>
              <p className="accent-label mb-3">artista</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="display-xl text-5xl md:text-6xl lg:text-7xl">
                {artist.stage_name}
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mt-5 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <li
                    key={g}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs lowercase tracking-wide"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-8 rounded-2xl border border-border bg-background p-5 md:p-6">
                <p className="accent-label mb-3">calendario</p>
                <h2 className="font-display text-xl uppercase md:text-2xl">
                  Disponibilità & booking
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clicca un giorno libero per richiedere {artist.stage_name} per il tuo evento.
                </p>
                <div className="mt-6">
                  <BookingCalendar
                    artistId={artist.id}
                    artistName={artist.stage_name}
                    busyDates={busyDates}
                    defaultSlots={(defaultSlots ?? []).map((s) => ({
                      id: s.id,
                      label: s.label,
                      start_time: s.start_time,
                      end_time: s.end_time,
                    }))}
                    dateSlots={(dateSlots ?? []).map((s) => ({
                      id: s.id,
                      date: s.date,
                      label: s.label,
                      start_time: s.start_time,
                      end_time: s.end_time,
                    }))}
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BIO + SOCIAL */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container-narte grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-10">
            <Reveal>
              <div>
                <p className="accent-label mb-3">bio</p>
                <h2 className="display-xl text-3xl md:text-5xl">Storia & sound.</h2>
                {bio ? (
                  <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                    {bio}
                  </p>
                ) : (
                  <p className="mt-6 text-base text-muted-foreground">
                    Bio in arrivo.
                  </p>
                )}
              </div>
            </Reveal>

            {instruments.length > 0 && (
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
                  <p className="accent-label mb-3">strumenti</p>
                  <h3 className="font-display text-xl uppercase md:text-2xl">Setup live.</h3>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {instruments.map((i) => (
                      <li
                        key={i}
                        className="rounded-full border border-border bg-muted px-3 py-1 text-xs lowercase"
                      >
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>

          {socials.length > 0 && (
            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-border bg-background p-6 md:p-8 lg:sticky lg:top-28 lg:self-start">
                <p className="accent-label mb-3">social</p>
                <h3 className="font-display text-xl uppercase md:text-2xl">Seguilo online.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tutti i canali ufficiali di {artist.stage_name}.
                </p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm transition hover:border-accent hover:text-accent"
                      >
                        <span className="text-accent">{s.icon}</span>
                        <span className="font-medium">{s.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="border-t border-border py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">galleria</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Live & shooting.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* VIDEOS */}
      {videos.length > 0 && (
        <section className="border-t border-border bg-muted py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">video</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Performance.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mt-8 grid gap-3 md:grid-cols-2">
                {videos.map((v) => (
                  <li key={v}>
                    <a
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate rounded-2xl border border-border bg-background p-4 text-sm transition hover:border-accent hover:text-accent"
                    >
                      ▶︎ {v}
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      <div className="container-narte py-10">
        <Link
          href="/artisti"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Torna a tutti gli artisti
        </Link>
      </div>
    </article>
  );
}
