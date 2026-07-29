import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";
import { getPublicEvents } from "@/lib/data/events";
import { formatEventDate } from "@/lib/utils";
import { NARTE_EVENTS, NARTE_SINCE } from "@/lib/content/stats";
import type { EventCardProps } from "@/components/marketing/EventCard";

/** Destinazione unica: le anteprime sono una porta sull'archivio, non scorciatoie ai singoli eventi. */
const ARCHIVE_HREF = "/eventi?when=past";
const PREVIEW_COUNT = 4;

/**
 * Prova sociale per chi organizza: le serate che abbiamo già fatto.
 *
 * Sostituisce la vecchia sezione "in arrivo", che restava vuota ogni volta che
 * il calendario non aveva date future — e una fascia vuota in home dice
 * l'esatto contrario di quello che questa pagina deve dire.
 *
 * Le quattro anteprime portano TUTTE all'archivio, non al proprio evento: per
 * questo hanno l'etichetta in hover e un aria-label che dichiara dove si va,
 * altrimenti il titolo sulla card prometterebbe una destinazione diversa.
 */
export async function PastEventsSection() {
  const events = await getPublicEvents({ when: "past", limit: PREVIEW_COUNT });

  // `null` = query fallita, `[]` = archivio vuoto. In entrambi i casi una
  // sezione che parla di ciò che abbiamo fatto senza mostrarne uno è peggio
  // che non averla.
  if (!events || events.length === 0) return null;

  return (
    <section className="border-t border-border py-20 md:py-28">
      <div className="container-narte grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16">
        {/* COPY */}
        <div>
          <Reveal>
            <p className="accent-label mb-3">quello che abbiamo fatto</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl md:text-6xl">
              Non è la prima volta che lo facciamo.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-5 max-w-md text-pretty text-base text-muted-foreground md:text-lg">
              Piazza del Plebiscito, la Piazzetta di Capri, l&rsquo;Edenlandia.{" "}
              {NARTE_EVENTS} serate montate da noi dal {NARTE_SINCE}, con gli
              stessi artisti che trovi qui sopra.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-8">
              <Button asChild variant="default" size="lg">
                <Link href={ARCHIVE_HREF}>Guarda gli eventi passati</Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* ANTEPRIME. La larghezza è limitata da lg in su: a piena colonna due
            righe di locandine 3:4 diventano alte il doppio del testo accanto e
            lasciano trecento pixel di vuoto sopra e sotto il titolo. */}
        <Reveal delay={0.15} className="lg:w-[27rem] lg:justify-self-end">
          <ul className="grid grid-cols-2 gap-4 md:gap-5">
            {events.map((e) => (
              <li key={e.slug}>
                <ArchiveTile event={e} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function ArchiveTile({ event }: { event: EventCardProps }) {
  const { title, city, date, coverImage } = event;
  return (
    <Link
      href={ARCHIVE_HREF}
      // Il testo visibile è il titolo dell'evento, ma il link porta
      // all'archivio: senza dirlo qui, uno screen reader annuncerebbe quattro
      // link con nomi diversi e la stessa destinazione, senza spiegazione.
      aria-label={`${title} — vai all'archivio degli eventi passati`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl text-muted-foreground">
            {title.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* L'etichetta compare in hover e in focus da tastiera: è il segnale
            che tutte le anteprime portano nello stesso posto. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-end bg-gradient-to-t from-notte via-notte/40 to-transparent p-3 opacity-0 transition-opacity duration-220 ease-[var(--ease-out)] group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-palco">
            Vedi l&rsquo;archivio
            <ArrowRight className="size-3.5 transition-transform duration-220 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-xs uppercase tracking-wide text-muted-foreground">
        {formatEventDate(date)}
      </p>
      <p className="mt-0.5 line-clamp-2 text-balance font-display text-sm leading-tight transition-colors group-hover:text-accent md:text-base">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{city}</p>
    </Link>
  );
}
