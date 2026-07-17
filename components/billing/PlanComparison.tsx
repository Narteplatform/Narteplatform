"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_PRICES_CENTS,
  annualDiscountPercent,
  formatPrice,
  type BillingInterval,
} from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";

const TIERS: ArtistTier[] = ["free", "pro", "max"];

/**
 * Tabella comparativa dei piani, con toggle mensile/annuale.
 *
 * Le righe arrivano da PLAN_FEATURES: una sola definizione alimenta la pagina
 * pubblica /prezzi e la dashboard abbonamento. Se i due listini divergessero,
 * l'artista vedrebbe un prezzo prima di pagare e un altro dopo.
 *
 * `onSelect` assente = vetrina pubblica (i CTA portano al login).
 */
export function PlanComparison({
  currentTier,
  onSelect,
  pending,
  disabledReason,
}: {
  currentTier?: ArtistTier;
  onSelect?: (tier: "pro" | "max", interval: BillingInterval) => void;
  pending?: boolean;
  disabledReason?: string;
}) {
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const isPublic = !onSelect;

  const hasSecondaryFeatures = PLAN_FEATURES.some((r) => !r.primary);
  const visibleFeatures = showAllFeatures
    ? PLAN_FEATURES
    : PLAN_FEATURES.filter((r) => r.primary);

  return (
    <div className="space-y-8">
      {/* Funzioni disponibili per i 3 piani */}
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium">Funzione</th>
                {TIERS.map((t) => (
                  <th key={t} className="px-4 py-2.5 text-center font-medium">
                    {PLAN_LABELS[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleFeatures.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span>{row.label}</span>
                    {row.hint && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{row.hint}</span>
                    )}
                  </td>
                  {TIERS.map((t) => {
                    const v = row.values[t];
                    return (
                      <td key={t} className="px-4 py-2.5 text-center align-top">
                        {v === true ? (
                          <Check className="mx-auto size-4 text-accent" aria-label="Incluso" />
                        ) : v === false ? (
                          <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Non incluso" />
                        ) : (
                          <span className="text-xs">{v}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasSecondaryFeatures && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllFeatures((v) => !v)}
              aria-expanded={showAllFeatures}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {showAllFeatures ? "Mostra meno" : "Mostra tutte le funzioni"}
              <ChevronDown
                className={cn("size-4 transition-transform", showAllFeatures && "rotate-180")}
              />
            </button>
          </div>
        )}
      </div>

      {/* Toggle mensile/annuale */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                interval === i
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {i === "month" ? "Mensile" : "Annuale"}
              {i === "year" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    interval === "year" ? "bg-background/20" : "bg-accent/15 text-accent"
                  )}
                >
                  −{annualDiscountPercent("pro")}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Schede prezzo */}
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const cents = PLAN_PRICES_CENTS[tier][interval];
          const isCurrent = currentTier === tier;
          const highlight = tier === "pro";
          return (
            <div
              key={tier}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                highlight ? "border-accent/40 bg-accent/[0.03] pt-9" : "border-border"
              )}
            >
              {highlight && (
                <span className="absolute left-1/2 top-3 -translate-x-1/2">
                  <Badge variant="accent">Più scelto</Badge>
                </span>
              )}

              <h3 className="font-display text-xl tracking-tight">{PLAN_LABELS[tier]}</h3>

              <p className="mt-3 font-display text-3xl">
                {cents === 0 ? "Gratis" : formatPrice(cents)}
                {cents > 0 && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /{interval === "month" ? "mese" : "anno"}
                  </span>
                )}
              </p>

              {cents > 0 && interval === "year" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatPrice(Math.round(cents / 12))} al mese, fatturati annualmente
                </p>
              )}
              {cents > 0 && interval === "month" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatPrice(PLAN_PRICES_CENTS[tier].year)} con l&apos;annuale (−
                  {annualDiscountPercent(tier)}%)
                </p>
              )}

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Piano attuale
                  </Button>
                ) : tier === "free" ? (
                  <Button variant="ghost" className="w-full" disabled>
                    Incluso per tutti
                  </Button>
                ) : isPublic ? (
                  <Button asChild variant={highlight ? "accent" : "default"} className="w-full">
                    <a href="/candidatura-artista">Candidati come artista</a>
                  </Button>
                ) : (
                  <Button
                    variant={highlight ? "accent" : "default"}
                    className="w-full"
                    disabled={pending || Boolean(disabledReason)}
                    onClick={() => onSelect?.(tier as "pro" | "max", interval)}
                  >
                    {pending ? "Attendi…" : `Passa a ${PLAN_LABELS[tier]}`}
                  </Button>
                )}
              </div>

              {tier === "max" && interval === "year" && (
                <p className="mt-3 text-xs text-accent">
                  Include lo shooting fotografico, riservato all&apos;abbonamento annuale.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {disabledReason && (
        <p className="text-center text-sm text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
}
