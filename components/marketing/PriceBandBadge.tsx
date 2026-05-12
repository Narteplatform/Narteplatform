import Link from "next/link";
import { Lock } from "lucide-react";
import type { PriceBand } from "@/lib/supabase/types";

const SYMBOL: Record<PriceBand, string> = {
  budget: "€",
  standard: "€€",
  premium: "€€€",
  luxury: "€€€€",
};

const LABEL: Record<PriceBand, string> = {
  budget: "Budget friendly",
  standard: "Standard",
  premium: "Premium",
  luxury: "Top tier",
};

export function PriceBandBadge({
  band,
  canSee,
}: {
  band: PriceBand;
  canSee: boolean;
}) {
  if (!canSee) {
    return (
      <Link
        href="/register?role=organizer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition hover:border-accent hover:text-accent"
        title="Visibile agli organizzatori"
      >
        <Lock className="size-3" />
        <span>Visibile agli organizzatori</span>
      </Link>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
      title={LABEL[band]}
    >
      <span className="font-display tracking-tight">{SYMBOL[band]}</span>
      <span>{LABEL[band]}</span>
    </span>
  );
}
