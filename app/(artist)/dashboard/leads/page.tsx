import Link from "next/link";
import { Clock, Mail, Phone, Building2, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArtistRequestActions } from "@/components/organizer/ArtistRequestActions";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  new: "warning",
  contacted: "muted",
  closed: "success",
} as const;

const STATUS_LABEL = {
  new: "Nuova",
  contacted: "Contattata",
  closed: "Chiusa",
} as const;

const TABS: { v: "" | "new" | "contacted" | "closed"; label: string }[] = [
  { v: "", label: "Tutte" },
  { v: "new", label: "Nuove" },
  { v: "contacted", label: "Contattate" },
  { v: "closed", label: "Chiuse" },
];

export default async function ArtistLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nessun profilo artista collegato. Contatta l&apos;amministratore.
        </CardContent>
      </Card>
    );
  }

  const ALLOWED = ["new", "contacted", "closed"] as const;
  type S = (typeof ALLOWED)[number];
  const statusFilter: S | null =
    sp?.status && (ALLOWED as readonly string[]).includes(sp.status) ? (sp.status as S) : null;

  let q = supabase
    .from("leads")
    .select("*")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data: leads } = await q;

  // Carica anche booking_requests handshake con organizer + venue join
  const { data: bookingRows } = await supabase
    .from("booking_requests")
    .select(
      "id, event_date, time_slot, budget_offer, message, status, notes_artist, organizer_id, venue_id, created_at"
    )
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });
  const bookings = bookingRows ?? [];
  const organizerIds = [...new Set(bookings.map((b) => b.organizer_id))];
  const venueIds = [...new Set(bookings.map((b) => b.venue_id).filter(Boolean) as string[])];
  const [orgsRes, vensRes] = await Promise.all([
    organizerIds.length
      ? supabase
          .from("organizers")
          .select("id, display_name, avatar_url, bio, phone, website, instagram, user_id")
          .in("id", organizerIds)
      : Promise.resolve({ data: [] }),
    venueIds.length
      ? supabase
          .from("venues")
          .select("id, name, city, address, cover_image, capacity, venue_type")
          .in("id", venueIds)
      : Promise.resolve({ data: [] }),
  ]);
  const orgs = new Map((orgsRes.data ?? []).map((o) => [o.id, o]));
  const vens = new Map((vensRes.data ?? []).map((v) => [v.id, v]));

  const BOOKING_LABEL: Record<BookingStatus, string> = {
    pending: "In attesa",
    in_trattativa: "In trattativa",
    confermata: "Confermata",
    rifiutata: "Rifiutata",
    annullata: "Annullata",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Le tue richieste</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutte le richieste di booking ricevute tramite la piattaforma.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1 w-fit">
        {TABS.map((t) => {
          const active = (sp?.status ?? "") === t.v;
          const href = t.v ? `/dashboard/leads?status=${t.v}` : "/dashboard/leads";
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

      {bookings.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg uppercase tracking-tight">
            Richieste da organizzatori
          </h2>
          <div className="space-y-4">
            {bookings.map((b) => {
              const org = orgs.get(b.organizer_id);
              const ven = b.venue_id ? vens.get(b.venue_id) : null;
              return (
                <Card key={b.id}>
                  <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {new Date(b.created_at).toLocaleString("it-IT")}
                      </p>
                      <CardTitle className="text-lg">
                        {new Date(b.event_date).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                        {b.time_slot ? ` · ${b.time_slot}` : ""}
                      </CardTitle>
                      {b.budget_offer && (
                        <p className="text-sm text-muted-foreground">
                          Budget offerto €{Number(b.budget_offer).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Badge variant={b.status === "confermata" ? "success" : b.status === "in_trattativa" ? "warning" : "muted"} dot>
                      {BOOKING_LABEL[b.status]}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{b.message}</p>

                    <div className="grid gap-3 md:grid-cols-2">
                      {org && (
                        <div className="rounded-lg border border-border bg-muted p-3">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Organizzatore
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            {org.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={org.avatar_url}
                                alt=""
                                className="size-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="size-10 rounded-full bg-background" />
                            )}
                            <div>
                              <p className="font-medium">{org.display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[org.phone, org.website, org.instagram].filter(Boolean).join(" · ") || "—"}
                              </p>
                            </div>
                          </div>
                          {org.bio && (
                            <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                              {org.bio}
                            </p>
                          )}
                        </div>
                      )}
                      {ven && (
                        <div className="rounded-lg border border-border bg-muted p-3">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Struttura
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            {ven.cover_image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ven.cover_image}
                                alt=""
                                className="size-10 rounded-md object-cover"
                              />
                            ) : (
                              <Building2 className="size-10 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{ven.name}</p>
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="size-3" />
                                {[ven.address, ven.city].filter(Boolean).join(", ") || "—"}
                                {ven.capacity ? ` · ${ven.capacity} pax` : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {b.notes_artist && (
                      <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
                        <span className="text-[11px] uppercase tracking-wider text-accent">
                          Tue note
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{b.notes_artist}</p>
                      </div>
                    )}

                    <ArtistRequestActions requestId={b.id} status={b.status} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!leads || leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessuna richiesta trovata.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leads.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("it-IT")}
                  </p>
                  <CardTitle className="text-lg">
                    {l.event_location} <span className="text-muted-foreground font-normal">·</span>{" "}
                    {new Date(l.event_date).toLocaleDateString("it-IT")}
                  </CardTitle>
                  {l.event_time && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" /> {l.event_time}
                    </p>
                  )}
                  {l.budget != null && (
                    <p className="text-sm text-muted-foreground">
                      Budget €{Number(l.budget).toFixed(2)}
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[l.status as keyof typeof STATUS_VARIANT]} dot>
                  {STATUS_LABEL[l.status as keyof typeof STATUS_LABEL]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{l.message}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <a
                    href={`mailto:${l.contact_email}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="size-3.5" /> {l.contact_email}
                  </a>
                  {l.contact_phone && (
                    <a
                      href={`tel:${l.contact_phone}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Phone className="size-3.5" /> {l.contact_phone}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
