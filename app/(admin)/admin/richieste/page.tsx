import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HighlightedBooking } from "@/components/booking/HighlightedBooking";
import { minToBudgetLabel } from "@/lib/constants/budget-ranges";
import type { BookingStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Richieste — N'arte Admin" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Nuova",
  in_trattativa: "In trattativa",
  confermata: "Confermata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

const STATUS_VARIANT: Record<BookingStatus, "warning" | "default" | "success" | "danger" | "muted"> = {
  pending: "warning",
  in_trattativa: "default",
  confermata: "success",
  rifiutata: "danger",
  annullata: "muted",
};

const ALL_STATUSES: BookingStatus[] = [
  "pending",
  "in_trattativa",
  "confermata",
  "rifiutata",
  "annullata",
];

const TABS: { v: "" | BookingStatus; label: string }[] = [
  { v: "", label: "Tutte" },
  { v: "pending", label: "Nuove" },
  { v: "in_trattativa", label: "In trattativa" },
  { v: "confermata", label: "Confermate" },
  { v: "rifiutata", label: "Rifiutate" },
  { v: "annullata", label: "Annullate" },
];

export default async function AdminRichiestePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; highlight?: string }>;
}) {
  await requireAdminPageAccess("richieste");
  const sp = await searchParams;
  const statusFilter: BookingStatus | null =
    sp?.status && (ALL_STATUSES as string[]).includes(sp.status)
      ? (sp.status as BookingStatus)
      : null;
  // Arriva dal pulsante "Vedi booking confermato" in chat.
  const highlightId = sp?.highlight ?? null;

  const supabase = createAdminClient();

  let q = supabase
    .from("booking_requests")
    .select(
      "id, artist_id, organizer_id, venue_id, event_date, time_slot, budget_offer, final_price, status, created_at"
    )
    .order("created_at", { ascending: false });
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data: requestsRaw } = await q;
  const requests = requestsRaw ?? [];

  // booking_requests non ha relazioni PostgREST: risolviamo a mano via mappe.
  const artistIds = [...new Set(requests.map((r) => r.artist_id).filter(Boolean) as string[])];
  const organizerIds = [...new Set(requests.map((r) => r.organizer_id).filter(Boolean) as string[])];
  const venueIds = [...new Set(requests.map((r) => r.venue_id).filter(Boolean) as string[])];

  const [artistsRes, organizersRes, venuesRes] = await Promise.all([
    artistIds.length
      ? supabase.from("artists").select("id, stage_name, slug").in("id", artistIds)
      : Promise.resolve({ data: [] }),
    organizerIds.length
      ? supabase.from("organizers").select("id, display_name").in("id", organizerIds)
      : Promise.resolve({ data: [] }),
    venueIds.length
      ? supabase.from("venues").select("id, name, city").in("id", venueIds)
      : Promise.resolve({ data: [] }),
  ]);

  const artists = new Map((artistsRes.data ?? []).map((a) => [a.id, a]));
  const organizers = new Map((organizersRes.data ?? []).map((o) => [o.id, o]));
  const venues = new Map((venuesRes.data ?? []).map((v) => [v.id, v]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Richieste</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutte le richieste di booking inviate dagli organizzatori agli artisti della piattaforma.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1 w-fit">
        {TABS.map((t) => {
          const active = (sp?.status ?? "") === t.v;
          const href = t.v ? `/admin/richieste?status=${t.v}` : "/admin/richieste";
          return (
            <Link
              key={t.v || "all"}
              href={href}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessuna richiesta trovata per questo filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const artist = artists.get(r.artist_id);
            const organizer = r.organizer_id ? organizers.get(r.organizer_id) : null;
            const venue = r.venue_id ? venues.get(r.venue_id) : null;
            const status = r.status as BookingStatus;
            const budgetRaw = r.final_price ?? r.budget_offer;
            const budgetLabel = minToBudgetLabel(budgetRaw);

            return (
              <HighlightedBooking key={r.id} id={r.id} active={highlightId === r.id}>
              <Card>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("it-IT")}
                    </p>
                    <CardTitle className="text-lg">
                      {artist?.stage_name ?? "Artista sconosciuto"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Organizzatore: {organizer?.display_name ?? "—"}
                      {venue ? (
                        <span className="inline-flex items-center gap-1">
                          {" · "}
                          <MapPin className="size-3.5" />
                          {venue.name}
                          {venue.city ? ` (${venue.city})` : ""}
                        </span>
                      ) : null}
                    </p>
                    <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        Data evento:{" "}
                        {r.event_date
                          ? new Date(r.event_date).toLocaleDateString("it-IT")
                          : "—"}
                      </span>
                      {r.time_slot && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" /> {r.time_slot}
                        </span>
                      )}
                      {budgetLabel && <span>Budget: {budgetLabel}</span>}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[status] ?? "muted"} dot>
                    {STATUS_LABEL[status] ?? status}
                  </Badge>
                </CardHeader>
              </Card>
              </HighlightedBooking>
            );
          })}
        </div>
      )}
    </div>
  );
}
