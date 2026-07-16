import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RequestActions } from "@/components/organizer/RequestActions";
import type { BookingStatus } from "@/lib/supabase/types";
import { minToBudgetLabel } from "@/lib/constants/budget-ranges";
import { openChatAndRedirect } from "@/lib/chat/open";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "In attesa di conferma dell'artista",
  in_trattativa: "In trattativa",
  confermata: "Confermata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

export default async function OrganizerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizer } = await requireOrganizer();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("booking_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!req || req.organizer_id !== organizer.id) notFound();

  const [{ data: artist }, venueRes] = await Promise.all([
    admin
      .from("artists")
      .select("id, stage_name, slug, cover_image, city")
      .eq("id", req.artist_id)
      .maybeSingle(),
    req.venue_id
      ? admin
          .from("venues")
          .select("id, name, city, address")
          .eq("id", req.venue_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const venue = venueRes?.data ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/organizzatore/richieste"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tutte le richieste
        </Link>
        <Badge variant={req.status === "confermata" ? "accent" : "default"}>
          {STATUS_LABEL[req.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <div className="size-16 overflow-hidden rounded-lg bg-muted">
            {artist?.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.cover_image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <CardTitle className="font-display">
              {artist?.stage_name ?? "Artista"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {new Date(req.event_date).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {req.time_slot ? ` · ${req.time_slot}` : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Messaggio inviato
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm">{req.message}</p>
          </div>

          {req.notes_artist && (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-accent">
                Note dall'artista
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm">{req.notes_artist}</p>
            </div>
          )}

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {venue && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Struttura
                </span>
                <p>{venue.name}</p>
                <p className="text-muted-foreground">
                  {[venue.address, venue.city].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {req.budget_offer != null && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Range di budget
                </span>
                <p>{minToBudgetLabel(Number(req.budget_offer))}</p>
              </div>
            )}
          </div>

          <RequestActions requestId={req.id} status={req.status} />

          <form action={openChatAndRedirect}>
            <input type="hidden" name="artist_id" value={req.artist_id} />
            <input type="hidden" name="organizer_id" value={organizer.id} />
            <input type="hidden" name="base_path" value="/organizzatore/chat" />
            <Button type="submit">Apri chat con l&apos;artista</Button>
          </form>

          {artist && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/artisti/${artist.slug}`}>Vai al profilo artista</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
