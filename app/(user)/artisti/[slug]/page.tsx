import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Music, Facebook, Youtube, MapPin, MessageCircle, Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { openChatAndRedirect } from "@/lib/chat/open";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Reveal } from "@/components/animations/Reveal";
import { BookingCalendar, type ViewerRole, type ConfirmedBookingInfo } from "@/components/marketing/BookingCalendar";
import { PriceBandBadge } from "@/components/marketing/PriceBandBadge";
import { FavoriteToggle } from "@/components/marketing/FavoriteToggle";
import type { PriceBand } from "@/lib/supabase/types";

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

  const viewer = await getCurrentUser();
  const isGuest = !viewer;

  if (isGuest) {
    // Fetch minimo: solo cover blurrata + genere/categoria
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      notFound();
    }
    const { data: locked } = await admin
      .from("artists")
      .select("stage_name, cover_image, genre, instruments")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();
    if (!locked) notFound();
    return (
      <article className="min-h-[80vh]">
        <section className="relative overflow-hidden border-b border-border pt-24 pb-12 md:pt-32 md:pb-16">
          <div
            aria-hidden="true"
            className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
          />
          <div className="container-narte relative z-10 grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center md:gap-10 lg:gap-14">
            {/* Cover bloccata */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-muted">
              {locked.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={locked.cover_image}
                  alt="Artista bloccato"
                  className="h-full w-full scale-110 object-cover blur-2xl"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-6xl uppercase text-foreground/30">
                  ?
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="inline-flex size-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                  <Lock className="size-9 text-white" />
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col">
              <p className="accent-label mb-3">contenuto riservato</p>
              <h1 className="display-xl text-4xl md:text-5xl lg:text-6xl">
                Accedi per scoprire questo artista
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
                Nome, biografia, gallery, calendario e tutti i dettagli sono visibili solo agli
                utenti iscritti a N&apos;arte. Iscriviti o accedi per sbloccare l&apos;intero roster.
              </p>

              {(locked.genre?.length ?? 0) > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Generi
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(locked.genre ?? []).slice(0, 5).map((g: string) => (
                      <li
                        key={g}
                        className="rounded-full border border-border bg-muted px-3 py-1 text-xs lowercase tracking-wide"
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(locked.instruments?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Categoria
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(locked.instruments ?? []).slice(0, 4).map((i: string) => (
                      <li
                        key={i}
                        className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent"
                      >
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <Link href={`/register?next=/artisti/${slug}`}>
                    <UserPlus className="size-4" /> Iscriviti per sbloccare
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/login?next=/artisti/${slug}`}>
                    <LogIn className="size-4" /> Ho già un account
                  </Link>
                </Button>
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                Iscrizione gratuita.{" "}
                <Link href="/artisti" className="underline underline-offset-2 hover:text-foreground">
                  Torna al roster
                </Link>
              </p>
            </div>
          </div>
        </section>
      </article>
    );
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[ArtistDetailPage] createAdminClient failed", e);
    notFound();
  }

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
    audio_files?: { url: string; title: string }[] | null;
    social_links?: SocialLinks | string | null;
    price_band?: PriceBand | null;
  };
  let artistRaw: ArtistRow | null = null;
  try {
    const r = await supabase
      .from("artists")
      .select("*")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();
    if (r.error) console.error("[ArtistDetailPage] artists select error", r.error);
    artistRaw = (r.data as unknown as ArtistRow) ?? null;
  } catch (e) {
    console.error("[ArtistDetailPage] artists select threw", e);
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

  // Viewer role + dati per organizzatore
  const viewerRole: ViewerRole =
    (viewer?.profile?.role as ViewerRole | undefined) ?? "anon";
  let organizerVenues: { id: string; name: string }[] = [];
  if (viewer && (viewerRole === "organizer" || viewerRole === "superadmin")) {
    const { data: org } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", viewer.id)
      .maybeSingle();
    if (org) {
      const { data: vs } = await supabase
        .from("venues")
        .select("id, name")
        .eq("organizer_id", org.id)
        .order("name");
      organizerVenues = vs ?? [];
    }
  }

  // Banner data rossa: confermate
  let confirmedBookings: ConfirmedBookingInfo[] = [];
  try {
    const { data } = await supabase
      .from("booking_requests_public")
      .select(
        "event_date, organizer_name, organizer_avatar, venue_name, venue_city, venue_cover"
      )
      .eq("artist_id", artist.id);
    confirmedBookings = (data ?? []).map((b) => ({
      date: b.event_date,
      organizerName: b.organizer_name,
      organizerAvatar: b.organizer_avatar,
      venueName: b.venue_name,
      venueCity: b.venue_city,
      venueCover: b.venue_cover,
    }));
  } catch (e) {
    console.error("[ArtistDetailPage] confirmed bookings fetch error", e);
  }

  let social: SocialLinks = {};
  try {
    if (typeof artist.social_links === "string") {
      social = JSON.parse(artist.social_links) as SocialLinks;
    } else if (artist.social_links && typeof artist.social_links === "object") {
      social = artist.social_links as SocialLinks;
    }
  } catch {
    social = {};
  }
  const gallery: string[] = Array.isArray(artist.gallery) ? artist.gallery : [];
  const videos: string[] = Array.isArray(artist.videos) ? artist.videos : [];
  const audioTracks: { url: string; title: string }[] = Array.isArray(artist.audio_files)
    ? (artist.audio_files as { url: string; title: string }[]).filter(
        (t) => t && typeof t.url === "string"
      )
    : [];
  const instruments: string[] = Array.isArray(artist.instruments) ? artist.instruments : [];
  const genres: string[] = Array.isArray(artist.genre) ? artist.genre : [];
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
      {/* HERO — cover sx, title + genres + calendar dx */}
      <section className="relative overflow-hidden border-b border-border pt-24 pb-12 md:pt-32 md:pb-16">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-start md:gap-10 lg:gap-14">
          {/* Cover portrait — aspect fisso, sticky su md+ */}
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

          {/* Right column: title + genres + CALENDAR */}
          <div className="flex flex-col">
            <Reveal>
              <p className="accent-label mb-3">artista</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="display-xl text-4xl md:text-5xl lg:text-6xl">
                {artist.stage_name}
              </h1>
            </Reveal>
            {genres.length > 0 && (
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
            )}

            <Reveal delay={0.25}>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">Fascia di prezzo:</span>
                <PriceBandBadge
                  band={artist.price_band ?? "standard"}
                  canSee={viewerRole === "organizer" || viewerRole === "superadmin"}
                />
                <FavoriteToggle
                  artist={{
                    slug: artist.slug,
                    stage_name: artist.stage_name,
                    cover_image: coverImage,
                    city,
                  }}
                  variant="hero"
                  label="Aggiungi ai preferiti"
                />
                {viewerRole === "organizer" && (
                  <form action={openChatAndRedirect} className="inline-flex">
                    <input type="hidden" name="artist_id" value={artist.id} />
                    <input type="hidden" name="base_path" value="/organizzatore/chat" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full border border-azzurro bg-azzurro px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-azzurro-dark transition"
                    >
                      <MessageCircle className="size-3.5" /> Contatta artista
                    </button>
                  </form>
                )}
              </div>
            </Reveal>

            {/* Calendar tab */}
            <Reveal delay={0.3}>
              <div className="mt-8 rounded-2xl border border-border bg-background p-5 md:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="accent-label">calendario</p>
                </div>
                <h2 className="mt-1 font-display text-xl uppercase md:text-2xl">
                  Disponibilità &amp; booking
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clicca un giorno libero per vedere i turni di {artist.stage_name},
                  poi scegli uno slot per inviare la richiesta.
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
                    viewerRole={viewerRole}
                    viewerEmail={viewer?.email ?? null}
                    viewerName={viewer?.profile?.full_name ?? null}
                    organizerVenues={organizerVenues}
                    confirmedBookings={confirmedBookings}
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

      {/* AUDIO */}
      {audioTracks.length > 0 && (
        <section className="border-t border-border bg-background py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">audio</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Ascolta.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mt-8 grid gap-3 md:grid-cols-2">
                {audioTracks.map((t, i) => (
                  <li
                    key={`${t.url}-${i}`}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-muted p-4"
                  >
                    <p className="font-display text-sm uppercase tracking-tight">
                      {t.title || `Traccia ${i + 1}`}
                    </p>
                    <audio controls preload="none" src={t.url} className="w-full" />
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

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
