import type { ReactNode } from "react";
import { Reveal } from "@/components/animations/Reveal";

/**
 * Hero delle pagine pubbliche di primo livello: glow azzurro + micro-label +
 * titolo display centrato. Le classi (.hero-glow-ring, .display-xl,
 * .accent-label, .container-narte) vivono in app/globals.css.
 *
 * Non usarlo per le pagine di dettaglio ([slug]): hanno layout propri.
 */
export function PageHero({
  label,
  title,
  description,
  children,
}: {
  label: string;
  /** ReactNode e non string: alcuni titoli vanno su due righe con <br />. */
  title: ReactNode;
  description?: ReactNode;
  /** Contenuto opzionale sotto la descrizione (es. la ricerca in /help). */
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border pt-24 pb-10 md:pt-32 md:pb-14">
      <div
        aria-hidden="true"
        className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
      />
      <div className="container-narte relative z-10 text-center">
        <Reveal>
          <p className="accent-label mb-4">{label}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">{title}</h1>
        </Reveal>
        {description && (
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              {description}
            </p>
          </Reveal>
        )}
        {children && (
          <Reveal delay={0.3}>
            <div className="mx-auto mt-10 max-w-2xl">{children}</div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
