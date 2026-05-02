import { Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Chi siamo — N'arte" };

export default function ChiSiamoPage() {
  return (
    <div className="container-narte py-16">
      <Reveal>
        <p className="accent-label">chi siamo</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-5xl md:text-7xl">Una piattaforma per chi vive di musica e cultura.</h1>
      </Reveal>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <Reveal delay={0.2}>
          <h2 className="font-display text-2xl uppercase">La nostra missione</h2>
          <p className="mt-3 text-base leading-relaxed text-foreground/80">
            N&apos;arte nasce per dare visibilità ad artisti emergenti e per raccontare gli eventi
            musicali e culturali che organizziamo o ai quali partecipiamo. Curiamo ogni
            esperienza con attenzione, dal sound design alla scenografia.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <h2 className="font-display text-2xl uppercase">Cosa facciamo</h2>
          <ul className="mt-3 space-y-2 text-base text-foreground/80">
            <li>— Organizziamo eventi musicali, festival e serate culturali</li>
            <li>— Promuoviamo artisti emergenti tramite il nostro roster</li>
            <li>— Mettiamo in contatto organizzatori e artisti per nuovi booking</li>
            <li>— Costruiamo collaborazioni con realtà locali</li>
          </ul>
        </Reveal>
      </div>
    </div>
  );
}
