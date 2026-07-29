import { Quote } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { PhotoWithFallback } from "@/components/marketing/PhotoWithFallback";
import { TESTIMONIALS } from "@/lib/content/artist-landing";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Storie di artisti.
 *
 * ⚠️ I contenuti in lib/content/artist-landing.ts sono segnaposto dichiarati:
 * vanno sostituiti con citazioni e foto reali del roster prima di pubblicare.
 * Finché le foto in public/testimonials/ non esistono, ogni card mostra le
 * iniziali al posto del volto.
 */
export function ArtistTestimonials() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <div className="max-w-2xl">
          <Reveal>
            <p className="accent-label mb-3">storie</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
              Chi ha smesso di aspettare la chiamata.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-5 text-pretty text-base text-notte/70 md:text-lg">
              Tre artisti che stanno usando la piattaforma, e cosa è cambiato
              davvero nella loro agenda.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3 lg:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={`${t.name}-${i}`} delay={0.1 * (i + 1)}>
              <figure className="flex h-full flex-col rounded-2xl border border-palco-60 bg-white p-6 shadow-[var(--shadow-sm)] md:p-7">
                <Quote
                  aria-hidden="true"
                  className="size-7 shrink-0 text-azzurro/25"
                />
                <blockquote className="mt-4 flex-1 text-pretty text-base leading-relaxed text-notte/85">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-palco-60 pt-5">
                  <span className="relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-azzurro-subtle">
                    <PhotoWithFallback
                      src={t.photo}
                      alt={`${t.name}, ${t.role}`}
                      className="size-full object-cover"
                      fallback={
                        <span
                          aria-hidden="true"
                          className="font-display text-sm font-bold text-azzurro"
                        >
                          {initials(t.name)}
                        </span>
                      }
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-bold text-notte">
                      {t.name}
                    </span>
                    <span className="block truncate text-xs text-notte/60">
                      {t.role} · {t.city}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
