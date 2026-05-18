import { Mic2, Eye, Users2, TrendingUp } from "lucide-react";
import { ArtistApplicationForm } from "@/components/forms/ArtistApplicationForm";
import { Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Sei un artista? — N'arte" };

const BENEFITS = [
  {
    icon: <Mic2 className="size-5" />,
    title: "Ottieni più live",
    desc: "Ricevi richieste dirette da organizzatori e venue che cercano artisti come te.",
  },
  {
    icon: <Eye className="size-5" />,
    title: "Ottieni più visibilità",
    desc: "Profilo pubblico, gallery, video e social tutto in una pagina che ti rappresenta.",
  },
  {
    icon: <Users2 className="size-5" />,
    title: "Nuove collaborazioni",
    desc: "Connettiti con altri artisti, label e progetti culturali del network N'arte.",
  },
  {
    icon: <TrendingUp className="size-5" />,
    title: "Una community per la tua crescita",
    desc: "Non sei mai solo: dietro N'arte c'è una rete che spinge ogni artista in avanti.",
  },
];

export default function CandidaturaPage() {
  return (
    <section className="relative overflow-hidden border-b border-border pt-28 pb-16 md:pt-36 md:pb-24">
      <div
        aria-hidden="true"
        className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
      />
      <div className="container-narte relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — Vantaggi */}
          <div className="flex flex-col">
            <Reveal>
              <p className="accent-label mb-4">candidatura</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="display-xl text-4xl md:text-6xl lg:text-7xl">Sei un artista?</h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-5 font-display text-lg uppercase tracking-tight text-accent md:text-xl">
                Dai luce al tuo talento.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
                N&apos;arte non è solo una vetrina: è una piattaforma costruita per far crescere
                gli artisti emergenti che vogliono fare sul serio.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.title} delay={0.1 * (i + 1)}>
                  <article className="flex h-full gap-4 rounded-2xl border border-border bg-muted p-5 transition-colors hover:border-accent">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      {b.icon}
                    </span>
                    <div>
                      <h3 className="font-display text-base uppercase md:text-lg">{b.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
                <h2 className="font-display text-2xl uppercase tracking-tight md:text-3xl">
                  Inviaci la tua candidatura.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Dopo la revisione riceverai un&apos;email per completare il profilo e gestire le
                  disponibilità.
                </p>
                <div className="mt-6">
                  <ArtistApplicationForm />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
