import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";
import { getPublicEvents } from "@/lib/data/events";
import { formatEventDate } from "@/lib/utils";
import type { EventCardProps } from "@/components/marketing/EventCard";

/** Destinazione unica: le anteprime sono una porta sull'archivio, non scorciatoie ai singoli eventi. */
const ARCHIVE_HREF = "/eventi?when=past";
const PREVIEW_COUNT = 2;

/**
 * Prova sociale per chi organizza: le serate che abbiamo già fatto.
 *
 * Sostituisce la vecchia sezione "in arrivo", che restava vuota ogni volta che
 * il calendario non aveva date future — e una fascia vuota in home dice
 * l'esatto contrario di quello che questa pagina deve dire.
 *
 * Due locandine e non quattro: a parità di spazio si vedono più grandi, e la
 * colonna delle immagini finisce per specchiare la colonna del testo invece di
 * sovrastarla. Entrambe portano all'archivio, non al proprio evento: per questo
 * hanno l'etichetta in hover e un aria-label che dichiara dove si va, altrimenti
 * il titolo sulla card prometterebbe una destinazione diversa.
 */
export async function PastEventsSection() {
  const events = await getPublicEvents({ when: "past", limit: PREVIEW_COUNT });

  // `null` = query fallita, `[]` = archivio vuoto. In entrambi i casi una
  // sezione che parla di ciò che abbiamo fatto senza mostrarne uno è peggio
  // che non averla.
  if (!events || events.length === 0) return null;

  return (
    <section className="border-t border-border py-20 md:py-28">
      {/* Due colonne di uguale larghezza: il blocco delle locandine specchia
          quello del testo invece di sbilanciare la sezione verso destra. */}
      <div className="container-narte grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* COPY. Centrata finché le due colonne sono impilate: qui la griglia
            si apre a `lg`, non a `md`, quindi il ritorno all'allineamento a
            sinistra segue quel breakpoint e non quello delle altre sezioni. */}
        <div className="text-center lg:text-left">
          <Reveal>
            <p className="accent-label mb-3">quello che abbiamo fatto</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl md:text-6xl">
              Alcuni dei successi targati N&rsquo;arte
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-5 max-w-md text-pretty text-base text-muted-foreground md:text-lg lg:mx-0">
              Immergiti nel mondo N&rsquo;arte e scopri gli eventi realizzati con
              successo.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-8">
              <Button asChild variant="default" size="lg">
                <Link href={ARCHIVE_HREF}>Scopri gli eventi passati</Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* ANTEPRIME. Nessun vincolo di larghezza: con due sole locandine su
            una riga l'altezza resta vicina a quella del testo accanto, e la
            colonna può occupare tutta la sua metà. Era il problema che la
            vecchia griglia 2×2 doveva contenere con un max-width fisso. */}
        <Reveal delay={0.15}>
          <ul className="grid grid-cols-2 gap-5 md:gap-6">
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

      {/* Tipografia di un gradino più alta della griglia 2×2 precedente: con
          locandine grandi il doppio, il testo di prima sembrerebbe una didascalia. */}
      <p className="mt-3 text-sm uppercase tracking-wide text-muted-foreground">
        {formatEventDate(date)}
      </p>
      <p className="mt-1 line-clamp-2 text-balance font-display text-base leading-tight transition-colors group-hover:text-accent md:text-lg">
        {title}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{city}</p>
    </Link>
  );
}
