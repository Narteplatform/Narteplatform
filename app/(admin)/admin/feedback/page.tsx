import { Star } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { listAllFeedback, getFeedbackStats } from "@/lib/feedback/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FeedbackAnalytics } from "@/components/admin/FeedbackAnalytics";
import { FeedbackModerationButtons } from "@/components/admin/FeedbackModerationButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback — N'arte Admin" };

type SP = {
  rating?: string;
  artist_id?: string;
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireAdminPageAccess("feedback");
  const sp = await searchParams;

  const ratingNum =
    sp.rating && /^\d+$/.test(sp.rating) ? Math.min(5, Math.max(1, Number(sp.rating))) : undefined;

  const [stats, items] = await Promise.all([
    getFeedbackStats(),
    listAllFeedback({
      artistId: sp.artist_id,
      minRating: ratingNum,
      maxRating: ratingNum,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutti i feedback ricevuti dagli artisti dopo gli eventi confermati. Modera i contenuti
          offensivi nascondendo o eliminando le voci.
        </p>
      </header>

      <FeedbackAnalytics stats={stats} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
            Lista feedback ({items.length})
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <a
              href="/admin/feedback"
              className={`rounded-full border px-3 py-1 ${
                ratingNum == null ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              Tutti
            </a>
            {[5, 4, 3, 2, 1].map((n) => (
              <a
                key={n}
                href={`/admin/feedback?rating=${n}`}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                  ratingNum === n ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                {n} ★
              </a>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nessun feedback con questi filtri.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((f) => (
              <Card key={f.id} className={f.hidden ? "opacity-60" : ""}>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 overflow-hidden rounded-md bg-muted">
                      {f.artist_cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.artist_cover} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{f.artist_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        da {f.organizer_name} ·{" "}
                        {new Date(f.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${
                            n <= f.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    {f.hidden && <Badge variant="muted">Nascosto</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{f.body}</p>
                  <FeedbackModerationButtons id={f.id} hidden={f.hidden} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
