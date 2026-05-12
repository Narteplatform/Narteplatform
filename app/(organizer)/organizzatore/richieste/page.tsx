import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BookingStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Search = { status?: string };

const TABS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "pending", label: "In attesa" },
  { value: "in_trattativa", label: "In trattativa" },
  { value: "confermata", label: "Confermate" },
  { value: "all", label: "Tutte" },
];

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "In attesa",
  in_trattativa: "In trattativa",
  confermata: "Confermata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

const STATUS_VARIANT: Record<BookingStatus, "accent" | "default"> = {
  pending: "default",
  in_trattativa: "accent",
  confermata: "accent",
  rifiutata: "default",
  annullata: "default",
};

export default async function OrganizerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { organizer } = await requireOrganizer();
  const sp = await searchParams;
  const status = sp.status ?? "pending";
  const admin = createAdminClient();

  let query = admin
    .from("booking_requests")
    .select(
      "id, event_date, time_slot, budget_offer, message, status, artist_id, venue_id, created_at"
    )
    .eq("organizer_id", organizer.id)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status as BookingStatus);
  }
  const { data: rows } = await query;
  const items = rows ?? [];

  const artistIds = [...new Set(items.map((r) => r.artist_id))];
  const venueIds = [...new Set(items.map((r) => r.venue_id).filter(Boolean) as string[])];
  const [artistsRes, venuesRes] = await Promise.all([
    artistIds.length > 0
      ? admin
          .from("artists")
          .select("id, stage_name, slug, cover_image")
          .in("id", artistIds)
      : Promise.resolve({ data: [] }),
    venueIds.length > 0
      ? admin.from("venues").select("id, name, city").in("id", venueIds)
      : Promise.resolve({ data: [] }),
  ]);
  const artists = new Map((artistsRes.data ?? []).map((a) => [a.id, a]));
  const venues = new Map((venuesRes.data ?? []).map((v) => [v.id, v]));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl uppercase tracking-tight">Richieste inviate</h1>
        <p className="text-sm text-muted-foreground">
          Tutte le date richieste agli artisti. L'artista accetta la trattativa, poi confermi
          tu la prenotazione finale.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => {
          const active = (sp.status ?? "pending") === t.value;
          return (
            <Link
              key={t.value}
              href={`/organizzatore/richieste${t.value === "pending" ? "" : `?status=${t.value}`}`}
              className={
                "rounded-t-md px-3 py-2 text-sm transition " +
                (active
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Nessuna richiesta in questa sezione.</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/artisti">Esplora artisti</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => {
            const artist = artists.get(r.artist_id);
            const venue = r.venue_id ? venues.get(r.venue_id) : null;
            return (
              <Card key={r.id} className="overflow-hidden">
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 overflow-hidden rounded-md bg-muted">
                      {artist?.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artist.cover_image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {artist?.stage_name ?? "Artista"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.event_date).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                        {r.time_slot ? ` · ${r.time_slot}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{r.message}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {venue && <span>{venue.name}{venue.city ? ` · ${venue.city}` : ""}</span>}
                    {r.budget_offer && <span>Budget €{r.budget_offer}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/organizzatore/richieste/${r.id}`}>Dettagli</Link>
                    </Button>
                    {artist && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/artisti/${artist.slug}`}>Vai all'artista</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
