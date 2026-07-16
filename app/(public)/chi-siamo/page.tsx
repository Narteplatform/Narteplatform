import Link from "next/link";
import { Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Chi siamo — N'arte" };

export default function ChiSiamoPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-24 pb-12 md:pt-32 md:pb-16">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">chi siamo</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">
              Una piattaforma per chi vive
              <br />
              di musica e cultura.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-8 max-w-2xl text-base text-muted-foreground md:text-lg">
              N&apos;arte nasce a Napoli per dare visibilità ad artisti emergenti e raccontare gli
              eventi musicali e culturali che organizziamo. Curiamo ogni esperienza con
              attenzione: dal sound design alla scenografia.
            </p>
          </Reveal>
        </div>
      </section>

      {/* MISSIONE / COSA FACCIAMO */}
      <section className="bg-muted py-20 md:py-28">
        <div className="container-narte grid gap-6 md:grid-cols-2">
          <Reveal>
            <article className="h-full rounded-2xl border border-border bg-background p-8 md:p-10">
              <p className="accent-label mb-3">missione</p>
              <h2 className="font-display text-2xl md:text-3xl">
                Dare voce a chi crea cultura.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Sosteniamo musicisti, performer e creativi emergenti costruendo occasioni
                concrete: serate, festival, format originali. Diamo spazio, contesto e
                visibilità — non solo un palco.
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <article className="h-full rounded-2xl border border-border bg-background p-8 md:p-10">
              <p className="accent-label mb-3">cosa facciamo</p>
              <h2 className="font-display text-2xl md:text-3xl">
                Un ecosistema completo.
              </h2>
              <ul className="mt-4 space-y-2 text-base text-muted-foreground">
                <li>· Organizziamo eventi musicali, festival e serate culturali</li>
                <li>· Promuoviamo artisti emergenti tramite il nostro roster</li>
                <li>· Mettiamo in contatto organizzatori e artisti per nuovi booking</li>
                <li>· Costruiamo collaborazioni con realtà locali</li>
              </ul>
            </article>
          </Reveal>
        </div>
      </section>

      {/* NUMERI */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="container-narte">
          <Reveal>
            <p className="accent-label mb-3">i numeri</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-4xl md:text-6xl">
              Dal 2018, una rete in continua crescita.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {[
              { k: "100+", v: "Artisti emergenti" },
              { k: "30+", v: "Location iconiche" },
              { k: "200+", v: "Eventi prodotti" },
            ].map((s, i) => (
              <Reveal key={s.k} delay={0.1 * (i + 1)}>
                <div className="bg-background p-8 md:p-10">
                  <p className="font-display text-5xl md:text-6xl">{s.k}</p>
                  <p className="mt-2 text-sm uppercase tracking-wide text-muted-foreground">
                    {s.v}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted py-20 md:py-28">
        <div className="container-narte text-center">
          <Reveal>
            <h2 className="display-xl text-4xl md:text-6xl">
              Vuoi farne parte?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
              Sei un artista, un organizzatore o una realtà culturale? Costruiamo qualcosa
              insieme.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/candidatura-artista">Candidati come artista</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contatti">Contattaci</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
