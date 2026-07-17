import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { HomePricing } from "@/components/marketing/HomePricing";

/**
 * Sezione piani della home: vista a card (<HomePricing />) con la scheda Pro
 * evidenziata. Listino e funzioni arrivano da lib/billing/plans.ts — stessa
 * fonte del confronto completo su /prezzi e della dashboard abbonamento.
 */
export function PricingSection() {
  return (
    <section id="piani" className="border-t border-white/10 bg-notte py-20 text-white md:py-28">
      <div className="container-narte">
        <div className="mb-12 flex flex-col items-center text-center md:mb-16">
          <Reveal>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-corallo-light">
              i piani
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl max-w-2xl text-4xl text-white md:text-6xl">
              Scegli il piano migliore per le tue esigenze
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 max-w-xl text-sm text-white/70 md:text-base">
              Dal profilo gratuito agli strumenti Pro e Max per farti trovare, negoziare e
              crescere. Cambi o disdici quando vuoi.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <HomePricing />
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12 flex justify-center">
            <Link
              href="/prezzi"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-azzurro-light transition hover:gap-2.5 hover:text-white"
            >
              Confronta tutte le funzioni dei piani
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
