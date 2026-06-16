import Link from "next/link";
import { formatEventDate, formatPrice } from "@/lib/utils";

export type EventCardProps = {
  slug: string;
  title: string;
  city: string;
  date: string | Date;
  price: number | null;
  coverImage: string | null;
};

export function EventCard({
  slug,
  title,
  city,
  date,
  price,
  coverImage,
}: EventCardProps) {
  const cardImg = coverImage;
  return (
    <Link
      href={`/eventi/${slug}`}
      className="group block transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted">
        {cardImg ? (
          <img
            src={cardImg}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl text-muted-foreground">
            {title.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-wide">
        <span>{formatEventDate(date)}</span>
        <span className="text-muted-foreground">{formatPrice(price)}</span>
      </div>
      <h3 className="mt-1 font-display text-lg uppercase">{title}</h3>
      <p className="text-sm text-muted-foreground">{city}</p>
    </Link>
  );
}
