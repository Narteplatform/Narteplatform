import { Mail, Instagram, MapPin } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Contatti — N'arte" };

export default function ContattiPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-24 pb-12 md:pt-32 md:pb-16">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">contatti</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">Parliamone.</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Per booking, collaborazioni o richieste generiche scrivici. Rispondiamo in genere
              entro 48 ore.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FORM + INFO */}
      <section className="bg-muted py-20 md:py-28">
        <div className="container-narte grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <Reveal>
              <p className="accent-label mb-3">canali diretti</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Scrivici dove preferisci.</h2>
            </Reveal>

            <Reveal delay={0.2}>
              <ul className="mt-6 space-y-3">
                <li>
                  <a
                    href="mailto:boostcreativeai@gmail.com"
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-background p-5 transition hover:border-accent"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <Mail className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                        Email
                      </span>
                      <span className="block truncate font-display text-base">
                        boostcreativeai@gmail.com
                      </span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com/narte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-background p-5 transition hover:border-accent"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <Instagram className="size-4" />
                    </span>
                    <span>
                      <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                        Instagram
                      </span>
                      <span className="block font-display text-base">@narte</span>
                    </span>
                  </a>
                </li>
                <li>
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <MapPin className="size-4" />
                    </span>
                    <span>
                      <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                        Base operativa
                      </span>
                      <span className="block font-display text-base">Napoli, IT</span>
                    </span>
                  </div>
                </li>
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
              <h2 className="font-display text-xl">Form di contatto</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compila i campi: ti rispondiamo via email.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
