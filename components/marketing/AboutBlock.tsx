import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";

export function AboutBlock() {
  return (
    <section className="container-narte py-16">
      <Reveal>
        <p className="accent-label mb-6">about us</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="display-xl text-3xl md:text-5xl lg:text-6xl">
          Trova la tua vibe.{" "}
          <span className="inline-block align-middle h-10 w-10 md:h-14 md:w-14 overflow-hidden rounded-sm">
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=300&q=70"
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          <br />
          Scopri arte, musica e cultura intorno alla città.
        </h2>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/eventi">trova un evento</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
