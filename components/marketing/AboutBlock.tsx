import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";
import { NARTE_SINCE } from "@/lib/content/stats";

/**
 * "Cosa è N'arte": testo a sinistra, immagine a destra.
 *
 * Il blocco era interamente centrato e senza immagini: tre elementi centrati di
 * fila (occhiello, titolo, paragrafo) leggono come una lapide, e la home non
 * mostrava una sola persona fino alla sezione artisti. Qui il testo prende
 * l'allineamento a sinistra — che su un paragrafo di tre righe si legge meglio,
 * perché l'occhio ritrova sempre lo stesso margine — e a destra entra la foto.
 *
 * L'immagine è quella dell'hero, ritagliata in verticale: è l'unica foto vera di
 * un artista N'arte sul palco presente nel progetto. Va sostituita appena arriva
 * la definitiva — basta cambiare le tre costanti qui sotto.
 */
const FOTO = "/hero-terrazza.webp";
const FOTO_ALT =
  "Un artista canta con la chitarra durante una serata N'arte";
const FOTO_PRIORITARIA = false;

export function AboutBlock() {
  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Colonna testo */}
          <div className="order-2 text-left lg:order-1">
            <Reveal>
              <p className="accent-label mb-6">cosa è N&rsquo;arte</p>
            </Reveal>
            <Reveal delay={0.1}>
              {/* text-balance distribuisce le righe in modo simmetrico da solo:
                  un <br /> fisso si spezzava male alle larghezze intermedie. */}
              <h2 className="display-xl max-w-xl text-balance text-3xl text-notte md:text-5xl">
                Dal {NARTE_SINCE} diamo palchi agli artisti e musica vera ai
                locali che la cercano
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-xl text-pretty text-base text-notte/70 md:text-lg">
                N&rsquo;arte è nata con una missione chiara: fare in modo che
                anche i talenti emergenti trovino un palco, aumentando la qualità
                dell&rsquo;offerta musicale di locali e organizzazioni.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild variant="default" size="lg">
                  <Link href="/artisti">Sfoglia il roster</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/chi-siamo">Come siamo arrivati qui</Link>
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Colonna immagine */}
          <Reveal delay={0.15} className="order-1 lg:order-2">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-notte/5">
              <Image
                src={FOTO}
                alt={FOTO_ALT}
                fill
                priority={FOTO_PRIORITARIA}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
