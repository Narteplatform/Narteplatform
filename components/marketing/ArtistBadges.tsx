import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { hasTopArtistBadge, hasProBadge } from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Le etichette di piano sul profilo pubblico: "Artista Pro" (Pro e Max) e
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

/** Testi dell'Allegato A del doc. 07 (criteri di posizionamento). */
const PRO_TIP =
  "L'artista ha un abbonamento Pro o Max attivo. Non è una verifica d'identità né un giudizio artistico.";
const TOP_TIP = "In evidenza con il piano Max, a pagamento. Non è una classifica di merito.";

export function ProBadge({
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
      className={cn(onImage && ON_IMAGE, className)}
      // Indica l'abbonamento attivo: non è una verifica di identità né un
      // giudizio artistico. Nella forma compatta il testo è abbreviato in "Pro",
      // quindi l'aria-label esteso dà il nome completo.
      title={PRO_TIP}
      aria-label={compact ? `Artista Pro. ${PRO_TIP}` : undefined}
    >
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      {compact ? "Pro" : "Artista Pro"}
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
      title={TOP_TIP}
      aria-label={compact ? `TOP Artist. ${TOP_TIP}` : undefined}
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
  /** "Pro" abbreviato per il badge Artista Pro e "TOP" abbreviato: per le righe strette. */
  compact?: boolean;
  /** Il badge sta sopra una foto e serve un fondo opaco. */
  onImage?: boolean;
  className?: string;
}) {
  const pro = hasProBadge(tier);
  const top = hasTopArtistBadge(tier);
  if (!pro && !top) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {/* TOP prima di Artista Pro: è il segnale più forte e a capo riga stretto
          è quello che deve restare visibile. */}
      {top && <TopArtistBadge compact={compact} onImage={onImage} />}
      {pro && <ProBadge compact={compact} onImage={onImage} />}
    </span>
  );
}
