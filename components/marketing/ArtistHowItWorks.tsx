import { Reveal } from "@/components/animations/Reveal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { STEPS } from "@/lib/content/artist-landing";

/**
 * I quattro passi dalla candidatura alla prima richiesta.
 *
 * Ogni passo è centrato sotto il proprio numero; la linea che li collega è un
 * ::after del singolo passo e non una riga unica sopra la griglia, così resta
 * corretta qualunque sia il numero di passi e sull'ultimo non c'è. Sotto md le
 * card sono impilate e la linea sparisce: non avrebbe niente da collegare.
 */
export function ArtistHowItWorks() {
  return (
    <section id="come-funziona" className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <SectionHeading
          label="come funziona"
          title="Dalla candidatura alla prima richiesta."
          description={
            <>
              Nessun provino, nessuna quota d&rsquo;iscrizione, nessun contratto
              da firmare. Quattro passi, e il terzo è già gratis per sempre.
            </>
          }
        />

        <ol className="mx-auto mt-12 grid max-w-5xl gap-10 sm:grid-cols-2 md:mt-16 md:grid-cols-4 md:gap-6">
          {STEPS.map((s, i) => (
            // Il Reveal sta DENTRO l'<li>: fra <ol> e <li> un <div> non è HTML
            // valido e toglie a uno screen reader la semantica di lista.
            <li
              key={s.title}
              // Con i pallini centrati nella colonna: il segmento parte dal
              // bordo destro del proprio (50% + raggio 1.5rem) e arriva al
              // bordo sinistro del successivo. Quest'ultimo cade esattamente a
              // -50% perché il gap della griglia (gap-6) è uguale al raggio.
              className="relative md:h-full md:after:absolute md:after:left-[calc(50%+1.5rem)] md:after:right-[-50%] md:after:top-6 md:after:h-px md:after:bg-palco-60 md:after:content-[''] md:last:after:hidden"
            >
              <Reveal
                delay={0.1 * (i + 1)}
                className="flex h-full flex-col items-center text-center"
              >
                <span className="relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-palco-60 bg-white font-display text-lg font-bold tabular-nums text-azzurro shadow-[var(--shadow-sm)]">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-balance font-display text-lg font-bold leading-tight text-notte md:text-xl">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-pretty text-sm leading-relaxed text-notte/70">
                  {s.desc}
                </p>
                {/* mt-auto allinea le pillole sulla stessa riga: le descrizioni
                    hanno lunghezze diverse e senza questo ballano. */}
                <p className="mt-4 inline-flex rounded-pill bg-azzurro-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-azzurro md:mt-auto md:pt-1">
                  {s.meta}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
