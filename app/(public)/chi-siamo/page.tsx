import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Handshake, Megaphone, Users } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { heroImageFor } from "@/lib/content/hero-images";
import { MilestonesTimeline } from "@/components/marketing/MilestonesTimeline";
import { Button } from "@/components/ui/Button";
import { MILESTONES } from "@/lib/content/milestones";
import { NARTE_STATS, NARTE_SINCE } from "@/lib/content/stats";

export const metadata = { title: "Chi siamo — N'arte" };

/**
 * RITMO DELLA PAGINA — l'alternanza è la struttura, non una decorazione.
 *
 *   hero            blu    (notte + foto + alone)
 *   il fondatore    bianco (palco)
 *   le tappe        blu
 *   la missione     bianco
 *   i numeri        blu
 *   entra in N'arte bianco  → il footer (notte) chiude sul contrasto massimo
 *
 * Prima erano sei fasce tutte sullo stesso notte, distinte solo da un `bg-muted`
 * quasi invisibile e da qualche `border-t`: scorrendo non si capiva dove finisse
 * una sezione e iniziasse la successiva. Il cambio di fondo fa quel lavoro da
 * solo e rende inutili i bordi di separazione, che infatti qui non ci sono.
 *
 * Regole per aggiungere o spostare una fascia:
 * 1. si alterna sempre — due fasce dello stesso colore di fila spezzano il ritmo;
 * 2. l'ultima fascia prima del footer resta chiara (footer = notte);
 * 3. sulle fasce chiare i token semantici NON valgono (le pagine pubbliche
 *    girano in `data-theme="dark"`): il testo va scritto con `text-notte` e
 *    `text-notte/70`, come nelle fasce chiare della home;
 * 4. sulle fasce blu l'occhiello va in `text-azzurro-pale`: l'azzurro di brand
 *    su notte sta a 3,1:1 e non passa AA a 12px.
 */

/** Le voci di "cosa facciamo": un'icona per riga, per leggerle a colpo d'occhio. */
const COSA_FACCIAMO = [
  {
    icon: CalendarDays,
    text: "Organizziamo eventi musicali, festival e serate culturali",
  },
  {
    icon: Megaphone,
    text: "Promuoviamo artisti emergenti tramite il nostro roster",
  },
  {
    icon: Users,
    text: "Mettiamo in contatto organizzatori e artisti per nuovi booking",
  },
  {
    icon: Handshake,
    text: "Costruiamo collaborazioni con realtà locali",
  },
];

/**
 * Sintesi della biografia qui sotto: dà tre appigli a chi scorre senza leggere
 * il paragrafo. Non aggiunge informazioni, le ripete in forma scansionabile.
 */
const FONDATORE_CHIPS = [
  "8+ anni nel settore",
  "Direzione artistica",
  "Eventi in tutta Italia",
];

/**
 * Alone azzurro in cima alle fasce blu. Senza, il notte (#0d1b2a) legge come
 * nero e l'alternanza diventa "bianco/nero" invece di "bianco/blu". È centrato
 * sul bordo superiore e per metà fuori dalla fascia: il taglio lo fa
 * `overflow-hidden` della sezione.
 */
function AloneBlu() {
  return (
    <div
      aria-hidden="true"
      className="hero-glow-ring pointer-events-none absolute left-1/2 top-0 h-[440px] w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-60"
    />
  );
}

