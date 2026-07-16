import Link from "next/link";
import { Plus, Building2, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function OrganizerVenuesPage() {
  const { organizer } = await requireOrganizer();
  const admin = createAdminClient();
  const { data } = await admin
    .from("venues")
    .select("id, name, city, venue_type, cover_image, capacity")
    .eq("organizer_id", organizer.id)
    .order("created_at", { ascending: false });
  const venues = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Strutture</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Locali e venue che gestisci. Vengono mostrati all'artista come "luogo confermato".
          </p>
        </div>
        <Button asChild>
          <Link href="/organizzatore/strutture/nuova">
            <Plus className="size-4" /> Nuova struttura
          </Link>
        </Button>
      </div>

      {venues.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nessuna struttura ancora. Aggiungi il primo locale per ricevere conferme.
            </p>
            <Button asChild>
              <Link href="/organizzatore/strutture/nuova">
                <Plus className="size-4" /> Aggiungi struttura
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/organizzatore/strutture/${v.id}`}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-accent"
            >
              <div className="aspect-video bg-muted">
                {v.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.cover_image}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Building2 className="size-10" />
                  </div>
                )}
              </div>
              <div className="space-y-1 p-4">
                <h3 className="font-display text-lg">{v.name}</h3>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {v.city ?? "—"}
                  {v.capacity ? ` · ${v.capacity} pax` : ""}
                </p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {v.venue_type}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
