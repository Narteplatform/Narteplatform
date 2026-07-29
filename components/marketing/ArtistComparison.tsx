import { Check, X } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { COMPARISON } from "@/lib/content/artist-landing";

/**
 * Confronto "da solo" vs "con N'arte".
 *
 * Un solo DOM per tutti i breakpoint: niente <table> desktop più una versione
 * mobile duplicata, che farebbe leggere ogni riga due volte a uno screen
 * reader. È una <ul> che da `md` in su diventa una griglia a tre colonne; le
 * intestazioni sono visibili solo lì e sono aria-hidden, perché sotto md la
 * stessa informazione la danno le label sr-only dentro ogni cella.
 *
 * Il testo delle righe resta allineato a sinistra anche se la sezione è
 * centrata: sono due colonne da confrontare riga per riga, e centrarle
 * toglierebbe l'asse verticale su cui l'occhio scorre.
 */
export function ArtistComparison() {
  return (
    <section className="border-t border-border py-20 md:py-28">
      <div className="container-narte">
        <SectionHeading
          label="il confronto"
          title="Da solo mandi mail e speri."
          description="Nessuno ti vieta di continuare a fare come hai sempre fatto. Ecco solo cosa cambia, riga per riga."
        />

        <div className="mx-auto mt-12 max-w-4xl md:mt-16">
          {/* Intestazioni: solo da md, e aria-hidden perché sotto quel
              breakpoint l'informazione la portano le label sr-only. */}
          <div
            aria-hidden="true"
            className="mb-3 hidden grid-cols-[1fr_1.4fr_1.4fr] gap-6 px-6 md:grid"
          >
            <span className="narte-label opacity-60" />
            <span className="narte-label opacity-60">Da solo</span>
            <span className="narte-label text-accent">Con N&rsquo;arte</span>
          </div>

          <ul className="overflow-hidden rounded-2xl border border-border">
            {COMPARISON.map((row, i) => (
              <li
                key={row.label}
                className="border-b border-border bg-card last:border-b-0"
              >
                <Reveal
                  delay={Math.min(0.1 * (i + 1), 0.3)}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_1.4fr_1.4fr] md:items-start md:gap-6 md:p-6"
                >
                  <p className="font-display text-base font-bold md:text-lg">
                    {row.label}
                  </p>

                  <p className="flex items-start gap-3 text-sm text-muted-foreground md:text-base">
                    <X
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="text-pretty">
                      <span className="sr-only">Da solo: </span>
                      {row.alone}
                    </span>
                  </p>

                  <p className="flex items-start gap-3 text-sm md:text-base">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-accent"
                    />
                    <span className="text-pretty">
                      <span className="sr-only">Con N&rsquo;arte: </span>
                      {row.withNarte}
                    </span>
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
