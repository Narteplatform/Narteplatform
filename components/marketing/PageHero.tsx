import type { ReactNode } from "react";
import { Reveal } from "@/components/animations/Reveal";
import type { HeroImage } from "@/lib/content/hero-images";

/**
 * Hero delle pagine pubbliche di primo livello: foto di sfondo + glow azzurro +
 * micro-label + titolo display centrato. Le classi (.hero-glow-ring,
 * .display-xl, .accent-label, .container-narte) vivono in app/globals.css.
 *
 * Non usarlo per le pagine di dettaglio ([slug]): hanno layout propri.
 */
export function PageHero({
  label,
  title,
  description,
  image,
  children,
}: {
  label: string;
  /** ReactNode e non string: alcuni titoli vanno su due righe con <br />. */
  title: ReactNode;
  description?: ReactNode;
  /**
   * Sfondo attinente alla pagina, da `heroImageFor()`. Omettendolo si torna
   * all'intestazione con il solo glow: nessuna pagina si rompe se non lo passa.
   */
  image?: HeroImage;
  /** Contenuto opzionale sotto la descrizione (es. la ricerca in /help). */
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border pt-24 pb-10 md:pt-32 md:pb-14">
      {image && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/*
            Opacità bassa e non un filtro sull'immagine: al 20% la foto dà
            carattere alla pagina senza contendere il titolo. `eager` perché è
            above the fold — in lazy si vedrebbe comparire a pagina già letta.
            next/image non serve: è una sola immagine decorativa a piena
            larghezza, e il suo wrapper `fill` complicherebbe il layer sotto.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            loading="eager"
            className="h-full w-full object-cover object-center opacity-20"
          />
          {/*
            La sfumatura è ciò che tiene il titolo leggibile (contrasto AA) su
            qualunque foto, chiara o scura, e raccorda il bordo inferiore con la
            sezione successiva. Senza, una foto chiara al centro renderebbe il
            titolo illeggibile.
          */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        </div>
      )}
      <div
        aria-hidden="true"
        className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
      />
      <div className="container-narte relative z-10 text-center">
        <Reveal>
          {/* L'occhiello sta sempre su fondo scuro (le pagine pubbliche girano
              in tema notte): l'azzurro di brand ci starebbe a 3,1:1, sotto la
              soglia AA per un testo da 12px. */}
          <p className="accent-label mb-4 text-azzurro-pale">{label}</p>
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
