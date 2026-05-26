import { Star } from "lucide-react";
import type { AdminFeedbackStats } from "@/lib/feedback/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function FeedbackAnalytics({ stats }: { stats: AdminFeedbackStats }) {
  const maxBar = Math.max(1, ...Object.values(stats.distribution));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Totale</p>
            <p className="font-display text-2xl">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Media</p>
            <p className="font-display text-2xl">
              {stats.average.toFixed(2)}{" "}
              <span className="text-sm text-amber-500">★</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimi 30 gg</p>
            <p className="font-display text-2xl">{stats.last30}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuzione voti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const v = stats.distribution[n];
            const pct = Math.round((v / maxBar) * 100);
            return (
              <div key={n} className="flex items-center gap-3">
                <span className="inline-flex w-16 items-center gap-1 text-sm">
                  {n}{" "}
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${pct}%` }}
                    aria-label={`${v} voti`}
                  />
                </div>
                <span className="w-10 text-right text-sm text-muted-foreground">{v}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 artisti (min 3 review)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topArtists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Servono almeno 3 feedback per artista per comparire qui.
            </p>
          ) : (
            <ol className="space-y-2">
              {stats.topArtists.map((a, idx) => (
                <li key={a.artist_id} className="flex items-center gap-3 text-sm">
                  <span className="w-6 font-semibold text-muted-foreground">{idx + 1}.</span>
                  <span className="flex-1 truncate font-medium">{a.name}</span>
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {a.avg.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">({a.count})</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
