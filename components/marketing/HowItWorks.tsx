import { Mic2, Search, Users } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";

type Block = {
  key: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  steps: string[];
};

/**
 * L'ordine dell'array è l'ordine sulla pagina, e il delay del Reveal è
 * calcolato dall'indice: per cambiare priorità basta spostare un blocco.
 * Chi organizza sta per primo perché è il lettore a cui parla la home.
 */
const BLOCKS: Block[] = [
  {
    key: "organizzatori",
    icon: <Search className="size-5" />,
    label: "se organizzi",
    title: "Trova, ascolta, prenota.",
    steps: [
      "Filtra per genere, città e data",
      "Guarda i video e leggi il cachet",
      "Scrivi all'artista e chiudi la serata",
    ],
  },
  {
    key: "artisti",
    icon: <Mic2 className="size-5" />,
    label: "se suoni",
    title: "Fatti trovare.",
    steps: [
      "Candidati in due minuti",
      "Costruisci il profilo",
      "Ricevi richieste dagli organizzatori",
    ],
  },
  {
    key: "tutti",
    icon: <Users className="size-5" />,
    label: "se vuoi solo ascoltare",
    title: "Scopri chi suona.",
    steps: [
      "Guarda il calendario degli eventi",
      "Scegli la serata",
      "Presentati e goditela",
    ],
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
            <h2 className="display-xl text-balance text-3xl md:text-5xl lg:text-6xl">
              Tre modi di usare{" "}
              <span className="display-italic">N&rsquo;arte.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
              Se sei qui perché ti serve un artista, il primo è il tuo. Gli altri
              due esistono perché senza di loro il primo non funzionerebbe.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {BLOCKS.map((b, i) => (
            <Reveal key={b.key} delay={0.1 * (i + 1)}>
              <article className="group flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-220 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)] md:p-7">
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
                    <li key={s} className="flex items-start gap-3 text-sm md:text-base">
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-azzurro/10 font-display text-[11px] font-bold tabular-nums text-azzurro">
                        {idx + 1}
                      </span>
                      <span className="text-pretty text-foreground/85">{s}</span>
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
