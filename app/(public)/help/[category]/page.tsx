import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, ChevronRight, FileText, Hourglass } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { CategoryIcon } from "@/lib/help/icons";
import { HelpSearch } from "@/components/help/HelpSearch";
import { HELP_CATEGORIES, findCategory } from "@/lib/help/content";

type Params = Promise<{ category: string }>;

export async function generateStaticParams() {
  return HELP_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category } = await params;
  const c = findCategory(category);
  if (!c) return { title: "Categoria non trovata — N'arte Help" };
  return {
    title: `${c.title} — Centro Assistenza N'arte`,
    description: c.description,
    alternates: { canonical: `/help/${c.slug}` },
  };
}

export default async function HelpCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  const c = findCategory(category);
  if (!c) notFound();

  const index = HELP_CATEGORIES.flatMap((cat) =>
    cat.articles.map((article) => ({ category: cat, article }))
  );

  return (
    <div className="bg-background pb-24">
      {/* HEADER */}
      <section className="border-b border-border bg-muted/40 pt-32 pb-12 md:pt-36">
        <div className="container-narte">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            <Link href="/help" className="hover:text-accent">
              Centro Assistenza
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{c.title}</span>
          </nav>

          <Reveal>
            <div className="flex items-start gap-5">
              <div className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <CategoryIcon name={c.icon} className="size-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl uppercase leading-tight tracking-tight md:text-5xl">
                  {c.title}
                </h1>
                <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                  {c.description}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {c.articles.length} articoli
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 max-w-xl">
              <HelpSearch index={index} size="sm" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ARTICLES + SIDEBAR */}
      <section className="container-narte mt-12 grid gap-12 lg:grid-cols-[1fr_280px]">
        <div>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {c.articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/help/${c.slug}/${a.slug}`}
                  className="group flex items-start gap-4 px-6 py-5 transition hover:bg-muted/40"
                >
                  <div className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent">
                    {a.placeholder ? (
                      <Hourglass className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base uppercase tracking-tight group-hover:text-accent">
                      {a.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {a.excerpt}
                    </p>
                    {a.placeholder && (
                      <span className="mt-2 inline-block rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        In preparazione
                      </span>
                    )}
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Altre categorie
            </p>
            <ul className="space-y-1.5">
              {HELP_CATEGORIES.filter((x) => x.slug !== c.slug).map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/help/${x.slug}`}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <CategoryIcon name={x.icon} className="size-4 text-accent" />
                    <span className="flex-1">{x.title}</span>
                    <ArrowRight className="size-3 opacity-0 transition group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Servono altre risposte?
            </p>
            <Link
              href="/contatti"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-accent hover:opacity-80"
            >
              Contattaci <ArrowRight className="size-4" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
