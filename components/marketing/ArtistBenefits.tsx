import { CalendarCheck, Search, UserRound, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/animations/Reveal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { BENEFITS, type BenefitIcon } from "@/lib/content/artist-landing";

/**
 * La mappa chiave → icona vive qui e non in lib/content: così il file di
 * contenuti resta un `.ts` senza JSX e senza import di lucide-react.
 */
const ICONS: Record<BenefitIcon, ReactNode> = {
  search: <Search className="size-5" />,
  profile: <UserRound className="size-5" />,
  calendar: <CalendarCheck className="size-5" />,
  wallet: <Wallet className="size-5" />,
};

export function ArtistBenefits() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <SectionHeading
          label="perché iscriversi"
          title="Smetti di rincorrere le date."
          description="Il lavoro più ingrato del fare musica non è suonare: è convincere qualcuno a farti suonare. Questa è la parte che proviamo a toglierti di mezzo."
        />

        {/* Quattro card su due colonne, la griglia centrata nel contenitore.
            Icona sopra e testo centrato: allineare a sinistra dentro una
            sezione centrata spezzava l'asse verticale della pagina. */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2 md:mt-16 lg:gap-6">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={0.1 * (i + 1)}>
              <article className="group flex h-full flex-col items-center rounded-2xl border border-palco-60 bg-white p-6 text-center shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-220 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)] md:p-8">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-azzurro-subtle text-azzurro transition-colors group-hover:bg-azzurro group-hover:text-white">
                  {ICONS[b.icon]}
                </span>
                <h3 className="mt-5 text-balance font-display text-lg font-bold leading-tight text-notte md:text-xl">
                  {b.title}
                </h3>
                <p className="mt-2.5 text-pretty text-sm leading-relaxed text-notte/70">
                  {b.desc}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
