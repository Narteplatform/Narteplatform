import Link from "next/link";
import { Lock, MapPin, Music2 } from "lucide-react";
import type { ArtistTier, PriceBand } from "@/lib/supabase/types";
import { FavoriteToggle } from "@/components/marketing/FavoriteToggle";
import { ArtistTierBadges } from "@/components/marketing/ArtistBadges";
import { StarRating } from "@/components/feedback/StarRating";

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
  /** Assenti nella variante anonima (`isGuest`): agli ospiti non arriva nulla di identificativo. */
  slug?: string;
  stageName?: string;
  city?: string | null;
  coverImage?: string | null;
  genres?: string[];
  /** Usati solo dalla variante anonima, che li mostra al posto del nome. */
  instruments?: string[];
  priceBand?: PriceBand;
  canSeePrice?: boolean;
  /**
   * Variante anonima, per chi non ha una sessione. La scheda mostra solo
   * genere, strumenti e piano; nessun nome, slug, città, copertina, prezzo o
   * voto, e il link porta al login. Chi chiama NON deve nemmeno passare i dati
   * identificativi: la sicurezza sta nel fatto che non arrivano al componente,
   * non nel fatto che qui vengano nascosti.
   */
  isGuest?: boolean;
  category?: string | null;
  /**
   * Piano dell'artista: decide i badge "Artista Pro" e "TOP Artist".
   * Chi non lo passa non mostra badge — è il caso delle superfici che non
   * selezionano `tier` dal DB.
   */
  tier?: ArtistTier | null;
  /**
   * Id dell'artista, necessario per salvarlo nei preferiti di un utente
   * autenticato: la riga a database è (user_id, artist_id).
   */
  artistId?: string;
  /**
   * Media dei voti e numero di recensioni. Assente o a zero: la riga non
   * compare affatto.
   */
  rating?: { average: number; count: number } | null;
};

export function ArtistCard(props: ArtistCardProps) {
  return props.isGuest ? <AnonymousArtistCard {...props} /> : <FullArtistCard {...props} />;
}

/** Scheda per gli ospiti: riquadro grafico neutro, niente dati identificativi. */
function AnonymousArtistCard({
  genres = [],
  instruments = [],
  category = null,
  tier = null,
}: ArtistCardProps) {
  return (
    <Link
      href="/login?next=/artisti"
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)] transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro focus-visible:ring-offset-2"
      aria-label="Accedi o registrati per scoprire chi è questo artista"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-notte-80">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_55%)]"
        />
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex size-20 items-center justify-center rounded-full border border-palco/20 bg-palco/5">
            <Music2 className="size-9 text-palco/60" />
          </span>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-notte via-notte/20 to-transparent" />

        <ArtistTierBadges
          tier={tier}
          compact
          onImage
          className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)]"
        />

        <div className="absolute inset-x-3 bottom-3">
          <h3 className="font-display text-xl font-bold leading-tight text-palco">Artista</h3>
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

      <div className="flex flex-col gap-2.5 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="narte-label">Categoria</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            {category ?? "Artista"}
          </span>
        </div>
        {instruments.length > 0 && (
          <p className="text-xs text-palco-20">{instruments.slice(0, 3).join(" · ")}</p>
        )}
        <p className="inline-flex items-center gap-1.5 text-xs text-palco-20">
          <Lock className="size-3" aria-hidden="true" />
          Registrati gratis per scoprire chi è
        </p>
      </div>
    </Link>
  );
}

function FullArtistCard({
  slug = "",
  stageName = "",
  city = null,
  coverImage = null,
  genres = [],
  priceBand = "standard",
  canSeePrice = false,
  tier = null,
  artistId,
  rating,
}: ArtistCardProps) {
  const href = `/artisti/${slug}`;
  return (
    <Link
      href={href}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)] transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
      aria-label={stageName}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-notte-80">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={stageName}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-4xl text-palco/40">
            {stageName.slice(0, 2)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-notte via-notte/20 to-transparent" />

        {/* Badge di piano in alto a sinistra: il lato destro è occupato dal
            cuore dei preferiti. */}
        <ArtistTierBadges
          tier={tier}
          compact
          onImage
          className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-4rem)]"
        />

        <FavoriteToggle
          artist={{
            id: artistId,
            slug,
            stage_name: stageName,
            cover_image: coverImage,
            city,
            tier,
          }}
          variant="card"
        />

        <div className="absolute inset-x-3 bottom-3">
          <h3 className="font-display text-xl font-bold leading-tight text-palco drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {stageName}
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

      <div className="flex flex-col gap-2.5 px-4 py-4">
        <PriceRow priceBand={priceBand} canSeePrice={canSeePrice} />
        <p className="inline-flex items-center gap-1.5 text-xs text-palco-20">
          <MapPin className="size-3" />
          {city || "Italia"}
        </p>

        {rating && rating.count > 0 && (
          <StarRating
            value={rating.average}
            count={rating.count}
            size="sm"
            showValue
            className="text-palco-20"
          />
        )}
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
