import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/animations/Reveal";

/**
 * Intestazione centrata delle sezioni marketing: micro-label, titolo display,
 * descrizione. Estratta perché sei sezioni della landing artista la ripetevano
 * identica e bastava una svista per farle divergere di mezzo rem.
 *
 * I colori arrivano da `currentColor`: la descrizione è `opacity-70` invece di
 * un colore fisso, così lo stesso componente funziona sulle fasce chiare
 * (text-notte) e su quelle scure senza una prop `tone` da ricordarsi.
 */
export function SectionHeading({
  label,
  title,
  description,
  className,
}: {
  label: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-3xl text-center", className)}>
      <Reveal>
        <p className="accent-label mb-3">{label}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="display-xl text-balance text-4xl md:text-5xl lg:text-6xl">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.2}>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base opacity-70 md:text-lg">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
