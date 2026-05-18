import type { Metadata } from "next";
import { Reveal } from "@/components/animations/Reveal";
import { FAQ } from "@/lib/content/faq";

export const metadata: Metadata = {
  title: "F.A.Q. — N'arte",
  description:
    "Domande frequenti su N'arte: come candidarsi come artista, prenotare un booking, gestire account e pagamenti.",
};

export default function FaqPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-28 pb-12 md:pt-36 md:pb-16">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">supporto</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">F.A.Q.</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Le risposte alle domande più frequenti su come funziona N&apos;arte, per artisti,
              organizzatori e utenti.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-background py-16 md:py-24">
        <div className="container-narte max-w-3xl">
          {FAQ.map((cat, idx) => (
            <Reveal key={cat.category} delay={0.05 * idx}>
              <div className="mb-12 last:mb-0">
                <h2 className="font-display text-2xl uppercase tracking-tight md:text-3xl">
                  {cat.category}
                </h2>
                <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-muted">
                  {cat.items.map((item) => (
                    <details
                      key={item.q}
                      className="group bg-background open:bg-muted"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold transition hover:text-accent md:text-base">
                        <span>{item.q}</span>
                        <span
                          aria-hidden="true"
                          className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-base transition group-open:rotate-45 group-open:border-accent group-open:text-accent"
                        >
                          +
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-sm text-muted-foreground md:text-base">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={0.1}>
            <div className="mt-12 rounded-2xl border border-border bg-muted p-6 text-center md:p-8">
              <p className="font-display text-lg uppercase tracking-tight md:text-xl">
                Non hai trovato la tua risposta?
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Scrivici a{" "}
                <a href="mailto:hello@narte.it" className="text-accent underline">
                  hello@narte.it
                </a>{" "}
                oppure prenota una chiamata gratuita dalla sezione{" "}
                <a href="/artisti" className="text-accent underline">
                  Consulente N&apos;arte
                </a>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
