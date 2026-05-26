import Link from "next/link";
import type { Metadata } from "next";
import { Music2, Mic, Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";

export const metadata: Metadata = {
  title: "Format — N'arte",
  description:
    "I tre format N'arte: contenitori di musica live curati per club, festival e brand. Scopri come portare un format N'arte nel tuo evento.",
  alternates: { canonical: "/format" },
};

type Format = {
  key: string;
  title: string;
  tagline: string;
  description: string;
  icon: typeof Music2;
};

const FORMATS: Format[] = [
  {
    key: "format-1",
    title: "Format 1",
    tagline: "Placeholder — definire titolo",
    description:
      "Descrizione del primo format N'arte. Aggiorna questo contenuto inserendo concept, target, durata indicativa e tipologia di location ideale.",
    icon: Music2,
  },
  {
    key: "format-2",
    title: "Format 2",
    tagline: "Placeholder — definire titolo",
    description:
      "Descrizione del secondo format N'arte. Aggiorna questo contenuto inserendo concept, target, durata indicativa e tipologia di location ideale.",
    icon: Mic,
  },
  {
    key: "format-3",
    title: "Format 3",
    tagline: "Placeholder — definire titolo",
    description:
      "Descrizione del terzo format N'arte. Aggiorna questo contenuto inserendo concept, target, durata indicativa e tipologia di location ideale.",
    icon: Sparkles,
  },
];

export default function FormatPage() {
  return (
    <div className="bg-background pt-32 pb-24">
      <section className="container-narte">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Format
          </span>
          <h1 className="mt-4 font-display text-4xl uppercase leading-tight tracking-tight md:text-6xl">
            I format N&apos;arte
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Contenitori di musica live curati da N&apos;arte: format pensati per club,
            festival e brand che vogliono offrire al pubblico un&apos;esperienza riconoscibile
            e di qualità.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FORMATS.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.key} delay={i * 0.08}>
                <article className="card-lift group flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-7">
                  <div className="inline-flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      {f.tagline}
                    </p>
                    <h2 className="mt-2 font-display text-2xl uppercase leading-tight tracking-tight group-hover:text-accent">
                      {f.title}
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dettagli in arrivo
                  </span>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-20 rounded-2xl border border-accent/40 bg-accent/5 p-8 text-center md:p-12">
            <h2 className="font-display text-2xl uppercase tracking-tight md:text-3xl">
              Vuoi portare un format N&apos;arte nel tuo locale o festival?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              Scrivici per ricevere il dossier completo con artisti, tecnical rider e
              modalità di ingaggio.
            </p>
            <Link
              href="/contatti"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-accent-foreground hover:opacity-90"
            >
              Contattaci <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
