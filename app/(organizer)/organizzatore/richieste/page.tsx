import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BookingStatus } from "@/lib/supabase/types";
import { minToBudgetLabel } from "@/lib/constants/budget-ranges";
import { FinalPriceBox } from "@/components/booking/FinalPriceBox";
import { oggiRoma } from "@/lib/date/roma";

export const dynamic = "force-dynamic";

type Search = { status?: string };

/**
 * Le richieste in attesa sono divise per data dell'evento: quelle con la data
 * già passata non aspettano più una risposta utile e restano a parte. È solo
 * una vista: lo stato nel DB resta `pending`.
 */
type Scheda = BookingStatus | "all" | "pending_passate";

const TABS: { value: Scheda; label: string }[] = [
  { value: "pending", label: "In attesa · future" },
  { value: "pending_passate", label: "In attesa · passate" },
  { value: "in_trattativa", label: "In trattativa" },
  { value: "accettata", label: "Da confermare" },
  { value: "confermata", label: "Confermate" },
  { value: "all", label: "Tutte" },
];

/** Cosa significa la scheda, mostrato quando è vuota. */
const VUOTO: Record<Scheda, string> = {
  pending: "Nessuna richiesta in attesa per date future.",
  pending_passate: "Nessuna richiesta in attesa con la data dell'evento già passata.",
  in_trattativa: "Nessuna trattativa aperta. Una richiesta passa qui quando tu o l'artista scrivete in chat.",
  accettata: "Nessuna data da confermare. Quando un artista accetta la tua offerta la trovi qui, pronta per la tua conferma.",
  confermata: "Nessuna data confermata per ora.",
  rifiutata: "Nessuna richiesta rifiutata.",
  annullata: "Nessuna richiesta annullata.",
  all: "Non hai ancora inviato richieste.",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "In attesa di conferma dell'artista",
  in_trattativa: "In trattativa",
  accettata: "Accettata dall'artista — conferma tu la data",
  confermata: "Confermata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

const STATUS_VARIANT: Record<BookingStatus, "accent" | "default"> = {
  pending: "default",
  in_trattativa: "accent",
  accettata: "accent",
  confermata: "accent",
  rifiutata: "default",
  annullata: "default",
};

export default async function OrganizerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { user, organizer } = await requireOrganizer();
  const sp = await searchParams;
  const status = sp.status ?? "pending";
  const statoDb = status === "pending_passate" ? "pending" : status;
  const oggi = oggiRoma();
  const admin = createAdminClient();

  let query = admin
    .from("booking_requests")
    .select(
      "id, event_date, time_slot, budget_offer, message, status, artist_id, venue_id, created_at, final_price, final_price_proposed_by, final_price_proposed_at, final_price_confirmed_by, final_price_confirmed_at"
    )
    .eq("organizer_id", organizer.id);

  if (status === "pending") {
    // La data più vicina per prima: è quella che chiede una risposta.
    query = query.eq("status", "pending").gte("event_date", oggi).order("event_date", { ascending: true });
  } else if (status === "pending_passate") {
    query = query.eq("status", "pending").lt("event_date", oggi).order("event_date", { ascending: false });
  } else {
    if (statoDb !== "all") query = query.eq("status", statoDb as BookingStatus);
    query = query.order("created_at", { ascending: false });
  }
  // Conteggi per scheda, con lo stesso filtro della lista: il numero accanto
  // all'etichetta è esattamente quante righe si vedono aprendola.
  const [{ data: rows }, { data: stati, error: statiErr }] = await Promise.all([
    query,
    admin.from("booking_requests").select("status, event_date").eq("organizer_id", organizer.id),
  ]);
  const items = rows ?? [];
  const conteggi = new Map<string, number>();
  if (!statiErr) {
    for (const r of stati ?? []) {
      const chiave = r.status === "pending" && r.event_date < oggi ? "pending_passate" : r.status;
      conteggi.set(chiave, (conteggi.get(chiave) ?? 0) + 1);
    }
    conteggi.set("all", (stati ?? []).length);
  }

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
        <h1 className="font-display text-3xl">Richieste inviate</h1>
        <p className="text-sm text-muted-foreground">
          Tutte le date richieste agli artisti. L'artista accetta la trattativa, poi confermi
          tu la prenotazione finale.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => {
          const active = (sp.status ?? "pending") === t.value;
          const n = conteggi.get(t.value);
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
              {n ? (
                <span
                  className={
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums " +
                    (t.value === "accettata" ? "bg-accent text-white" : "bg-muted text-muted-foreground")
                  }
                >
                  {n}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{VUOTO[status as Scheda] ?? "Nessuna richiesta in questa sezione."}</p>
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
            const priceConfirmed =
              r.status === "confermata" && r.final_price_confirmed_at != null;
            const dataPassata = r.status === "pending" && r.event_date < oggi;
            return (
              <Card
                key={r.id}
                className={`overflow-hidden ${
                  priceConfirmed ? "border-emerald-500 ring-1 ring-emerald-500/40" : ""
                } ${dataPassata ? "opacity-75" : ""}`}
              >
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
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    {dataPassata && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Data passata
                      </span>
                    )}
                    {priceConfirmed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="size-3" /> Compenso annotato €{Number(r.final_price)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{r.message}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {venue && <span>{venue.name}{venue.city ? ` · ${venue.city}` : ""}</span>}
                    {r.budget_offer != null && (
                      <span>Budget: {minToBudgetLabel(Number(r.budget_offer))}</span>
                    )}
                  </div>
                  {r.status === "confermata" && (
                    <FinalPriceBox
                      bookingId={r.id}
                      role="organizer"
                      currentUserId={user.id}
                      finalPrice={r.final_price != null ? Number(r.final_price) : null}
                      proposedBy={r.final_price_proposed_by}
                      proposedAt={r.final_price_proposed_at}
                      confirmedBy={r.final_price_confirmed_by}
                      confirmedAt={r.final_price_confirmed_at}
                    />
                  )}
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
