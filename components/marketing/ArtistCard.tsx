import Link from "next/link";
import { Lock, MapPin } from "lucide-react";
import type { PriceBand } from "@/lib/supabase/types";
import { FavoriteToggle } from "@/components/marketing/FavoriteToggle";

const PRICE_SYMBOL: Record<PriceBand, string> = {
  budget: "€",
  standard: "€€",
  premium: "€€€",
  luxury: "€€€€",
};

export type ArtistCardProps = {
  slug: string;
  stageName: string;
  city: string | null;
  coverImage: string | null;
  genres?: string[];
  priceBand?: PriceBand;
  canSeePrice?: boolean;
};

export function ArtistCard({
  slug,
  stageName,
  city,
  coverImage,
  genres = [],
  priceBand = "standard",
  canSeePrice = false,
}: ArtistCardProps) {
  return (
    <Link
      href={`/artisti/${slug}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_40px_-12px_rgba(255,87,34,0.45)] hover:ring-accent/60"
    >
      {/* IMAGE */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={stageName}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-4xl uppercase text-foreground/40">
            {stageName.slice(0, 2)}
          </div>
        )}

        {/* Overlay gradient + hover accent */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-accent/0 mix-blend-color transition-colors duration-300 group-hover:bg-accent/25" />

        {city ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
            <span className="size-2 rounded-full bg-accent" />
            {city}
          </span>
        ) : null}

        <FavoriteToggle
          artist={{ slug, stage_name: stageName, cover_image: coverImage, city }}
          variant="card"
        />

        {genres.length > 0 && (
          <ul className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1">
            {genres.slice(0, 3).map((g) => (
              <li
                key={g}
                className="rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white backdrop-blur-sm transition-colors group-hover:border-accent/80 group-hover:bg-accent/20"
              >
                {g}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* INFO */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="font-display text-xl uppercase leading-tight text-foreground line-clamp-1">
          {stageName}
        </h3>

        <PriceRow priceBand={priceBand} canSeePrice={canSeePrice} />

        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          {city || "Italia"}
        </p>
      </div>
    </Link>
  );
}

function PriceRow({
  priceBand,
  canSeePrice,
}: {
  priceBand: PriceBand;
  canSeePrice: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Range di prezzo
      </span>
      {canSeePrice ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          <span className="font-display tracking-tight">{PRICE_SYMBOL[priceBand]}</span>
        </span>
      ) : (
        <span
          className="relative inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
          title="Accedi come organizzatore per vedere il range"
          aria-label="Range di prezzo bloccato"
        >
          <span
            aria-hidden="true"
            className="select-none font-display tracking-tight text-foreground/80 blur-[3.5px]"
          >
            €€ - €€€€
          </span>
          <Lock className="size-3 text-muted-foreground" />
        </span>
      )}
    </div>
  );
}
