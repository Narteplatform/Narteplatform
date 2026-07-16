import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ChevronRight, Clock, Mail } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { CategoryIcon } from "@/lib/help/icons";
import {
  HELP_CATEGORIES,
  findArticle,
  relatedArticles,
} from "@/lib/help/content";

type Params = Promise<{ category: string; article: string }>;

export async function generateStaticParams() {
  return HELP_CATEGORIES.flatMap((c) =>
    c.articles.map((a) => ({ category: c.slug, article: a.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category, article } = await params;
  const found = findArticle(category, article);
  if (!found) return { title: "Articolo non trovato — N'arte Help" };
  return {
    title: `${found.article.title} — N'arte Help`,
    description: found.article.excerpt,
    alternates: { canonical: `/help/${category}/${article}` },
  };
}

export default async function HelpArticlePage({ params }: { params: Params }) {
  const { category, article } = await params;
  const found = findArticle(category, article);
  if (!found) notFound();
  const { category: cat, article: art } = found;
  const related = relatedArticles(cat.slug, art.slug, 4);

  return (
    <article className="bg-background pb-24 pt-28">
      <div className="container-narte grid gap-12 lg:grid-cols-[1fr_280px]">
        {/* MAIN */}
        <div className="min-w-0">
          <Reveal>
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              <Link href="/help" className="hover:text-accent">
                Centro Assistenza
              </Link>
              <ChevronRight className="size-3" />
              <Link href={`/help/${cat.slug}`} className="hover:text-accent">
                {cat.title}
              </Link>
              <ChevronRight className="size-3" />
              <span className="truncate text-foreground">{art.title}</span>
            </nav>

            <h1 className="mt-8 font-display text-3xl leading-tight md:text-5xl">
              {art.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
              {art.excerpt}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CategoryIcon name={cat.icon} className="size-3.5 text-accent" />
                {cat.title}
              </span>
              {art.updatedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Aggiornato il{" "}
                  {new Date(art.updatedAt).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </Reveal>

          {art.placeholder && (
            <Reveal delay={0.05}>
              <div className="mt-8 rounded-xl border border-accent/40 bg-accent/5 p-5 text-sm">
                <p className="font-semibold uppercase tracking-wider text-accent">
                  Articolo in preparazione
                </p>
                <p className="mt-2 text-muted-foreground">
                  Stiamo lavorando per pubblicare questa guida a breve. Nel frattempo,
                  consulta gli altri articoli della categoria o{" "}
                  <Link href="/contatti" className="text-accent underline">
                    contattaci
                  </Link>{" "}
                  per una risposta diretta.
                </p>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.08}>
            <div
              className="blog-prose mt-10"
              dangerouslySetInnerHTML={{ __html: art.content }}
            />
          </Reveal>

          {/* Feedback + back */}
          <Reveal delay={0.15}>
            <div className="mt-16 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/help/${cat.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-accent"
              >
                <ArrowLeft className="size-4" /> Torna a {cat.title}
              </Link>
              <Link
                href="/contatti"
                className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-accent hover:opacity-80"
              >
                <Mail className="size-4" /> Hai altre domande? Scrivici
              </Link>
            </div>
          </Reveal>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {related.length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Articoli correlati
              </p>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/help/${cat.slug}/${r.slug}`}
                      className="group block rounded-lg border border-border bg-card p-3 transition hover:border-accent"
                    >
                      <p className="font-display text-sm leading-tight group-hover:text-accent">
                        {r.title}
                      </p>
                      {r.placeholder && (
                        <span className="mt-1 inline-block text-[10px] uppercase tracking-wider text-muted-foreground">
                          In preparazione
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Tutte le categorie
            </p>
            <ul className="space-y-1.5">
              {HELP_CATEGORIES.map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/help/${x.slug}`}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      x.slug === cat.slug
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <CategoryIcon name={x.icon} className="size-4 text-accent" />
                    <span className="flex-1">{x.title}</span>
                    <ArrowRight className="size-3 opacity-0 transition group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}
