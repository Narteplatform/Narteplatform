import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { heroImageFor } from "@/lib/content/hero-images";
import { MilestonesTimeline } from "@/components/marketing/MilestonesTimeline";
import { Button } from "@/components/ui/Button";
import { MILESTONES } from "@/lib/content/milestones";
import { NARTE_STATS, NARTE_SINCE } from "@/lib/content/stats";

export const metadata = { title: "Chi siamo — N'arte" };

export default function ChiSiamoPage() {
  return (
    <>
      <PageHero
        image={heroImageFor("chi-siamo")}
        label="chi siamo"
        title="Chi siamo"
        description={
          <>
            La piattaforma N&rsquo;arte offre visibilità ad artisti emergenti mettendoli in
            contatto con gli organizzatori di eventi e locali.
          </>
        }
      />

      {/* FONDATORE */}
      <section className="py-20 md:py-28">
        {/* Colonna foto a larghezza fissa: il cerchio deve restare un cerchio,
            quindi non segue una frazione della griglia. */}
        <div className="container-narte grid gap-8 md:grid-cols-[auto_1fr] md:items-center md:gap-12 lg:gap-16">
          <Reveal>
            <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-full border border-border bg-muted sm:w-64 md:mx-0 md:w-72 lg:w-80">
              <Image
                src="/brand/fondatore-eduardo.jpg"
                alt="Eduardo Castronuovo, fondatore di N'arte, sul palco"
                fill
                sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, 224px"
                className="object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {/* Centrato finché il testo sta sotto la foto invece che accanto. */}
            <div className="text-center md:text-left">
              <p className="accent-label mb-3">il fondatore</p>
              <h2 className="display-xl text-4xl md:text-5xl">Eduardo Castronuovo</h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:mx-0 md:text-lg">
                Giovane visionario fondatore di N&rsquo;arte e presente nel settore della musica
                da oltre 8 anni. Eduardo ha dato la possibilità a tantissimi giovani emergenti
                di crescere ed esprimersi su migliaia di palchi, gestendo anche la direzione
                artistica di grandi eventi in tutta Italia.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MILESTONES — sezione neutra di proposito: la successiva è già
          bg-muted, e due fasce dello stesso colore di fila spezzerebbero
          l'alternanza chiaro/scuro della pagina. */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="container-narte">
          <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
            <Reveal>
              <p className="accent-label mb-3">le tappe</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl md:text-6xl">
                Come siamo arrivati fin qui.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 text-pretty text-base text-muted-foreground md:text-lg">
                Otto anni, una città e un mucchio di serate. Tocca una tappa per
                leggerne la storia.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.25}>
            <MilestonesTimeline items={MILESTONES} className="mt-12 md:mt-16" />
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
          <div className="text-center md:text-left">
            <Reveal>
              <p className="accent-label mb-3">i numeri</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl md:text-6xl">
                Dal {NARTE_SINCE}, una rete in continua crescita.
              </h2>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {NARTE_STATS.map((s, i) => (
              <Reveal key={s.label} delay={0.1 * (i + 1)}>
                <div className="h-full bg-background p-8 md:p-10">
                  <p className="font-display text-5xl tabular-nums md:text-6xl">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-wide text-muted-foreground">
                    {s.label}
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
