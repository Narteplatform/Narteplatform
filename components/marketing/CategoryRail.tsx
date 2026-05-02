import Link from "next/link";
import { Reveal } from "@/components/animations/Reveal";

const CATEGORIES = [
  { slug: "all", label: "ALL", count: 82 },
  { slug: "music", label: "MUSIC" },
  { slug: "clubs", label: "CLUBS" },
  { slug: "festivals", label: "FESTIVALS" },
  { slug: "dating", label: "DATING" },
  { slug: "culture", label: "CULTURE" },
  { slug: "art", label: "ART" },
  { slug: "food", label: "FOOD & DRINK" },
  { slug: "workshops", label: "WORKSHOPS" },
  { slug: "comedy", label: "COMEDY" },
  { slug: "business", label: "BUSINESS" },
];

export function CategoryRail() {
  return (
    <section className="container-narte py-12">
      <Reveal>
        <p className="accent-label mb-4">popular categories</p>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="flex flex-wrap gap-x-3 gap-y-2 font-display text-2xl uppercase text-muted-foreground md:text-4xl">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              href={c.slug === "all" ? "/eventi" : `/eventi?cat=${c.slug}`}
              className="transition-colors hover:text-foreground"
            >
              {c.label}
              {c.count != null ? `(${c.count})` : null}
              {i < CATEGORIES.length - 1 ? "," : ""}
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
