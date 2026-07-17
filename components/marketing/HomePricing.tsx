"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  PLAN_CARD_HIGHLIGHTS,
  PLAN_LABELS,
  PLAN_PRICES_CENTS,
  PLAN_TAGLINES,
  annualDiscountPercent,
  formatPrice,
  type BillingInterval,
} from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";

const TIERS: ArtistTier[] = ["free", "pro", "max"];
const CTA_HREF = "/candidatura-artista";
const CTA_LABEL: Record<ArtistTier, string> = {
  free: "Inizia gratis",
  pro: "Scegli N'arte Pro",
  max: "Scegli N'arte Max",
};

/**
 * Vista a card dei piani per la home: tre schede affiancate con listino,
 * checklist e la scheda "Più scelto" (Pro) evidenziata col gradiente corallo.
 * Il confronto completo resta la tabella su /prezzi e nella dashboard.
 * Listino e funzioni arrivano da lib/billing/plans.ts (fonte unica).
 */
export function HomePricing() {
  const [interval, setInterval] = useState<BillingInterval>("year");

  return (
    <div className="space-y-10">
      {/* Toggle mensile/annuale */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-sm)]">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-5 text-sm font-medium transition",
                interval === i
                  ? "bg-notte text-palco shadow-sm"
                  : "text-notte/60 hover:text-notte"
              )}
            >
              {i === "month" ? "Mensile" : "Annuale"}
              {i === "year" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    interval === "year" ? "bg-palco/25 text-palco" : "bg-corallo/15 text-corallo-dark"
                  )}
                >
                  −{annualDiscountPercent("pro")}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Schede piano */}
      <div className="grid items-stretch gap-6 md:grid-cols-3">
        {TIERS.map((tier) => {
          const highlight = tier === "pro";
          const cents = PLAN_PRICES_CENTS[tier][interval];
          return (
            <div
              key={tier}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7 transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)]",
                highlight
                  ? "border-transparent bg-gradient-to-br from-corallo-light via-corallo to-corallo-dark text-white shadow-[var(--shadow-brand)] md:-translate-y-3"
                  : "border-border bg-surface text-notte shadow-[var(--shadow-sm)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              )}
            >
              {highlight && (
                <span className="absolute right-6 top-7 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white backdrop-blur">
                  Più scelto
                </span>
              )}

              <h3 className={cn("font-display text-lg tracking-tight", highlight ? "text-white" : "text-notte")}>
                {PLAN_LABELS[tier]}
              </h3>
              <p className={cn("mt-1 text-sm", highlight ? "text-white/80" : "text-notte/60")}>
                {PLAN_TAGLINES[tier]}
              </p>

              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-4xl leading-none tracking-tight">
                  {cents === 0 ? "Gratis" : formatPrice(cents)}
                </span>
                {cents > 0 && (
                  <span className={cn("pb-1 text-sm", highlight ? "text-white/70" : "text-notte/50")}>
                    /{interval === "month" ? "mese" : "anno"}
                  </span>
                )}
              </div>
              <p className={cn("mt-1 min-h-[1.25rem] text-xs", highlight ? "text-white/70" : "text-notte/50")}>
                {cents === 0
                  ? "Per sempre, senza carta"
                  : interval === "year"
                    ? `${formatPrice(Math.round(cents / 12))} al mese, fatturati annualmente`
                    : `oppure ${formatPrice(PLAN_PRICES_CENTS[tier].year)}/anno (−${annualDiscountPercent(tier)}%)`}
              </p>

              <div className="mt-6">
                {highlight ? (
                  <Link
                    href={CTA_HREF}
                    className="inline-flex h-12 w-full items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-corallo-dark transition hover:bg-palco"
                  >
                    {CTA_LABEL[tier]}
                  </Link>
                ) : (
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href={CTA_HREF}>{CTA_LABEL[tier]}</Link>
                  </Button>
                )}
              </div>

              <div className={cn("my-6 h-px w-full", highlight ? "bg-white/20" : "bg-border")} />

              <ul className="flex flex-1 flex-col gap-3 text-sm">
                {PLAN_CARD_HIGHLIGHTS[tier].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                        highlight ? "bg-white/20 text-white" : "bg-azzurro/10 text-azzurro"
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    <span className={cn(highlight ? "text-white/90" : "text-notte/80")}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
