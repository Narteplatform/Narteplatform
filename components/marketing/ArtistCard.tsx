import Link from "next/link";
import { Lock } from "lucide-react";
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
      className="group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_40px_-12px_rgba(37,99,235,0.55)] hover:ring-accent/60"
    >
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

      {/* Overlay base */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      {/* Overlay hover blu */}
      <div className="pointer-events-none absolute inset-0 bg-accent/0 mix-blend-color transition-colors duration-300 group-hover:bg-accent/35" />

      {city ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          <span className="size-2 rounded-full bg-accent" />
          {city}
        </span>
      ) : null}

      <span
        className={
          "absolute left-3 bottom-[88px] inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm " +
          (canSeePrice ? "" : "opacity-80")
        }
        title={canSeePrice ? "Fascia di prezzo" : "Visibile agli organizzatori"}
      >
        {canSeePrice ? (
          <span className="font-display tracking-tight">{PRICE_SYMBOL[priceBand]}</span>
        ) : (
          <Lock className="size-3" />
        )}
      </span>

      <FavoriteToggle
        artist={{ slug, stage_name: stageName, cover_image: coverImage, city }}
        variant="card"
      />

      <div className="absolute inset-x-3 bottom-3 space-y-2">
        {genres.length > 0 && (
          <ul className="flex flex-wrap gap-1">
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
        <h3 className="font-display text-2xl uppercase leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {stageName}
        </h3>
      </div>
    </Link>
  );
}
