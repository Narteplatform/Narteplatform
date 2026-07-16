import Link from "next/link";
import { EventCard, type EventCardProps } from "./EventCard";
import { StaggerList } from "@/components/animations/Reveal";

export function EventGrid({
  title,
  events,
  seeAllHref,
}: {
  title: string;
  events: EventCardProps[];
  seeAllHref?: string;
}) {
  return (
    <section className="container-narte py-12">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="font-display text-3xl md:text-5xl">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-sm underline-offset-4 hover:underline">
            see all
          </Link>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun evento al momento.</p>
      ) : (
        <StaggerList className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {events.map((e) => (
            <EventCard key={e.slug} {...e} />
          ))}
        </StaggerList>
      )}
    </section>
  );
}
