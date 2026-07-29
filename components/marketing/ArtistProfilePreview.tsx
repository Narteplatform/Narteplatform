import { CalendarDays, ImageIcon, MapPin, Play } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { PROFILE_ANNOTATIONS } from "@/lib/content/artist-landing";

/**
 * Vetrina statica di com'è fatto un profilo N'arte.
 *
 * È un mockup, non il componente reale: replica l'impaginazione della pagina
 * artista senza montare BookingCalendar (client, ~650 righe, con fetch) né
 * toccare il database per una sezione che deve solo far vedere la forma.
 *
 * Mockup al centro e annotazioni sotto, non affiancate: con la scheda in
 * colonna restavano trecento pixel di vuoto accanto al testo, e su mobile la
 * lista finiva comunque sotto. Così l'impaginazione è la stessa a ogni
 * larghezza.
 *
 * I numerini sulla scheda sono `aria-hidden`: il significato lo porta la lista
 * numerata, che è testo vero.
 */
export function ArtistProfilePreview() {
  return (
    <section className="border-t border-border py-20 md:py-28">
      <div className="container-narte">
        <SectionHeading
          label="cosa ottieni"
          title="Una pagina che parla al posto tuo."
          description="Questo è quello che vede un organizzatore quando ti trova. Un link solo, da mandare anche fuori da qui."
        />

        {/* MOCKUP */}
        <Reveal delay={0.15}>
          <div className="relative mx-auto mt-12 w-full max-w-[19rem] rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-lg)] md:mt-16">
            {/* Cover */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-azzurro/35 via-notte-60 to-corallo/25">
              {/* Il posto della foto: senza un segno al centro il riquadro
                  legge come una fascia vuota, non come "qui va il ritratto". */}
              <ImageIcon
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-palco/20"
                strokeWidth={1.1}
              />
              <Marker n={1} className="left-3 top-3" />
              {/* Pillola piena e non <Badge variant="accent">: quella variante
                  è corallo-dark su un fondo al 10%, illeggibile su una cover. */}
              <span className="absolute right-3 top-3 inline-flex items-center rounded-pill bg-corallo px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
                Top
              </span>
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-notte/70 px-2.5 py-1 text-[11px] font-medium text-palco backdrop-blur-sm">
                <MapPin aria-hidden="true" className="size-3" />
                Napoli
              </span>
              <span className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-palco/90 text-notte">
                <Play aria-hidden="true" className="size-4 translate-x-px" />
              </span>
            </div>

            {/* Nome + generi */}
            <div className="relative mt-4">
              <Marker n={2} className="-left-1 top-0" />
              <p className="pl-7 font-display text-xl font-bold">Nome d&rsquo;arte</p>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                {["Cantautorato", "Indie", "Trio"].map((g) => (
                  <span
                    key={g}
                    className="rounded-pill border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Video */}
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <Marker n={3} className="-left-1 -top-1" />
              {[0, 1, 2].map((k) => (
                <div
                  key={k}
                  className="flex aspect-video items-center justify-center rounded-md border border-border bg-muted"
                >
                  <Play aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </div>
              ))}
            </div>

            {/* Disponibilità e cachet */}
            <div className="relative mt-4 rounded-xl border border-border bg-muted p-4">
              <Marker n={4} className="-left-1 -top-1" />
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                Disponibilità
              </p>
              <div aria-hidden="true" className="mt-3 grid grid-cols-7 gap-1.5">
                {Array.from({ length: 21 }, (_, k) => (
                  <span
                    key={k}
                    className={
                      // Un pattern fisso, non casuale: Math.random() in un
                      // Server Component darebbe un mockup diverso a ogni
                      // richiesta e un mismatch di idratazione.
                      k % 7 === 5 || k % 9 === 2
                        ? "aspect-square rounded-[3px] bg-border"
                        : "aspect-square rounded-[3px] bg-accent/45"
                    }
                  />
                ))}
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Cachet</span>
                <span className="font-display text-base font-bold tabular-nums">
                  €€ · da concordare
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ANNOTAZIONI */}
        <ol className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-6">
          {PROFILE_ANNOTATIONS.map((a, i) => (
            <li key={a.title}>
              <Reveal
                delay={0.1 * (i + 1)}
                className="flex flex-col items-center text-center"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold tabular-nums text-accent-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-balance font-display text-lg font-bold leading-tight">
                  {a.title}
                </h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {a.desc}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Pallino numerato sul mockup. Decorativo: il testo è nella lista sotto. */
function Marker({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-10 inline-flex size-6 items-center justify-center rounded-full bg-accent font-display text-[11px] font-bold tabular-nums text-accent-foreground shadow-[var(--shadow-sm)] ${className ?? ""}`}
    >
      {n}
    </span>
  );
}
