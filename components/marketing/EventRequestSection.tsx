import { Reveal } from "@/components/animations/Reveal";
import { EventRequestForm } from "@/components/forms/EventRequestForm";

/**
 * `id="richiedi"` è il bersaglio della CTA secondaria della hero. L'header è
 * `absolute` e non sticky, quindi l'ancora atterra giusta senza scroll-mt: se
 * un giorno diventa sticky, va aggiunto qui.
 */
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
            <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
              Hai una richiesta specifica?
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-pretty text-base text-notte/70">
              Il team N&rsquo;arte è qui per aiutarti, compila il form sottostante
              con tutte le tue informazioni e ti forniremo la soluzione più
              adatta alle tue esigenze!
            </p>
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
