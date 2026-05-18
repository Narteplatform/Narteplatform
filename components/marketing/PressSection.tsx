import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { PRESS_MENTIONS } from "@/lib/content/press";

export function PressSection() {
  if (PRESS_MENTIONS.length === 0) return null;

  return (
    <section className="border-t border-border bg-background py-20 md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">stampa</p>
        </Reveal>
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl text-4xl md:text-6xl">Dicono di noi</h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              Le testate che hanno raccontato il progetto, i numeri e gli artisti N&apos;arte.
            </p>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.25}>
        <div className="container-narte px-0 md:px-6">
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 md:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {PRESS_MENTIONS.map((p) => (
              <article
                key={p.id}
                className="group relative flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] sm:w-[360px]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-notte-80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-notte via-notte/20 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-notte/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-palco backdrop-blur-sm">
                    {p.source}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-lg uppercase leading-tight md:text-xl">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.excerpt}</p>
                  <a
                    href={p.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:gap-2.5"
                  >
                    Approfondisci <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
