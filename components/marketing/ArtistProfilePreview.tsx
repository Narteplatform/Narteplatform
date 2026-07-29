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
 * Unica sezione asimmetrica della landing: annotazioni a sinistra e scheda
 * spostata a destra. L'intestazione resta centrata come le altre, così lo
 * stacco si legge come una scelta e non come un allineamento sbagliato.
 *
 * I numerini sulla scheda sono `aria-hidden`: il significato lo porta la lista
 * numerata accanto, che è testo vero.
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

        {/* Intestazione centrata come le altre sezioni, contenuto su due
            colonne: annotazioni a sinistra, scheda spostata a destra. */}
        <div className="mt-12 grid gap-12 md:mt-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
          {/* ANNOTAZIONI. Su mobile stanno sotto la scheda (order-2): prima si
              guarda com'è fatta una pagina, poi si legge perché. */}
          {/* justify-self-center a ogni larghezza: da lg riduce lo stacco fra
              i bullet e la scheda che numerano, e sotto lg centra il blocco
              come la scheda invece di lasciarlo appeso a sinistra. */}
          <ol className="order-2 max-w-xl justify-self-center space-y-8 lg:order-1">
            {PROFILE_ANNOTATIONS.map((a, i) => (
              <li key={a.title}>
                <Reveal delay={0.1 * (i + 1)} className="flex gap-4">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold tabular-nums text-accent-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-balance font-display text-lg font-bold leading-tight">
                      {a.title}
                    </h3>
                    <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                      {a.desc}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>

          {/* MOCKUP */}
          <Reveal
            delay={0.15}
            className="order-1 lg:order-2 lg:justify-self-end lg:translate-x-4 xl:translate-x-8"
          >
            <div className="relative mx-auto w-full max-w-[19rem] rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-lg)]">
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
        </div>
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
