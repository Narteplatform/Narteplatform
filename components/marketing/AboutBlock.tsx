import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";
import { NARTE_ARTISTS, NARTE_EVENTS, NARTE_SINCE } from "@/lib/content/stats";

export function AboutBlock() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte text-center">
        <Reveal>
          <p className="accent-label mb-6">chi c&rsquo;è dall&rsquo;altra parte</p>
        </Reveal>
        <Reveal delay={0.1}>
          {/* text-balance distribuisce le righe in modo simmetrico da solo:
              un <br /> fisso si spezzava male alle larghezze intermedie. */}
          <h2 className="display-xl mx-auto max-w-3xl text-balance text-3xl text-notte md:text-5xl lg:text-6xl">
            Dal {NARTE_SINCE} riempiamo palchi a Napoli. {NARTE_EVENTS} eventi
            prodotti, {NARTE_ARTISTS} artisti che sappiamo dove mettere.
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-base text-notte/70 md:text-lg">
            N&rsquo;arte è nata organizzando serate, non scrivendo software.
            Sappiamo chi regge una piazza e chi rende di più in una sala da cento
            posti, perché li abbiamo visti suonare. Quello che trovi qui dentro è
            la nostra agenda, aperta.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild variant="default" size="lg">
              <Link href="/artisti">Sfoglia il roster</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/chi-siamo">Come siamo arrivati qui</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
