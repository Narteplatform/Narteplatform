import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Facebook, Youtube, MapPin, MessageCircle, Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ArtistTierBadges } from "@/components/marketing/ArtistBadges";
import { openChatAndRedirect } from "@/lib/chat/open";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Reveal } from "@/components/animations/Reveal";
import { BookingCalendar, type ViewerRole, type ConfirmedBookingInfo } from "@/components/marketing/BookingCalendar";
import { PriceBandBadge } from "@/components/marketing/PriceBandBadge";
import { FavoriteToggle } from "@/components/marketing/FavoriteToggle";
import { BookingInformation } from "@/components/marketing/BookingInformation";
import { TikTokIcon, SpotifyIcon } from "@/components/marketing/SocialIcons";
import { ImageLightbox } from "@/components/marketing/ImageLightbox";
import { ProfileViewBeacon } from "@/components/analytics/ProfileViewBeacon";
import type { ArtistTier, PriceBand } from "@/lib/supabase/types";
import { entitlementsFor } from "@/lib/billing/plans";

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
      .eq("is_public", true)
      .maybeSingle();
    if (!locked) notFound();
    return (
      <article className="min-h-[80vh]">
        {/* Anche la visita di un ospite alla pagina bloccata è una visita al
            profilo — anzi, commercialmente è la più interessante: qualcuno
            cercava questo artista e ha trovato un muro. */}
        <ProfileViewBeacon slug={slug} />
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
                <div className="flex h-full w-full items-center justify-center font-display text-6xl text-foreground/30">
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

  type PersonnelMember = { name: string; role?: string };
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
    tier?: ArtistTier | null;
    price_range?: string | null;
    gig_min_minutes?: number | null;
    gig_max_minutes?: number | null;
    languages?: string[] | null;
    what_to_expect?: string | null;
    about_extended?: string | null;
    personnel?: PersonnelMember[] | string | null;
    set_list?: string | null;
    influences?: string[] | null;
    setup_requirements?: string | null;
  };
  let artistRaw: ArtistRow | null = null;
  try {
    const r = await supabase
      .from("artists")
      .select("*")
      .eq("slug", slug)
      .eq("is_public", true)
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

  // Video caricati dall'artista dal proprio dispositivo (artist_videos), distinti
  // dagli URL YouTube/Vimeo in artists.videos.
  let uploadedVideos: { id: string; url: string; title: string | null }[] = [];
  try {
    const { data } = await supabase
      .from("artist_videos")
      .select("id, url, title")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false });
    uploadedVideos = (data ?? []) as { id: string; url: string; title: string | null }[];
  } catch (e) {
    console.error("[ArtistDetailPage] artist_videos fetch error", e);
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
  // Soft cap di piano: il contenuto oltre il limite non viene mai cancellato,
  // semplicemente non compare sul profilo pubblico. L'artista continua a
  // vederlo nel proprio editor (marcato come non visibile) e un upgrade lo
  // ripristina all'istante. `slice` su un limite Infinity restituisce l'array
  // intero, quindi Pro/Max non sono toccati.
  const ent = entitlementsFor(artist.tier ?? "free");

  const gallery: string[] = (Array.isArray(artist.gallery) ? artist.gallery : []).slice(
    0,
    ent.galleryMax
  );
  // `videos` (URL YouTube/Vimeo) e `uploadedVideos` (file su artist_videos)
  // sono due collezioni distinte ma un'unica feature di piano: vanno cappate
  // insieme, altrimenti un artista Free continuerebbe a mostrare i suoi
  // YouTube dopo il downgrade.
  const videos: string[] = ent.videoMax === 0
    ? []
    : (Array.isArray(artist.videos) ? artist.videos : []).slice(0, ent.videoMax);
  if (ent.videoMax === 0) uploadedVideos = [];
  else uploadedVideos = uploadedVideos.slice(0, ent.videoMax);
  const audioTracks: { url: string; title: string }[] = (
    Array.isArray(artist.audio_files)
      ? (artist.audio_files as { url: string; title: string }[]).filter(
          (t) => t && typeof t.url === "string"
        )
      : []
  ).slice(0, ent.audioMax);
  const genres: string[] = Array.isArray(artist.genre) ? artist.genre : [];
  const bio = artist.bio ?? null;
  const coverImage = artist.cover_image ?? null;
  const city = artist.city ?? null;

  // Booking information (sezione tabs)
  let personnelList: PersonnelMember[] = [];
  try {
    if (Array.isArray(artist.personnel)) {
      // Nuovo formato: array di oggetti { name, role? } — o vecchio array di stringhe
      personnelList = (artist.personnel as (PersonnelMember | string)[]).map((item) => {
        if (item && typeof item === "object" && "name" in item) {
          return item as PersonnelMember;
        }
        if (typeof item === "string") {
          const [name, ...rest] = item.split("—");
          return { name: (name ?? "").trim(), role: rest.join("—").trim() };
        }
        return null;
      }).filter((m): m is PersonnelMember => m !== null && (m.name?.trim().length ?? 0) > 0);
    } else if (typeof artist.personnel === "string" && artist.personnel.trim().length > 0) {
      // Prova prima JSON (vecchio salvataggio come stringa JSON)
      try {
        const parsed = JSON.parse(artist.personnel);
        if (Array.isArray(parsed)) personnelList = parsed as PersonnelMember[];
      } catch {
        // Vecchio formato textarea: "Nome — Ruolo\nNome — Ruolo"
        personnelList = artist.personnel
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, ...rest] = line.split("—");
            return { name: (name ?? "").trim(), role: rest.join("—").trim() };
          })
          .filter((m) => m.name.length > 0);
      }
    }
  } catch {
    personnelList = [];
  }
  const languages: string[] = Array.isArray(artist.languages) ? artist.languages : [];
  const influences: string[] = Array.isArray(artist.influences) ? artist.influences : [];

  const socials: { key: string; href: string; label: string; icon: React.ReactNode }[] = [];
  if (social.instagram)
    socials.push({
      key: "ig",
      href: social.instagram.startsWith("http")
        ? social.instagram
        : `https://instagram.com/${social.instagram.replace(/^@/, "")}`,
      label: "Instagram",
      icon: <Instagram className="size-5" />,
    });
  if (social.facebook)
    socials.push({ key: "fb", href: social.facebook, label: "Facebook", icon: <Facebook className="size-5" /> });
  if (social.tiktok)
    socials.push({
      key: "tt",
      href: social.tiktok.startsWith("http")
        ? social.tiktok
        : `https://tiktok.com/@${social.tiktok.replace(/^@/, "")}`,
      label: "TikTok",
      icon: <TikTokIcon className="size-5" />,
    });
  if (social.youtube)
    socials.push({ key: "yt", href: social.youtube, label: "YouTube", icon: <Youtube className="size-5" /> });
  if (social.spotify)
    socials.push({ key: "sp", href: social.spotify, label: "Spotify", icon: <SpotifyIcon className="size-5" /> });
  if (social.website)
    socials.push({ key: "web", href: social.website, label: "Sito", icon: <Globe className="size-5" /> });

  return (
    <article>
      <ProfileViewBeacon slug={slug} />
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
              {/* Stesse etichette della lista artisti, qui a destra per non
                  collidere con la pillola città. */}
              <ArtistTierBadges
                tier={artist.tier}
                onImage
                className="pointer-events-none absolute right-4 top-4 z-10 max-w-[60%] justify-end"
              />
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
                {viewerRole !== "artist" && (
                  <>
                    <span className="text-muted-foreground">Fascia di prezzo:</span>
                    <PriceBandBadge
                      band={artist.price_band ?? "standard"}
                      canSee={viewerRole === "organizer" || viewerRole === "superadmin"}
                    />
                  </>
                )}
                <FavoriteToggle
                  artist={{
                    id: artist.id,
                    slug: artist.slug,
                    stage_name: artist.stage_name,
                    cover_image: coverImage,
                    city,
                    tier: artist.tier,
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
                <h2 className="mt-1 font-display text-xl md:text-2xl">
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

      {/* #10 — BOOKING INFORMATION: sezione bianca full-width */}
      <section className="w-full bg-white py-16 md:py-24">
        <div className="container-narte">
          <Reveal>
            <p className="accent-label mb-3">booking</p>
            <h2 className="font-display text-3xl text-notte md:text-5xl">
              Informazioni di booking
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-10">
              <BookingInformation
                bio={bio}
                priceRange={artist.price_range ?? null}
                gigMinMinutes={artist.gig_min_minutes ?? null}
                gigMaxMinutes={artist.gig_max_minutes ?? null}
                languages={languages}
                whatToExpect={artist.what_to_expect ?? null}
                aboutExtended={artist.about_extended ?? null}
                personnel={personnelList}
                setList={artist.set_list ?? null}
                influences={influences}
                setupRequirements={artist.setup_requirements ?? null}
              />
            </div>
          </Reveal>
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
                    <p className="font-display text-sm">
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

      {/* #12 — GALLERY con lightbox cliccabile */}
      {gallery.length > 0 && (
        <section className="border-t border-border py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">galleria</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Live &amp; shooting.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <ImageLightbox
                images={gallery}
                className="mt-8"
                gridClassName="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* VIDEOS */}
      {(videos.length > 0 || uploadedVideos.length > 0) && (
        <section className="border-t border-border bg-muted py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">video</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Performance.</h2>
            </Reveal>

            {uploadedVideos.length > 0 && (
              <Reveal delay={0.2}>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {uploadedVideos.map((v) => (
                    <figure
                      key={v.id}
                      className="overflow-hidden rounded-2xl border border-border bg-black"
                    >
                      {/* preload="metadata" è obbligatorio: senza, ogni visita
                          scaricherebbe i video interi. */}
                      <video
                        src={v.url}
                        controls
                        preload="metadata"
                        playsInline
                        className="aspect-video w-full bg-black"
                      />
                      {v.title && (
                        <figcaption className="truncate border-t border-border bg-background px-4 py-2 text-sm">
                          {v.title}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </Reveal>
            )}

            {videos.length > 0 && (
              <Reveal delay={0.25}>
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
            )}
          </div>
        </section>
      )}

      {/* SOCIAL — icone cliccabili in fondo */}
      {socials.length > 0 && (
        <section className="border-t border-border bg-notte py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                social
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-display text-3xl text-white md:text-5xl">Seguimi.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="inline-flex size-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
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
