import { Star } from "lucide-react";
import { requireOrganizer } from "@/lib/auth/guards";
import { getBookingsAwaitingFeedback } from "@/lib/feedback/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { PlatformFeedbackForm } from "@/components/feedback/PlatformFeedbackForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback artisti — N'arte Organizer" };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function OrganizerFeedbackPage() {
  const { organizer } = await requireOrganizer();
  const { pending, sent } = await getBookingsAwaitingFeedback(organizer.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Feedback</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Recensisci gli artisti dopo gli eventi e invia feedback al team N&apos;arte sulla piattaforma.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invia feedback al team N&apos;arte</CardTitle>
          <CardDescription>
            Suggerimenti, bug o richieste sulla piattaforma. Il team riceve tutto su /admin/feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformFeedbackForm />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Da valutare ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nessun evento da valutare al momento.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((b) => (
              <Card key={b.booking_id}>
                <CardHeader className="flex-row items-center gap-3">
                  <div className="size-12 overflow-hidden rounded-md bg-muted">
                    {b.artist_cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.artist_cover} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{b.artist_name}</CardTitle>
                    <CardDescription>
                      {formatDate(b.event_date)}
                      {b.venue_name ? ` · ${b.venue_name}` : ""}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <FeedbackForm bookingId={b.booking_id} artistName={b.artist_name} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {sent.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-muted-foreground">
            Già inviati ({sent.length})
          </h2>
          <div className="space-y-3">
            {sent.map((s) => (
              <Card key={s.booking_id}>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{s.artist_name}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${
                            n <= s.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Evento {formatDate(s.event_date)} · Inviato il{" "}
                    {new Date(s.created_at).toLocaleDateString("it-IT")}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
