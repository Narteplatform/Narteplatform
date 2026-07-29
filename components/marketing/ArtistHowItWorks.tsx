import { Reveal } from "@/components/animations/Reveal";
import { STEPS } from "@/lib/content/artist-landing";

/**
 * I quattro passi dalla candidatura alla prima richiesta.
 *
 * La linea che collega i numeri esiste solo da `md` in su: su mobile le card
 * sono impilate e una linea orizzontale non avrebbe niente da collegare.
 */
export function ArtistHowItWorks() {
  return (
    <section id="come-funziona" className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <div className="max-w-2xl">
          <Reveal>
            <p className="accent-label mb-3">come funziona</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
              Dalla candidatura alla prima richiesta.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-5 text-pretty text-base text-notte/70 md:text-lg">
              Nessun provino, nessuna quota d&rsquo;iscrizione, nessun contratto da
              firmare. Quattro passi, e il terzo è già gratis per sempre.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 md:mt-16">
          <ol className="grid gap-8 md:grid-cols-4 md:gap-6">
            {STEPS.map((s, i) => (
              // Il Reveal sta DENTRO l'<li>: fra <ol> e <li> un <div> non è
              // HTML valido e toglie a uno screen reader la semantica di lista.
              //
              // Il segmento di linea è un ::after di ogni passo e non una linea
              // unica sopra la griglia: parte dal bordo del proprio pallino
              // (left-12 = size-12) e arriva dentro il gap successivo
              // (-right-6 = gap-6). Così resta corretto qualunque sia il numero
              // di passi, e sull'ultimo semplicemente non c'è.
              <li
                key={s.title}
                className="relative md:h-full md:after:absolute md:after:left-12 md:after:top-6 md:after:h-px md:after:bg-palco-60 md:after:content-[''] md:after:-right-6 md:last:after:hidden"
              >
                <Reveal
                  delay={0.1 * (i + 1)}
                  className="flex gap-5 md:h-full md:flex-col md:gap-0"
                >
                  <span className="relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-palco-60 bg-white font-display text-lg font-bold tabular-nums text-azzurro shadow-[var(--shadow-sm)]">
                    {i + 1}
                  </span>
                  <div className="flex flex-col md:mt-6 md:flex-1">
                    <h3 className="text-balance font-display text-lg font-bold leading-tight text-notte md:text-xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-notte/70">
                      {s.desc}
                    </p>
                    {/* mt-auto allinea le pillole in basso: le descrizioni hanno
                        lunghezze diverse e senza questo ballano di riga. */}
                    <p className="mt-3 inline-flex self-start rounded-pill bg-azzurro-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-azzurro md:mt-auto md:pt-1">
                      {s.meta}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
