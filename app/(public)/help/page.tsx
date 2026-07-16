import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { CategoryIcon } from "@/lib/help/icons";
import { HelpSearch } from "@/components/help/HelpSearch";
import { HELP_CATEGORIES, popularArticles } from "@/lib/help/content";

export const metadata: Metadata = {
  title: "Centro Assistenza — N'arte",
  description:
    "Risposte, guide e tutorial su N'arte: candidatura artista, booking, consulenza, gestione profilo, pagamenti.",
  alternates: { canonical: "/help" },
};

export default function HelpHomePage() {
  const popular = popularArticles(6);
  const index = HELP_CATEGORIES.flatMap((category) =>
    category.articles.map((article) => ({ category, article }))
  );

  return (
    <div className="bg-background pb-24">
      <PageHero
        label="aiuto"
        title="Aiuto"
        description={
          <>
            Guide, tutorial e risposte rapide su N&apos;arte. Cerca un argomento o sfoglia
            le categorie qui sotto.
          </>
        }
      >
        <HelpSearch index={index} />
      </PageHero>

      {/* CATEGORIES */}
      <section className="container-narte mt-20">
        <Reveal>
          <h2 className="font-display text-2xl md:text-3xl">
            Sfoglia per categoria
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {HELP_CATEGORIES.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.04}>
              <Link
                href={`/help/${c.slug}`}
                className="card-lift group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition hover:border-accent"
              >
                <div className="inline-flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <CategoryIcon name={c.icon} className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg leading-tight group-hover:text-accent">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {c.description}
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-accent">
                  {c.articles.length} articoli
                  <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* POPULAR */}
      <section className="container-narte mt-24">
        <Reveal>
          <h2 className="font-display text-2xl md:text-3xl">
            Articoli più letti
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {popular.map((p, i) => (
            <Reveal key={`${p.category.slug}/${p.article.slug}`} delay={i * 0.04}>
              <Link
                href={`/help/${p.category.slug}/${p.article.slug}`}
                className="group block rounded-xl border border-border bg-background p-5 transition hover:border-accent"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  {p.category.title}
                </p>
                <h3 className="mt-2 font-display text-base leading-tight group-hover:text-accent">
                  {p.article.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {p.article.excerpt}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA CONTACT */}
      <section className="container-narte mt-24">
        <Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-7">
              <div className="inline-flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <MessageCircle className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-xl">
                Non trovi quello che cerchi?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Scrivici e ti rispondiamo entro 24 ore.
              </p>
              <Link
                href="/contatti"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-accent hover:opacity-80"
              >
                Contattaci <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-7">
              <div className="inline-flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Phone className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-xl">
                Vuoi parlare con un consulente?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Prenota una chiamata gratuita di 30 minuti con il team N&apos;arte.
              </p>
              <Link
                href="/help/consulenza/prenotare-chiamata"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-accent hover:opacity-80"
              >
                Scopri come <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
