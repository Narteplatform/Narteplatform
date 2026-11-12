import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Send, UserCheck } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ArtistBenefits } from "@/components/marketing/ArtistBenefits";
import { risolviCodice } from "@/lib/inviti/codice";
import { invitiVisibili } from "@/lib/inviti/modalita";

/**
 * Atterraggio del link «Invita un artista». Mostra il SOLO nome d'arte di chi
 * invita (niente foto, città o generi: chi non è registrato non riceve dati
 * degli artisti) e porta alla candidatura passando da /invito/{codice}/vai,
 * che imposta il cookie.
 *
 * Non indicizzata: è una pagina per persona, non un contenuto del sito.
 */
export const metadata: Metadata = {
  title: "Sei stato invitato su N'arte",
  description: "Un artista ti ha invitato su N'arte: candidati gratis e fatti trovare da chi cerca musica dal vivo.",
  robots: { index: false, follow: false },
};

const PASSI = [
  {
    icon: Send,
    titolo: "Invia la candidatura",
    testo: "Bastano qualche informazione e qualcosa da ascoltare. È gratis e senza carta.",
  },
  {
    icon: UserCheck,
    titolo: "Il team ti risponde",
    testo: "Leggiamo ogni candidatura e rispondiamo a tutti via email, anche quando l'esito è negativo.",
  },
  {
    icon: CalendarCheck,
    titolo: "Ricevi le richieste",
    testo: "Il tuo profilo è online: locali e organizzatori ti trovano e ti scrivono.",
  },
];

export default async function InvitoPage({ params }: { params: Promise<{ codice: string }> }) {
  if (!invitiVisibili()) redirect("/candidatura-artista");

  const { codice } = await params;
  const chi = await risolviCodice(codice);
  const cta = chi ? `/invito/${encodeURIComponent(chi.code)}/vai` : "/candidatura-artista#candidatura";

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-24 pb-14 md:pt-32 md:pb-20">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2"
        />
        <div className="container-narte relative z-10 flex flex-col items-center text-center">
          <Reveal>
            {chi ? (
              <>
                <Avatar name={chi.stageName} alt="" size="xl" className="mx-auto" />
                <p className="accent-label mt-6">sei stato invitato</p>
                <h1 className="mt-3 text-balance font-display text-4xl tracking-tight md:text-6xl">
                  {chi.stageName} ti invita su N&apos;arte
                </h1>
              </>
            ) : (
              <>
                <p className="accent-label">invito non più valido</p>
                <h1 className="mt-3 text-balance font-display text-4xl tracking-tight md:text-6xl">
                  Puoi candidarti comunque
                </h1>
              </>
            )}
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground md:text-lg">
              N&apos;arte mette in contatto artisti emergenti con locali, festival e organizzatori che
              cercano musica dal vivo. Il profilo è gratuito e il cachet lo decidi tu.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href={cta} prefetch={false}>
                  Invia la candidatura
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/candidatura-artista#come-funziona">Come funziona</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-narte">
          <ol className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3 md:gap-6">
            {PASSI.map((p, i) => (
              <Reveal key={p.titolo} delay={0.1 * i}>
                <li className="h-full rounded-2xl border border-border bg-card p-6">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <p.icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Passo {i + 1}</p>
                  <h2 className="mt-1 font-display text-xl tracking-tight">{p.titolo}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{p.testo}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <ArtistBenefits />

      <section className="border-t border-border py-16 text-center md:py-20">
        <div className="container-narte">
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">Pronto a farti trovare?</h2>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="accent" size="lg">
              <Link href={cta} prefetch={false}>
                Invia la candidatura
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