export default function ChiSiamoPage() {
  return (
    <>
      <PageHero
        image={heroImageFor("chi-siamo")}
        label="chi siamo"
        title="Chi siamo"
        description={
          <>
            La piattaforma N&rsquo;arte offre visibilità ad artisti emergenti mettendoli in
            contatto con gli organizzatori di eventi e locali.
          </>
        }
      />

      {/* ── BIANCO — IL FONDATORE ─────────────────────────────────────────── */}
      <section className="bg-palco py-20 text-notte md:py-28">
        {/* Colonna foto a larghezza fissa: il cerchio deve restare un cerchio,
            quindi non segue una frazione della griglia. */}
        <div className="container-narte grid gap-10 md:grid-cols-[auto_1fr] md:items-center md:gap-14 lg:gap-20">
          <Reveal>
            <div className="relative mx-auto w-56 sm:w-64 md:mx-0 md:w-72 lg:w-80">
              {/* L'alone stacca il ritratto dal fondo chiaro senza aggiungere
                  una cornice pesante. */}
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-full bg-azzurro/10 blur-2xl"
              />
              <div className="relative aspect-square overflow-hidden rounded-full border border-palco-60 bg-palco-80">
                <Image
                  src="/brand/fondatore-eduardo.jpg"
                  alt="Eduardo Castronuovo, fondatore di N'arte, sul palco"
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, 224px"
                  className="object-cover"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {/* Centrato finché il testo sta sotto la foto invece che accanto. */}
            <div className="text-center md:text-left">
              <p className="accent-label mb-3">il fondatore</p>
              <h2 className="display-xl text-4xl text-notte md:text-5xl">
                Eduardo Castronuovo
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-notte/70 md:mx-0 md:text-lg">
                Giovane visionario fondatore di N&rsquo;arte e presente nel settore della musica
                da oltre 8 anni. Eduardo ha dato la possibilità a tantissimi giovani emergenti
                di crescere ed esprimersi su migliaia di palchi, gestendo anche la direzione
                artistica di grandi eventi in tutta Italia.
              </p>
              <ul className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start">
                {FONDATORE_CHIPS.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-palco-60 bg-white px-4 py-1.5 text-sm font-semibold text-notte/80"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BLU — LE TAPPE ────────────────────────────────────────────────── */}
      {/* `[--color-accent:…]` vale per tutto il sottoalbero: la timeline usa i
          token (`text-accent`, `ring-accent`) e diventa leggibile sul blu senza
          che il componente sappia su che fondo sta. */}
      <section className="relative overflow-hidden bg-notte py-20 [--color-accent:var(--color-azzurro-pale)] md:py-28">
        <AloneBlu />
        <div className="container-narte relative">
          <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
            <Reveal>
              <p className="accent-label mb-3 text-azzurro-pale">le tappe</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl md:text-6xl">
                Come siamo arrivati fin qui.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 text-pretty text-base text-muted-foreground md:text-lg">
                Otto anni, una città e un mucchio di serate. Tocca una tappa per
                leggerne la storia.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.25}>
            <MilestonesTimeline items={MILESTONES} className="mt-12 md:mt-16" />
          </Reveal>
        </div>
      </section>

      {/* ── BIANCO — LA MISSIONE ──────────────────────────────────────────── */}
      <section className="bg-palco py-20 text-notte md:py-28">
        <div className="container-narte grid gap-12 md:grid-cols-2 md:items-start md:gap-16">
          <div className="text-center md:text-left">
            <Reveal>
              <p className="accent-label mb-3">la nostra missione</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl text-notte md:text-5xl lg:text-6xl">
                Dare voce a chi crea cultura.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-notte/70 md:mx-0 md:text-lg">
                Sosteniamo musicisti, performer e creativi emergenti costruendo occasioni
                concrete: serate, festival, format originali. Diamo spazio, contesto e
                visibilità — non solo un palco.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-palco-60 bg-white p-6 md:p-8">
              <h3 className="font-display text-xl text-notte md:text-2xl">
                Un ecosistema completo.
              </h3>
              <ul className="mt-6 space-y-4">
                {COSA_FACCIAMO.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="mt-px inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-azzurro-subtle text-azzurro">
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="text-pretty text-base leading-relaxed text-notte/80">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BLU — I NUMERI ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-notte py-20 md:py-28">
        <AloneBlu />
        <div className="container-narte relative">
          <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
            <Reveal>
              <p className="accent-label mb-3 text-azzurro-pale">i numeri</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl md:text-6xl">
                Dal {NARTE_SINCE}, una rete in continua crescita.
              </h2>
            </Reveal>
          </div>

          {/* Tre colonne aperte al posto delle card riquadrate: sul blu il
              riquadro chiuso spezzava la fascia in tre blocchi e i numeri —
              che sono il contenuto — perdevano peso. Il filetto in cima basta
              a tenerli allineati. */}
          <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8 md:mt-16">
            {NARTE_STATS.map((s, i) => (
              <Reveal key={s.label} delay={0.1 * (i + 1)}>
                <div className="relative border-t border-notte-60 pt-6">
                  <span
                    aria-hidden="true"
                    className="absolute -top-px left-0 h-px w-12 bg-azzurro-pale"
                  />
                  <p className="font-display text-5xl tabular-nums md:text-6xl lg:text-7xl">
                    {s.value}
                  </p>
                  <p className="mt-3 text-sm uppercase tracking-[0.12em] text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BIANCO — CTA ──────────────────────────────────────────────────── */}
      <section className="bg-palco py-20 text-notte md:py-28">
        <div className="container-narte text-center">
          <Reveal>
            <p className="accent-label mb-3">entra in N&rsquo;arte</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
              Vuoi farne parte?
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-notte/70 md:text-lg">
              Sei un artista, un organizzatore o una realtà culturale? Costruiamo qualcosa
              insieme.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            {/* `ring-offset-palco`: l'offset del focus ring segue il tema della
                pagina (notte) e su fondo chiaro disegnerebbe un alone scuro. */}
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="focus-visible:ring-offset-palco">
                <Link href="/candidatura-artista">
                  Candidati come artista
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="focus-visible:ring-offset-palco"
              >
                <Link href="/contatti">Contattaci</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
