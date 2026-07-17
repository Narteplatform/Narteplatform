import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { PlanComparison } from "@/components/billing/PlanComparison";

/**
 * Sezione piani della home: riusa il comparatore condiviso <PlanComparison> in
 * modalità pubblica (i CTA delle card portano alla candidatura). Coerente con
 * /prezzi e con la dashboard abbonamento — una sola fonte di listino.
 */
export function PricingSection() {
  return (
    <section id="piani" className="border-t border-palco-60 bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">i piani</p>
        </Reveal>
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl max-w-2xl text-4xl text-notte md:text-6xl">
              Scegli il piano giusto per la tua carriera
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-md text-sm text-notte/70 md:text-base">
              Dal profilo gratuito agli strumenti Pro e Max per farti trovare, negoziare e
              crescere. Cambi piano quando vuoi.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <PlanComparison />
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 flex justify-center">
            <Link
              href="/prezzi"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-azzurro transition hover:gap-2.5 hover:text-azzurro-dark"
            >
              Scopri tutti i dettagli dei piani
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
