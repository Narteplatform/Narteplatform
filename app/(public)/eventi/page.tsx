import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/marketing/EventCard";
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
  const when: When = sp?.when === "past" ? "past" : "upcoming";

  let events: Awaited<ReturnType<typeof loadEvents>> = [];
  try {
    events = await loadEvents(cat, when);
  } catch {
    events = [];
  }

  function buildHref(next: { cat?: string; when?: When }) {
    const params = new URLSearchParams();
    const c = next.cat ?? cat;
    const w = next.when ?? when;
    if (c && c !== "all") params.set("cat", c);
    if (w && w !== "upcoming") params.set("when", w);
    const qs = params.toString();
    return qs ? `/eventi?${qs}` : "/eventi";
  }

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-32 pb-16 md:pt-44 md:pb-20">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">cosa succede</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">Eventi</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Tutti gli eventi musicali e culturali organizzati da N&apos;arte o ai quali
              partecipiamo.
            </p>
          </Reveal>
        </div>
      </section>

      {/* TABS IN ARRIVO / PASSATI */}
      <section className="border-b border-border bg-background py-8">
        <div className="container-narte">
          <Reveal>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1">
              {WHEN_TABS.map((t) => {
                const active = t.v === when;
                return (
                  <Link
                    key={t.v}
                    href={buildHref({ when: t.v })}
                    className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                      active
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CATEGORY FILTERS + GRID */}
      <section className="bg-muted py-16 md:py-20">
        <div className="container-narte">
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
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground"
                    }`}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </nav>
          </Reveal>

          <div className="mt-10">
            {events.length === 0 ? (
              <p className="text-muted-foreground">
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

async function loadEvents(cat: string, when: When) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase
    .from("events")
    .select("slug, title, city, date, price, cover_image, cover_image_home");
  if (cat !== "all") q = q.eq("category", cat as never);
  if (when === "past") {
    q = q.lt("date", nowIso).order("date", { ascending: false });
  } else {
    q = q.gte("date", nowIso).order("date", { ascending: true });
  }
  const { data } = await q;
  return (data ?? []).map((e) => ({
    slug: e.slug,
    title: e.title,
    city: e.city,
    date: e.date,
    price: e.price,
    coverImage: e.cover_image,
    coverImageHome: e.cover_image_home,
  }));
}
