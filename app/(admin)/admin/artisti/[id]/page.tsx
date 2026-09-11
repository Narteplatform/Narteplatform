import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { BreadcrumbTitle } from "@/components/layout/BreadcrumbTitle";
import {
  ArtistMediaPanel,
  type ArtistMediaItem,
} from "@/components/admin/ArtistMediaPanel";
import type { ArtistTier } from "@/lib/supabase/types";
import { ArtistStatusToggle } from "@/components/admin/ArtistStatusToggle";
import { ArtistEditForm } from "@/components/admin/ArtistEditForm";
import { ArtistTierSelect } from "@/components/admin/ArtistTierSelect";
import { DeleteArtistButton } from "@/components/admin/DeleteArtistButton";
import { CancelBookingDialog } from "@/components/admin/CancelBookingDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SocialLinks = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  spotify?: string | null;
  website?: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approvato",
  pending: "In attesa",
  rejected: "Rifiutato",
};

export default async function AdminArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [
    { data: artist },
    { data: genresData },
    { data: confirmedBookings },
    { data: videoRows },
    { data: submissionRows },
  ] = await Promise.all([
    supabase.from("artists").select("*").eq("id", id).single(),
    supabase.from("genres").select("name").order("order_index"),
    supabase
      .from("booking_requests")
      .select(
        "id, event_date, time_slot, budget_offer, organizers(display_name), venues(name, city)"
      )
      .eq("artist_id", id)
      .eq("status", "confermata")
      .order("event_date", { ascending: true }),
    supabase
      .from("artist_videos")
      .select("id, url, title, provider, bunny_guid, moderation_state, moderation_note, created_at")
      .eq("artist_id", id)
      .order("created_at", { ascending: false }),
    // Foto e tracce ancora in coda: sono proprio quelle che il profilo pubblico
    // non mostra, quindi le uniche che qui servono davvero.
    supabase
      .from("artist_media_submissions")
      .select("id, target, media_kind, url, title, status, review_note, created_at")
      .eq("artist_id", id)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false }),
  ]);
  if (!artist) notFound();

  const social = (artist.social_links ?? {}) as SocialLinks;
  // Cast come il resto del file: `artist` risolve a `never` per la deriva nota
  // dei tipi Supabase (next.config.ts → typescript.ignoreBuildErrors).
  const tierFields = artist as unknown as {
    tier: ArtistTier | null;
    tier_override: ArtistTier | null;
    tier_override_expires_at: string | null;
    tier_override_reason: string | null;
  };
  const genreOptions = (genresData ?? []).map((g) => g.name as string);
  type ConfirmedRow = {
    id: string;
    event_date: string;
    time_slot: string | null;
    budget_offer: number | null;
    organizers: { display_name: string } | null;
    venues: { name: string; city: string | null } | null;
  };
  const bookings = (confirmedBookings ?? []) as unknown as ConfirmedRow[];

  // Tutto ciò che l'artista ha caricato, pubblicato o in attesa, in un elenco
  // solo: la foto profilo, la galleria, le tracce, i video.
  const mediaItems: ArtistMediaItem[] = [
    ...(artist.cover_image
      ? [
          {
            id: "cover",
            kind: "image" as const,
            url: artist.cover_image,
            label: "Foto profilo",
            title: null,
          },
        ]
      : []),
    ...((artist.gallery ?? []) as string[]).map((url, i) => ({
      id: `gallery-${i}`,
      kind: "image" as const,
      url,
      label: "Galleria",
      title: null,
    })),
    ...((Array.isArray(artist.audio_files) ? artist.audio_files : []) as {
      url: string;
      title?: string;
    }[]).map((t, i) => ({
      id: `audio-${i}`,
      kind: "audio" as const,
      url: t.url,
      label: "Audio",
      title: t.title ?? null,
    })),
    ...(videoRows ?? []).map((v) => ({
      id: v.id as string,
      kind: "video" as const,
      url: v.url as string | null,
      bunnyGuid: v.bunny_guid as string | null,
      provider: v.provider as string | null,
      label: "Video",
      title: v.title as string | null,
      moderation:
        v.moderation_state === "pending"
          ? ("pending" as const)
          : v.moderation_state === "rejected"
            ? ("rejected" as const)
            : null,
      moderationNote: v.moderation_note as string | null,
    })),
    ...(submissionRows ?? []).map((r) => ({
      id: r.id as string,
      kind: (r.media_kind === "audio" ? "audio" : "image") as "audio" | "image",
      url: r.url as string,
      label:
        r.target === "cover_image"
          ? "Foto profilo"
          : r.target === "audio_files"
            ? "Audio"
            : "Galleria",
      title: r.title as string | null,
      moderation: r.status as "pending" | "rejected",
      moderationNote: r.review_note as string | null,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* In cima alla shell compariva l'uuid preso dall'indirizzo. Qui il nome
          d'arte c'è già: basta dirlo al breadcrumb. */}
      <BreadcrumbTitle title={artist.stage_name} />

      <Link
        href="/admin/artisti"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli artisti
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={artist.cover_image} name={artist.stage_name} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight">{artist.stage_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {artist.city ?? "Città non impostata"} · /artisti/{artist.slug}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[artist.status] ?? "muted"} dot>
                  {STATUS_LABEL[artist.status] ?? artist.status}
                </Badge>
                {artist.genre.slice(0, 3).map((g) => (
                  <Badge key={g} variant="muted">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/artisti/${artist.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Pagina pubblica
              </Link>
            </Button>
            <DeleteArtistButton artistId={artist.id} artistName={artist.stage_name} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stato pubblicazione</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ArtistStatusToggle artistId={artist.id} status={artist.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Piano artista (tier)</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-2">
          <ArtistTierSelect
            artistId={artist.id}
            effectiveTier={tierFields.tier ?? "free"}
            override={tierFields.tier_override ?? null}
            overrideExpiresAt={tierFields.tier_override_expires_at ?? null}
            overrideReason={tierFields.tier_override_reason ?? null}
          />
          <p className="text-xs text-muted-foreground">
            Il campo <em>Percorso artistico</em> (cover artist, tribute band,
            progetto inedito) è visibile e modificabile solo per i tier <strong>pro</strong> e{" "}
            <strong>max</strong>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenuti caricati</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ArtistMediaPanel artistName={artist.stage_name} items={mediaItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date confermate</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna data confermata per questo artista.
            </p>
          ) : (
            <>
            {/* Sotto md la tabella a 6 colonne obbligherebbe a scorrere di
                lato: stessi dati e stessa azione, impaginati in verticale. */}
            <ul className="space-y-3 md:hidden">
              {bookings.map((b) => {
                const dateLabel = new Date(b.event_date).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                return (
                  <li key={b.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium">{dateLabel}</p>
                      <p className="text-xs text-muted-foreground">{b.time_slot ?? "—"}</p>
                    </div>
                    <p className="mt-1">{b.organizers?.display_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.venues?.name
                        ? `${b.venues.name}${b.venues.city ? ` · ${b.venues.city}` : ""}`
                        : "—"}
                    </p>
                    <p className="mt-1 text-sm">
                      {b.budget_offer != null
                        ? `€${Number(b.budget_offer).toLocaleString("it-IT")}`
                        : "Budget non indicato"}
                    </p>
                    <div className="mt-3">
                      <CancelBookingDialog
                        bookingId={b.id}
                        artistName={artist.stage_name}
                        organizerName={b.organizers?.display_name ?? "Organizzatore"}
                        eventDate={dateLabel}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Data</th>
                    <th className="px-2 py-2">Slot</th>
                    <th className="px-2 py-2">Organizzatore</th>
                    <th className="px-2 py-2">Struttura</th>
                    <th className="px-2 py-2">Budget</th>
                    <th className="px-2 py-2 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const dateLabel = new Date(b.event_date).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });
                    return (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-2 py-2 font-medium">{dateLabel}</td>
                        <td className="px-2 py-2 text-muted-foreground">{b.time_slot ?? "—"}</td>
                        <td className="px-2 py-2">{b.organizers?.display_name ?? "—"}</td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {b.venues?.name
                            ? `${b.venues.name}${b.venues.city ? ` · ${b.venues.city}` : ""}`
                            : "—"}
                        </td>
                        <td className="px-2 py-2">
                          {b.budget_offer != null
                            ? `€${Number(b.budget_offer).toLocaleString("it-IT")}`
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <CancelBookingDialog
                            bookingId={b.id}
                            artistName={artist.stage_name}
                            organizerName={b.organizers?.display_name ?? "Organizzatore"}
                            eventDate={dateLabel}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anagrafica e profilo</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistEditForm
            artistId={artist.id}
            genreOptions={genreOptions}
            defaults={{
              stage_name: artist.stage_name,
              city: artist.city ?? "",
              genre: artist.genre ?? [],
              instruments: artist.instruments ?? [],
              bio: artist.bio ?? "",
              cover_image: artist.cover_image ?? "",
              instagram: social.instagram ?? "",
              facebook: social.facebook ?? "",
              tiktok: social.tiktok ?? "",
              youtube: social.youtube ?? "",
              spotify: social.spotify ?? "",
              website: social.website ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
