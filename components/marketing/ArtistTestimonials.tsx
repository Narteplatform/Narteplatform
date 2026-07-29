import { Quote } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
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
 * Se una foto manca, la card mostra le iniziali al posto del volto.
 */
export function ArtistTestimonials() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <SectionHeading
          label="storie"
          title="Chi ha smesso di aspettare la chiamata."
          description="Tre artisti che stanno usando la piattaforma, e cosa è cambiato davvero nella loro agenda."
        />

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:mt-16 md:grid-cols-3 lg:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={`${t.name}-${i}`} delay={0.1 * (i + 1)}>
              <figure className="flex h-full flex-col items-center rounded-2xl border border-palco-60 bg-white p-6 text-center shadow-[var(--shadow-sm)] md:p-7">
                <Quote aria-hidden="true" className="size-7 shrink-0 text-azzurro/25" />
                <blockquote className="mt-4 flex-1 text-pretty text-base leading-relaxed text-notte/85">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 flex w-full flex-col items-center border-t border-palco-60 pt-5">
                  <span className="relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-azzurro-subtle">
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
                  <span className="mt-3 block font-display text-sm font-bold text-notte">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-notte/60">
                    {t.role} · {t.city}
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
