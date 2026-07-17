"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
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
 * Stile per piano nella sezione scura della home. Tutte le card hanno testo
 * bianco per leggibilità: Free è una card "glass" translucida, Pro il gradiente
 * corallo, Max il gradiente azzurro (colore branding diverso da Pro).
 */
const CARD_STYLE: Record<
  ArtistTier,
  { card: string; cta: string; check: string; recommended: boolean }
> = {
  free: {
    card: "border-white/12 bg-white/[0.06]",
    cta: "border border-white/25 text-white hover:bg-white/10",
    check: "bg-white/15 text-white",
    recommended: false,
  },
  pro: {
    card:
      "border-transparent bg-gradient-to-br from-corallo-light via-corallo to-corallo-dark shadow-[var(--shadow-brand)] md:-translate-y-3",
    cta: "bg-white text-corallo-dark hover:bg-palco",
    check: "bg-white/20 text-white",
    recommended: true,
  },
  max: {
    card:
      "border-transparent bg-gradient-to-br from-azzurro-light via-azzurro to-azzurro-dark shadow-[var(--shadow-brand)]",
    cta: "bg-white text-azzurro-dark hover:bg-palco",
    check: "bg-white/20 text-white",
    recommended: false,
  },
};

export function HomePricing() {
  const [interval, setInterval] = useState<BillingInterval>("year");

  return (
    <div className="space-y-10">
      {/* Toggle mensile/annuale */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-5 text-sm font-medium transition",
                interval === i
                  ? "bg-white text-notte shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              {i === "month" ? "Mensile" : "Annuale"}
              {i === "year" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    interval === "year" ? "bg-notte/10 text-notte" : "bg-corallo/30 text-white"
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
          const style = CARD_STYLE[tier];
          const cents = PLAN_PRICES_CENTS[tier][interval];
          return (
            <div
              key={tier}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7 text-white transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)]",
                style.card
              )}
            >
              {style.recommended && (
                <span className="absolute right-6 top-7 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white backdrop-blur">
                  Più scelto
                </span>
              )}

              <h3 className="font-display text-lg tracking-tight text-white">{PLAN_LABELS[tier]}</h3>
              <p className="mt-1 text-sm text-white/75">{PLAN_TAGLINES[tier]}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-4xl leading-none tracking-tight">
                  {cents === 0 ? "Gratis" : formatPrice(cents)}
                </span>
                {cents > 0 && (
                  <span className="pb-1 text-sm text-white/60">
                    /{interval === "month" ? "mese" : "anno"}
                  </span>
                )}
              </div>
              <p className="mt-1 min-h-[1.25rem] text-xs text-white/65">
                {cents === 0
                  ? "Per sempre, senza carta"
                  : interval === "year"
                    ? `${formatPrice(Math.round(cents / 12))} al mese, fatturati annualmente`
                    : `oppure ${formatPrice(PLAN_PRICES_CENTS[tier].year)}/anno (−${annualDiscountPercent(tier)}%)`}
              </p>

              <Link
                href={CTA_HREF}
                className={cn(
                  "mt-6 inline-flex h-12 w-full items-center justify-center rounded-md px-5 text-sm font-semibold transition",
                  style.cta
                )}
              >
                {CTA_LABEL[tier]}
              </Link>

              <div className="my-6 h-px w-full bg-white/15" />

              <ul className="flex flex-1 flex-col gap-3 text-sm">
                {PLAN_CARD_HIGHLIGHTS[tier].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                        style.check
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    <span className="text-white/90">{feat}</span>
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
