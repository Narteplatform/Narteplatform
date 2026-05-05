import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/marketing/EventCard";
import { StaggerList } from "@/components/animations/Reveal";
import Link from "next/link";

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

export default async function EventiPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const cat = sp?.cat ?? "all";

  let events: Awaited<ReturnType<typeof loadEvents>> = [];
  try {
    events = await loadEvents(cat);
  } catch {
    events = [];
  }

  return (
    <div className="container-narte py-12">
      <h1 className="display-xl text-5xl md:text-7xl">Eventi</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Tutti gli eventi musicali e culturali organizzati da N&apos;arte o ai quali partecipiamo.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c.slug === cat || (c.slug === "all" && !sp?.cat);
          return (
            <Link
              key={c.slug}
              href={c.slug === "all" ? "/eventi" : `/eventi?cat=${c.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10">
        {events.length === 0 ? (
          <p className="text-muted-foreground">Nessun evento in questa categoria.</p>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {events.map((e) => (
              <EventCard key={e.slug} {...e} />
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}

async function loadEvents(cat: string) {
  const supabase = await createClient();
  let q = supabase
    .from("events")
    .select("slug, title, city, date, price, cover_image, cover_image_home")
    .order("date", { ascending: true });
  if (cat !== "all") q = q.eq("category", cat as never);
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
