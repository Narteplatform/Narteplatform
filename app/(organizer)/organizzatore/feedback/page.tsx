import Link from "next/link";
import { Star } from "lucide-react";
import { requireOrganizer } from "@/lib/auth/guards";
import { getBookingsAwaitingFeedback } from "@/lib/feedback/queries";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { StarRating } from "@/components/feedback/StarRating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

/**
 * Le recensioni che l'organizzatore lascia agli artisti dopo l'evento.
 *
 * QUESTA PAGINA MANCAVA, ed è il motivo per cui l'intero sistema di recensioni
 * era fermo pur essendo costruito: `components/feedback/FeedbackForm.tsx`
 * esisteva ma non era importato da nessuna parte, `lib/feedback/_actions.ts`
 * chiamava già `revalidatePath("/organizzatore/feedback")` su una rotta
 * inesistente, e il template email "Invito a recensire" puntava a un indirizzo
 * che rispondeva 404.
 *
 * La regola di chi può recensire non è decisa qui: sta nella policy RLS di
 * 0027_feedback.sql e, in copia, in `submitFeedback`. Booking confermato,
 * proprio, e data dell'evento già passata. Questa pagina si limita a mostrare
 * ciò che quella regola già consente.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recensioni — N'arte",
};

function dataEstesa(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function OrganizerFeedbackPage() {
  const { organizer } = await requireOrganizer();

  const { pending, sent } = await getBookingsAwaitingFeedback(organizer.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl md:text-3xl">Recensioni</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Dopo ogni data confermata puoi lasciare una valutazione all&rsquo;artista.
          Le recensioni compaiono sul suo profilo pubblico e aiutano gli altri
          organizzatori a scegliere.
        </p>
      </header>

      {/* DA RECENSIRE */}
      <section>
        <h2 className="font-display text-lg">
          Da recensire
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="py-10 text-center">
              <Star className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Non ci sono eventi in attesa di recensione.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compariranno qui le date confermate una volta passate.
              </p>
              <Link
                href="/organizzatore/richieste?status=confermata"
                className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline"
              >
                Vedi le date confermate
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {pending.map((b) => (
              <Card key={b.booking_id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link
                      href={`/artisti/${b.artist_slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {b.artist_name}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {dataEstesa(b.event_date)}
                    {b.venue_name ? ` · ${b.venue_name}` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <FeedbackForm
                    bookingId={b.booking_id}
                    artistName={b.artist_name}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* GIÀ INVIATE */}
      {sent.length > 0 && (
        <section>
          <h2 className="font-display text-lg">Recensioni inviate</h2>
          <ul className="mt-4 space-y-3">
            {sent.map((f) => (
              <li key={f.booking_id}>
                <Card>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-sm">{f.artist_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Evento del {dataEstesa(f.event_date)}
                        </p>
                      </div>
                      <StarRating value={f.rating} size="sm" />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {f.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
