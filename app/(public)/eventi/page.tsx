import Link from "next/link";
import { getPublicEvents } from "@/lib/data/events";
import { EventCard } from "@/components/marketing/EventCard";
import { PageHero } from "@/components/marketing/PageHero";
import { StaggerList, Reveal } from "@/components/animations/Reveal";

const CATEGORIES = [
  { slug: "all", label: "Tutti" },
  { slug: "music", label: "Music" },
  { slug: "clubs", label: "Clubs" },
  { slug: "festivals", label: "Festivals" },
  { slug: "culture", label: "Culture" },
  { slug: "art", label: "Art" },
  { slug: "food", label: "Food & Drink" },
  { slug: "workshops", label: "Workshops" },
  { slug: "comedy", label: "Comedy" },
  { slug: "business", label: "Business" },
];

type When = "upcoming" | "past";
const WHEN_TABS: { v: When; label: string }[] = [
  { v: "upcoming", label: "In arrivo" },
  { v: "past", label: "Passati" },
];

export default async function EventiPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; when?: string }>;
}) {
  const sp = await searchParams;
  const cat = sp?.cat ?? "all";
  // `null` = nessuna scelta esplicita dell'utente: solo in questo caso possiamo
  // ripiegare sui passati se non c'è nulla in arrivo.
  const requested: When | null =
    sp?.when === "past" ? "past" : sp?.when === "upcoming" ? "upcoming" : null;

  let when: When = requested ?? "upcoming";
  // loadEvents restituisce null se la query fallisce: un errore non deve
  // diventare uno "zero eventi in arrivo" che fa scattare il fallback.
  let events = await loadEvents(cat, when);

  if (requested === null && events?.length === 0) {
    const past = await loadEvents(cat, "past");
    if (past && past.length > 0) {
      when = "past";
      events = past;
    }
  }

  function buildHref(next: { cat?: string; when?: When }) {
    const params = new URLSearchParams();
    const c = next.cat ?? cat;
    const w = next.when ?? when;
    if (c && c !== "all") params.set("cat", c);
    // Sempre esplicito: se il default risolto è "past", un link senza `when`
    // riporterebbe di nuovo ai passati e il tab "In arrivo" sarebbe irraggiungibile.
    if (w) params.set("when", w);
    const qs = params.toString();
    return qs ? `/eventi?${qs}` : "/eventi";
  }

  return (
    <>
      <PageHero
        label="cosa succede"
        title="Eventi"
        description={
          <>
            Tutti gli eventi musicali e culturali organizzati da N&rsquo;arte o ai quali
            partecipiamo.
          </>
        }
      />

      {/* SWITCHER + FILTRI + GRID — uniformato su sfondo bianco */}
      <section className="bg-white py-10 text-notte md:py-16">
        <div className="container-narte space-y-8">
          <Reveal>
            <div className="inline-flex items-center gap-1 rounded-full border border-palco-60 bg-palco/70 p-1">
              {WHEN_TABS.map((t) => {
                const active = t.v === when;
                return (
                  <Link
                    key={t.v}
                    href={buildHref({ when: t.v })}
                    className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                      active
                        ? "bg-notte text-palco shadow-sm"
                        : "text-notte/60 hover:text-notte"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </Reveal>

          <Reveal>
            <nav className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = c.slug === cat || (c.slug === "all" && !sp?.cat);
                return (
                  <Link
                    key={c.slug}
                    href={buildHref({ cat: c.slug })}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                      active
                        ? "border-notte bg-notte text-palco"
                        : "border-palco-60 bg-white text-notte/70 hover:border-notte hover:text-notte"
                    }`}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </nav>
          </Reveal>

          <div>
            {!events || events.length === 0 ? (
              <p className="text-notte/60">
                {when === "past"
                  ? "Nessun evento passato in questa categoria."
                  : "Nessun evento in arrivo in questa categoria."}
              </p>
            ) : (
              <StaggerList className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {events.map((e) => (
                  <EventCard key={e.slug} {...e} />
                ))}
              </StaggerList>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * `null` = la query non è andata a buon fine. Distinguerlo da un array vuoto è
 * necessario perché il ripiego automatico sugli eventi passati deve scattare
 * solo su un "davvero non c'è niente in arrivo", non su una lettura fallita.
 * Il contratto è mantenuto da getPublicEvents, che serve anche /collaborazioni.
 */
async function loadEvents(cat: string, when: When) {
  return getPublicEvents({ when, category: cat });
}
