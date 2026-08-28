import { getSiteUrl } from "@/lib/site-url";

/**
 * Dati strutturati per i motori di ricerca (schema.org).
 *
 * Prima esistevano in due punti soli, scritti a mano: l'`Article` del blog e le
 * FAQ della pagina candidatura. Mancavano `Organization`, `Event` e
 * `MusicGroup` — proprio i tre tipi che Google usa per costruire i risultati
 * arricchiti, cioè quelli con data, luogo e immagine in evidenza. Per un sito
 * di eventi è la differenza fra comparire come una riga di testo e comparire
 * con la locandina e la data.
 *
 * Il componente è presentazionale e sincrono: si può usare tanto nei Server
 * Component quanto nei Client Component.
 */

type Json = Record<string, unknown>;

/** Rende assoluto un percorso relativo: schema.org non accetta URL relativi. */
function abs(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Toglie le chiavi vuote: un campo schema.org a `undefined` è peggio che assente. */
function clean(obj: Json): Json {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      // Il contenuto è costruito da noi a partire da dati del nostro database,
      // mai da input dell'utente non filtrato.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Costruttori                                                         */
/* ------------------------------------------------------------------ */

export function organizationJsonLd(): Json {
  const base = getSiteUrl().replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "N'arte",
    url: base,
    logo: `${base}/logo-narte.png`,
    description:
      "Piattaforma italiana che mette in contatto artisti emergenti, organizzatori di eventi musicali e pubblico.",
    areaServed: "IT",
    sameAs: [
      "https://instagram.com/narte.official",
      "https://facebook.com/narteofficiall",
    ],
  };
}

export function eventJsonLd(e: {
  title: string;
  slug: string;
  description?: string | null;
  date: string;
  endAt?: string | null;
  city?: string | null;
  venue?: string | null;
  coverImage?: string | null;
  ticketUrl?: string | null;
  price?: number | string | null;
}): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: e.title,
    url: abs(`/eventi/${e.slug}`),
    startDate: e.date,
    endDate: e.endAt ?? undefined,
    description: e.description ?? undefined,
    image: abs(e.coverImage),
    // `MusicEvent` senza `location` non produce risultato arricchito: se manca
    // il venue si usa almeno la città.
    location: clean({
      "@type": "Place",
      name: e.venue ?? e.city ?? undefined,
      address: clean({
        "@type": "PostalAddress",
        addressLocality: e.city ?? undefined,
        addressCountry: "IT",
      }),
    }),
    organizer: { "@type": "Organization", name: "N'arte", url: getSiteUrl() },
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    offers: e.ticketUrl
      ? clean({
          "@type": "Offer",
          url: e.ticketUrl,
          price: e.price ?? undefined,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        })
      : undefined,
  });
}

export function musicGroupJsonLd(a: {
  stageName: string;
  slug: string;
  bio?: string | null;
  genre?: string | null;
  city?: string | null;
  coverImage?: string | null;
  socialLinks?: Record<string, string | null | undefined> | null;
  rating?: { value: number; count: number } | null;
}): Json {
  const sameAs = Object.values(a.socialLinks ?? {}).filter(
    (v): v is string => typeof v === "string" && v.startsWith("http")
  );

  return clean({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: a.stageName,
    url: abs(`/artisti/${a.slug}`),
    description: a.bio ?? undefined,
    genre: a.genre ?? undefined,
    image: abs(a.coverImage),
    address: a.city
      ? clean({ "@type": "PostalAddress", addressLocality: a.city, addressCountry: "IT" })
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    // Google rifiuta `aggregateRating` con zero recensioni: si include solo
    // quando ce n'è almeno una davvero.
    aggregateRating:
      a.rating && a.rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: a.rating.value,
            reviewCount: a.rating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  });
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}
