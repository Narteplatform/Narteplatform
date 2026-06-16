import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Image as ImageIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/forms/EventForm";
import { DeleteEventButton } from "@/components/forms/DeleteEventButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatEventDate } from "@/lib/utils";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  const past = new Date(event.date) < new Date();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/eventi"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli eventi
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {event.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.cover_image} alt={event.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight">{event.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatEventDate(event.date)} · {event.city}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="muted">{event.category}</Badge>
                {event.featured && <Badge variant="accent">In primo piano</Badge>}
                {past && <Badge variant="muted">Concluso</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/eventi/${event.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Pagina pubblica
              </Link>
            </Button>
            <DeleteEventButton id={event.id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modifica evento</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            defaultValues={{
              title: event.title,
              category: event.category,
              date: new Date(event.date).toISOString().slice(0, 16),
              endAt: event.end_at ? new Date(event.end_at).toISOString().slice(0, 16) : "",
              city: event.city,
              venue: event.venue ?? "",
              price: event.price?.toString() ?? "",
              coverImage: event.cover_image ?? "",
              ticketUrl: event.ticket_url ?? "",
              description: event.description ?? "",
              featured: event.featured,
              gallery: event.gallery ?? [],
              videos: event.videos ?? [],
            }}
            eventId={event.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
