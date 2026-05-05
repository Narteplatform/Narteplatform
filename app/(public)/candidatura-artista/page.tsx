import { ArtistApplicationForm } from "@/components/forms/ArtistApplicationForm";
import { Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Sei un artista? — N'arte" };

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
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Candidati per entrare nel roster N&apos;arte. Dopo la revisione riceverai
              un&apos;email per completare il profilo e gestire le tue disponibilità.
            </p>
          </Reveal>
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
