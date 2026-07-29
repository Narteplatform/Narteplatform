import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/animations/Reveal";
import { HomePricing } from "@/components/marketing/HomePricing";

/**
 * Sezione piani: vista a card (<HomePricing />) con la scheda Pro evidenziata.
 * Listino e funzioni arrivano da lib/billing/plans.ts — stessa fonte del
 * confronto completo su /prezzi e della dashboard abbonamento.
 *
 * Parametrizzata invece che duplicata: due copie significano due listini che
 * divergono alla prima modifica di prezzo (vedi l'avvertenza in plans.ts). I
 * default riproducono la versione storica della home.
 */
export function PricingSection({
  id = "piani",
  label = "i piani",
  title = "Scegli il piano migliore per le tue esigenze",
  description = (
    <>
      Dal profilo gratuito agli strumenti Pro e Max per farti trovare, negoziare
      e crescere. Cambi o disdici quando vuoi.
    </>
  ),
  ctaHref,
  className,
}: {
  id?: string;
  label?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Bersaglio dei bottoni delle tre schede. Vedi HomePricing. */
  ctaHref?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`border-t border-white/10 bg-notte py-20 text-white md:py-28 ${className ?? ""}`}
    >
      <div className="container-narte">
        <div className="mb-12 flex flex-col items-center text-center md:mb-16">
          <Reveal>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-corallo-light">
              {label}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl max-w-2xl text-balance text-4xl text-white md:text-6xl">
              {title}
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 max-w-xl text-pretty text-sm text-white/70 md:text-base">
              {description}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <HomePricing ctaHref={ctaHref} />
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12 flex justify-center">
            <Link
              href="/prezzi"
              className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-azzurro-light transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro-light focus-visible:ring-offset-2 focus-visible:ring-offset-notte"
            >
              Confronta tutte le funzioni dei piani
              <ArrowRight className="size-4 transition-transform duration-220 ease-[var(--ease-out)] group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
