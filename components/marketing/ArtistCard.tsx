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

const GENRE_BADGE: Record<string, string> = {
  jazz: "bg-azzurro/15 text-azzurro",
  soul: "bg-corallo/15 text-corallo-dark",
  classica: "bg-[#2A9D5C18] text-[#1F7A46]",
  classico: "bg-[#2A9D5C18] text-[#1F7A46]",
  pop: "bg-[#E8A03022] text-[#B87020]",
  folk: "bg-notte/10 text-notte",
  rock: "bg-notte/10 text-notte",
  elettronica: "bg-azzurro/15 text-azzurro",
};

function genreClass(g: string) {
  return GENRE_BADGE[g.toLowerCase()] ?? "bg-muted text-foreground";
}

export type ArtistCardProps = {
  slug: string;
  stageName: string;
  city: string | null;
  coverImage: string | null;
  genres?: string[];
  priceBand?: PriceBand;
  canSeePrice?: boolean;
  isGuest?: boolean;
  category?: string | null;
};

export function ArtistCard({
  slug,
  stageName,
  city,
  coverImage,
  genres = [],
  priceBand = "standard",
  canSeePrice = false,
  isGuest = false,
  category = null,
}: ArtistCardProps) {
  const href = isGuest ? `/login?next=/artisti` : `/artisti/${slug}`;
  return (
    <Link
      href={href}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)] transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
      aria-label={isGuest ? "Iscriviti per vedere i dettagli dell'artista" : stageName}
    >
      {/* IMAGE */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-notte-80">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={isGuest ? "Artista bloccato" : stageName}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              isGuest ? "blur-xl scale-110" : ""
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-4xl text-palco/40">
            {isGuest ? "?" : stageName.slice(0, 2)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-notte via-notte/20 to-transparent" />

        {isGuest && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="inline-flex size-14 items-center justify-center rounded-full bg-notte/70 backdrop-blur-sm"
            >
              <Lock className="size-6 text-palco" />
            </span>
          </div>
        )}

        {!isGuest && city && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-notte/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-palco backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-azzurro" />
            {city}
          </span>
        )}

        {!isGuest && (
          <FavoriteToggle
            artist={{ slug, stage_name: stageName, cover_image: coverImage, city }}
            variant="card"
          />
        )}

        {/* Nome sull'immagine in basso */}
        <div className="absolute inset-x-3 bottom-3">
          <h3
            className={`font-display text-xl font-bold leading-tight text-palco drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] ${
              isGuest ? "blur-md select-none" : ""
            }`}
            aria-hidden={isGuest}
          >
            {isGuest ? "Nome artista" : stageName}
          </h3>
          {genres.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-palco/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-palco backdrop-blur-sm"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* INFO */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {isGuest ? (
          <div className="flex items-center justify-between gap-2">
            <span className="narte-label">Categoria</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
              {category ?? "Artista"}
            </span>
          </div>
        ) : (
          <PriceRow priceBand={priceBand} canSeePrice={canSeePrice} />
        )}
        <p className="inline-flex items-center gap-1.5 text-xs text-palco-20">
          <MapPin className="size-3" />
          {isGuest ? "Iscriviti per scoprire" : city || "Italia"}
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
      <span className="narte-label">Range di prezzo</span>
      {canSeePrice ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-azzurro/10 px-2.5 py-1 text-xs font-semibold text-azzurro">
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
          <Lock className="size-3 text-palco-20" />
        </span>
      )}
    </div>
  );
}
