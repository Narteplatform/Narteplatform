import { Star } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getFeedbackForArtistUser } from "@/lib/feedback/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PlatformFeedbackForm } from "@/components/feedback/PlatformFeedbackForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback ricevuti — N'arte Artist" };

export default async function ArtistFeedbackPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const { artist, feedback } = await getFeedbackForArtistUser(user.id);

  if (!artist) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nessun profilo artista collegato.
        </CardContent>
      </Card>
    );
  }

  const avg =
    feedback.length === 0
      ? 0
      : feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recensioni ricevute dagli organizzatori dopo gli eventi e modulo per inviare il tuo
          feedback al team N&apos;arte.
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

      <header>
        <h2 className="font-display text-lg tracking-tight">Recensioni ricevute</h2>
      </header>

      {feedback.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Totale</p>
              <p className="font-display text-2xl">{feedback.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Media voti</p>
              <p className="font-display text-2xl">
                {avg.toFixed(1)}{" "}
                <span className="text-sm text-amber-500">
                  ★
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimo</p>
              <p className="text-sm">
                {new Date(feedback[0].created_at).toLocaleDateString("it-IT")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun feedback ancora ricevuto. Apparirà qui dopo gli eventi confermati.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{f.organizer_name}</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-4 ${
                          n <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString("it-IT")}
                </p>
                <p className="whitespace-pre-wrap text-sm">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
