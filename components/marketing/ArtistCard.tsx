import Link from "next/link";

export type ArtistCardProps = {
  slug: string;
  stageName: string;
  city: string | null;
  coverImage: string | null;
};

export function ArtistCard({ slug, stageName, city, coverImage }: ArtistCardProps) {
  return (
    <Link
      href={`/artisti/${slug}`}
      className="group relative block aspect-[3/4] w-full overflow-hidden bg-foreground"
    >
      {coverImage ? (
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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground via-foreground/30 to-transparent" />

      {city ? (
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-background">
          <span className="size-2 rounded-full bg-background/80" />
          {city}
        </span>
      ) : null}

      <h3 className="absolute bottom-4 left-4 right-4 font-display text-2xl uppercase leading-none text-background">
        {stageName}
      </h3>
    </Link>
  );
}
