"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Andamento delle visite al profilo, in SVG scritto a mano.
 *
 * Nessuna libreria di grafici: in package.json non ce n'è una, e aggiungerne
 * una intera per una pagina sola sarebbe sproporzionato. Qui servono barre
 * impilate a due serie, che sono una moltiplicazione e un rettangolo.
 *
 * 365 barre giornaliere sono illeggibili su qualunque schermo, quindi oltre i
 * 90 giorni si aggrega per settimana. L'etichetta lo dice: un grafico che
 * cambia unità senza dirlo fa leggere numeri sbagliati.
 */

export type ViewPoint = { day: string; organizer_views: number; other_views: number };

type Bucket = { label: string; from: string; to: string; organizer: number; other: number };

const DAY_MS = 86_400_000;

function bucketize(points: ViewPoint[]): { buckets: Bucket[]; weekly: boolean } {
  const weekly = points.length > 90;
  if (!weekly) {
    return {
      weekly,
      buckets: points.map((p) => ({
        label: p.day,
        from: p.day,
        to: p.day,
        organizer: p.organizer_views,
        other: p.other_views,
      })),
    };
  }

  const buckets: Bucket[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    if (chunk.length === 0) continue;
    buckets.push({
      label: chunk[0].day,
      from: chunk[0].day,
      to: chunk[chunk.length - 1].day,
      organizer: chunk.reduce((s, p) => s + p.organizer_views, 0),
      other: chunk.reduce((s, p) => s + p.other_views, 0),
    });
  }
  return { buckets, weekly };
}

function itDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function ViewsChart({
  points,
  /** Con `false` le due serie si sommano in una barra sola (nessuno split). */
  showSplit = true,
}: {
  points: ViewPoint[];
  showSplit?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const { buckets, weekly } = useMemo(() => bucketize(points), [points]);

  const max = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.organizer + b.other)),
    [buckets]
  );
  const total = useMemo(
    () => buckets.reduce((s, b) => s + b.organizer + b.other, 0),
    [buckets]
  );

  if (buckets.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nessun dato ancora disponibile.
      </p>
    );
  }

  if (total === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna visita registrata in questo periodo.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Le visite compaiono qui dal giorno in cui qualcuno apre il tuo profilo pubblico.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {showSplit ? (
          <>
            <LegendDot className="bg-azzurro" label="Organizzatori e locali" />
            <LegendDot className="bg-azzurro/35" label="Altri visitatori" />
          </>
        ) : (
          <LegendDot className="bg-azzurro" label="Visitatori" />
        )}
        <span className="ml-auto">
          {weekly ? "Aggregato per settimana" : "Un dato al giorno"}
        </span>
      </div>

      {/* Il grafico scorre nel suo contenitore: su un telefono 52 settimane non
          ci stanno, e comprimerle produrrebbe barre da mezzo pixel. */}
      <div className="overflow-x-auto pb-2">
        <ul
          className="flex min-w-full items-end gap-[3px]"
          style={{ height: 180, minWidth: buckets.length * 6 }}
        >
          {buckets.map((b) => {
            const sum = b.organizer + b.other;
            const heightPct = (sum / max) * 100;
            const organizerPct = sum > 0 ? (b.organizer / sum) * 100 : 0;
            const when =
              b.from === b.to ? itDate(b.from) : `${itDate(b.from)} – ${itDate(b.to)}`;
            const title = showSplit
              ? `${when}: ${sum} ${sum === 1 ? "visitatore" : "visitatori"} (${b.organizer} da organizzatori)`
              : `${when}: ${sum} ${sum === 1 ? "visitatore" : "visitatori"}`;

            return (
              <li
                key={b.from}
                title={title}
                className="flex h-full min-w-[3px] flex-1 flex-col justify-end"
              >
                <span className="sr-only">{title}</span>
                <span
                  aria-hidden="true"
                  className={`flex w-full flex-col-reverse overflow-hidden rounded-t-sm bg-azzurro/35 ${
                    reduceMotion ? "" : "transition-[height] duration-500 ease-[var(--ease-out)]"
                  }`}
                  style={{ height: `${Math.max(heightPct, sum > 0 ? 2 : 0)}%` }}
                >
                  {showSplit && b.organizer > 0 && (
                    <span
                      className="w-full bg-azzurro"
                      style={{ height: `${organizerPct}%` }}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{itDate(buckets[0].from)}</span>
        <span>{itDate(buckets[buckets.length - 1].to)}</span>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
