import { Reveal } from "@/components/animations/Reveal";
import { EventRequestForm } from "@/components/forms/EventRequestForm";

export function EventRequestSection() {
  return (
    <section
      id="richiedi"
      className="border-t border-palco-60 bg-[#F7F5F2] py-20 text-notte md:py-28"
    >
      <div className="container-narte grid gap-12 md:grid-cols-[1fr_1.2fr]">
        <div>
          <Reveal>
            <p className="accent-label mb-3">parla con noi</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-4xl text-notte md:text-6xl">
              Vuoi realizzare un evento?
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-base text-notte/70">
              Compila il form e raccontaci la tua idea: musica live, ospiti, location.
              Costruiamo insieme l&apos;esperienza giusta. Ti rispondiamo entro 48 ore.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <ul className="mt-8 space-y-2 text-sm text-notte/70">
              <li>· Selezione artisti su misura</li>
              <li>· Gestione location e logistica</li>
              <li>· Promozione e ufficio stampa</li>
            </ul>
          </Reveal>
        </div>
        <Reveal delay={0.2}>
          <div className="rounded-2xl border border-palco-60 bg-white p-6 text-notte shadow-sm md:p-8">
            <EventRequestForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
