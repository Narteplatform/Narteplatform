import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";

export function AboutBlock() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte text-center">
        <Reveal>
          <p className="accent-label mb-6">chi siamo</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display-xl mx-auto max-w-4xl text-3xl text-notte md:text-5xl lg:text-6xl">
            Dal 2018 portiamo la musica dal vivo a Napoli
            <br />
            oltre 100 artisti emergenti, 30+ location iconiche.
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl text-base text-notte/70 md:text-lg">
            N&apos;arte è il progetto fondato da Eduardo Castronuovo che unisce arte e cultura per
            valorizzare il patrimonio napoletano: concerti, serate a tema e supporto a musicisti,
            pittori, fotografi e creativi.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex justify-center gap-3">
            <Button asChild variant="default" size="lg">
              <Link href="/eventi">Trova un evento</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/chi-siamo">Scopri di più</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
