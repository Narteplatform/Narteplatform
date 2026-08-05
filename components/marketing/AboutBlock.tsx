import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";
import { NARTE_SINCE } from "@/lib/content/stats";

export function AboutBlock() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte text-center">
        <Reveal>
          <p className="accent-label mb-6">cosa è N&rsquo;arte</p>
        </Reveal>
        <Reveal delay={0.1}>
          {/* text-balance distribuisce le righe in modo simmetrico da solo:
              un <br /> fisso si spezzava male alle larghezze intermedie. */}
          <h2 className="display-xl mx-auto max-w-3xl text-balance text-3xl text-notte md:text-5xl lg:text-6xl">
            Dal {NARTE_SINCE} diamo palchi agli artisti e musica vera ai locali
            che la cercano
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-base text-notte/70 md:text-lg">
            N&rsquo;arte è nata con una missione chiara: fare in modo che anche i
            talenti emergenti trovino un palco, aumentando la qualità
            dell&rsquo;offerta musicale di locali e organizzazioni.
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
