import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { hasTopArtistBadge, hasVerifiedBadge } from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Le etichette di piano sul profilo pubblico: "Verificato N'arte" (Pro e Max) e
 * "TOP Artist" (solo Max).
 *
 * NON è un Client Component di proposito: è presentazionale puro e deve poter
 * essere renderizzato tanto dai Server Component (profilo pubblico, home,
 * dashboard) quanto dai Client Component (ArtistsExplorer, SearchBar, chat).
 * La regola di chi merita quale badge sta in lib/billing/plans.ts, che è dati
 * puri per la stessa ragione — lib/billing/entitlements.ts è `server-only` e
 * qui non è importabile.
 *
 * Usare sempre <ArtistTierBadges>, mai i due badge singoli: è l'unico posto in
 * cui l'ordine e la combinazione sono decisi una volta sola.
 */

/** Fondo semi-opaco per i badge appoggiati su una foto: senza, il testo sparisce. */
const ON_IMAGE = "bg-palco/90 backdrop-blur-sm";

export function VerifiedBadge({
  compact = false,
  onImage = false,
  className,
}: {
  compact?: boolean;
  onImage?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="default"
      className={cn(onImage && ON_IMAGE, compact && "px-1.5", className)}
      // Nella forma compatta resta solo l'icona: senza questi due attributi il
      // badge non avrebbe alcun nome accessibile e in hover non direbbe nulla.
      title="Verificato N'arte"
      aria-label={compact ? "Verificato N'arte" : undefined}
    >
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      {!compact && "Verificato"}
    </Badge>
  );
}

export function TopArtistBadge({
  compact = false,
  onImage = false,
  className,
}: {
  compact?: boolean;
  onImage?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="accent"
      className={cn(onImage && ON_IMAGE, className)}
      title="TOP Artist N'arte"
    >
      {compact ? "TOP" : "Top artist"}
    </Badge>
  );
}

export function ArtistTierBadges({
  tier,
  compact = false,
  onImage = false,
  className,
}: {
  /** `null`/`undefined` è trattato come Free: nessun badge. */
  tier: ArtistTier | null | undefined;
  /** Solo icona per il Verificato e "TOP" abbreviato: per le righe strette. */
  compact?: boolean;
  /** Il badge sta sopra una foto e serve un fondo opaco. */
  onImage?: boolean;
  className?: string;
}) {
  const verified = hasVerifiedBadge(tier);
  const top = hasTopArtistBadge(tier);
  if (!verified && !top) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {/* TOP prima del Verificato: è il segnale più forte e a capo riga stretto
          è quello che deve restare visibile. */}
      {top && <TopArtistBadge compact={compact} onImage={onImage} />}
      {verified && <VerifiedBadge compact={compact} onImage={onImage} />}
    </span>
  );
}
