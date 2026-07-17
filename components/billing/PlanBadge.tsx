import { Badge } from "@/components/ui/Badge";
import { PLAN_BADGE_VARIANT, PLAN_SHORT_LABELS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Etichetta del piano (FREE / PRO / MAX) con la variante colore coerente.
 *
 * Fonte unica: PLAN_BADGE_VARIANT e PLAN_SHORT_LABELS in lib/billing/plans.ts.
 * Riusata dal roster admin, dall'overview artista e dalla pillola profilo.
 */
export function PlanBadge({
  tier,
  className,
}: {
  tier: ArtistTier;
  className?: string;
}) {
  return (
    <Badge variant={PLAN_BADGE_VARIANT[tier]} className={cn(className)}>
      {PLAN_SHORT_LABELS[tier]}
    </Badge>
  );
}
