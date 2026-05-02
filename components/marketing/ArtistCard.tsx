import Link from "next/link";

export type ArtistCardProps = {
  slug: string;
  stageName: string;
  city: string | null;
  coverImage: string | null;
  genres?: string[];
};

export function ArtistCard({ slug, stageName, city, coverImage, genres = [] }: ArtistCardProps) {
  return (
    <Link
      href={`/artisti/${slug}`}
      className="group relative block aspect-[3/4] w-full overflow-hidden bg-foreground"
    >
      {coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt={stageName}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-display text-4xl uppercase text-background/40">
          {stageName.slice(0, 2)}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />

      {city ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-background">
          <span className="size-2 rounded-full bg-background/80" />
          {city}
        </span>
      ) : null}

      <div className="absolute inset-x-3 bottom-3 space-y-2">
        {genres.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {genres.slice(0, 3).map((g) => (
              <li
                key={g}
                className="rounded-full border border-background/30 bg-background/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-background backdrop-blur-sm"
              >
                {g}
              </li>
            ))}
          </ul>
        )}
        <h3 className="font-display text-2xl uppercase leading-none text-background">
          {stageName}
        </h3>
      </div>
    </Link>
  );
}
