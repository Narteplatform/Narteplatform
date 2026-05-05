import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";

export function AboutBlock() {
  return (
    <section className="container-narte py-16">
      <Reveal>
        <p className="accent-label mb-6">chi siamo</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="display-xl text-3xl md:text-5xl lg:text-6xl">
          Dal 2018 portiamo la musica dal vivo a Napoli{" "}
          <span className="inline-block align-middle h-10 w-10 md:h-14 md:w-14 overflow-hidden rounded-sm">
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=300&q=70"
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          <br />
          oltre 100 artisti emergenti, 30+ location iconiche.
        </h2>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mx-auto mt-8 max-w-2xl text-center text-base text-muted-foreground md:text-lg">
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
    </section>
  );
}
