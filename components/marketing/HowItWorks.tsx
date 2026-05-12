import { Mic2, Sparkles, Users } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";

type Block = {
  key: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  steps: string[];
};

const BLOCKS: Block[] = [
  {
    key: "artisti",
    icon: <Mic2 className="size-5" />,
    label: "per artisti",
    title: "Dai luce al tuo talento.",
    steps: ["Crea il tuo profilo", "Fatti scoprire", "Ricevi richieste"],
  },
  {
    key: "organizzatori",
    icon: <Sparkles className="size-5" />,
    label: "per gli organizzatori",
    title: "Trova l'artista giusto.",
    steps: ["Scopri artisti per te", "Filtra per stile", "Prenota facilmente"],
  },
  {
    key: "tutti",
    icon: <Users className="size-5" />,
    label: "per tutti",
    title: "Vivi la community.",
    steps: ["Scopri eventi", "Partecipa", "Entra nella community"],
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border bg-background py-16 md:py-24">
      <div className="container-narte">
        <div className="text-center">
          <Reveal>
            <p className="accent-label mb-3">come funziona</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-3xl md:text-5xl lg:text-6xl">
              Come funziona{" "}
              <span className="display-italic">N&apos;Arte.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Una piattaforma, tre modi per viverla: che tu sia un artista, un organizzatore o
              parte della community, hai tutto quello che ti serve.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {BLOCKS.map((b, i) => (
            <Reveal key={b.key} delay={0.1 * (i + 1)}>
              <article className="group flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition-all duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)] md:p-7">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-lg bg-azzurro-subtle text-azzurro transition-colors group-hover:bg-azzurro group-hover:text-white">
                    {b.icon}
                  </span>
                  <p className="accent-label">{b.label}</p>
                </div>
                <h3 className="mt-6 font-display text-2xl font-bold leading-tight md:text-[1.65rem]">
                  {b.title}
                </h3>
                <ol className="mt-5 space-y-3">
                  {b.steps.map((s, idx) => (
                    <li
                      key={s}
                      className="flex items-start gap-3 text-sm md:text-base"
                    >
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-azzurro/10 font-display text-[11px] font-bold text-azzurro">
                        {idx + 1}
                      </span>
                      <span className="text-foreground/85">{s}</span>
                    </li>
                  ))}
                </ol>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
