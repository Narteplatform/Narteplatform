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
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-32 pb-20 md:pt-44 md:pb-28">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">candidatura</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">Sei un artista?</h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 font-display text-xl uppercase tracking-tight text-accent md:text-2xl">
              Dai luce al tuo talento.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Candidati per entrare nel roster N&apos;arte. Dopo la revisione riceverai
              un&apos;email per completare il profilo e gestire le tue disponibilità.
            </p>
          </Reveal>
        </div>
      </section>

      {/* PERCHÉ ENTRARE */}
      <section className="border-b border-border bg-background py-16 md:py-24">
        <div className="container-narte">
          <div className="text-center">
            <Reveal>
              <p className="accent-label mb-3">perché entrare</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl lg:text-6xl">
                Quattro buoni motivi.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
                N&apos;arte non è solo una vetrina: è una piattaforma costruita per far crescere
                gli artisti emergenti che vogliono fare sul serio.
              </p>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={0.1 * (i + 1)}>
                <article className="flex h-full gap-4 rounded-2xl border border-border bg-muted p-6 transition-colors hover:border-accent md:p-8">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    {b.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-xl uppercase md:text-2xl">{b.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground md:text-base">{b.desc}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section className="bg-muted py-16 md:py-20">
        <div className="container-narte">
          <Reveal>
            <p className="accent-label mb-3">come funziona</p>
          </Reveal>
          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {[
              { n: "01", t: "Candidati", d: "Compila il form con bio, generi e link social." },
              { n: "02", t: "Revisione", d: "Valutiamo la candidatura entro 7 giorni lavorativi." },
              { n: "03", t: "Online", d: "Profilo pubblicato e calendario gestibile dalla dashboard." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={0.1 * (i + 1)}>
                <div className="h-full bg-background p-6 md:p-8">
                  <p className="font-display text-3xl text-accent">{s.n}</p>
                  <h3 className="mt-3 font-display text-lg uppercase">{s.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="container-narte">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="display-xl text-3xl md:text-5xl">Inviaci la tua candidatura.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 text-base text-muted-foreground">
                Tutti i campi obbligatori per consentirci una valutazione completa.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 rounded-2xl border border-border bg-muted p-6 md:p-8">
                <ArtistApplicationForm />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
