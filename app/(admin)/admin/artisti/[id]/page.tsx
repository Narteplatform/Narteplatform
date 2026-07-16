import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
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
  const [{ data: artist }, { data: genresData }, { data: confirmedBookings }] = await Promise.all([
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
  ]);
  if (!artist) notFound();

  const social = (artist.social_links ?? {}) as SocialLinks;
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

  return (
    <div className="space-y-6">
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
            tier={(artist as { tier?: "free" | "pro" | "max" }).tier ?? "free"}
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
          <CardTitle className="text-base">Date confermate</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna data confermata per questo artista.
            </p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
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
