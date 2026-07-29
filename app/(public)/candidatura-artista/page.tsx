import Link from "next/link";
import { ArtistApplicationForm } from "@/components/forms/ArtistApplicationForm";
import { Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/marketing/PageHero";
import { ArtistBenefits } from "@/components/marketing/ArtistBenefits";
import { ArtistProfilePreview } from "@/components/marketing/ArtistProfilePreview";
import { ArtistHowItWorks } from "@/components/marketing/ArtistHowItWorks";
import { ArtistComparison } from "@/components/marketing/ArtistComparison";
import { ArtistTestimonials } from "@/components/marketing/ArtistTestimonials";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { createAdminClient } from "@/lib/supabase/server";
import { FAQ } from "@/lib/content/artist-landing";
import { NARTE_STATS } from "@/lib/content/stats";

export const metadata = {
  title: "Sei un artista? — N'arte",
  description:
    "Fatti trovare da locali, festival e organizzatori che cercano musica dal vivo. Profilo gratuito, richieste di booking illimitate, calendario e cachet gestiti da te.",
  openGraph: {
    title: "Sei un artista? — N'arte",
    description:
      "Fatti trovare da chi cerca musica dal vivo. Profilo gratuito, richieste illimitate, il cachet lo decidi tu.",
    type: "website",
  },
};

async function getGenreOptions(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("genres")
      .select("name")
      .order("order_index", { ascending: true });
    return ((data ?? []) as unknown as { name: string }[]).map((g) => g.name);
  } catch {
    return [];
  }
}

/**
 * Dati strutturati delle FAQ.
 *
 * I pannelli chiusi sono nel DOM (FaqAccordion non li smonta), ma lo schema
 * FAQPage è comunque il modo esplicito per chiedere i rich result a Google, e
 * si genera dalla stessa fonte del testo: se cambia una risposta, cambiano
 * entrambi.
 */
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export default async function CandidaturaPage() {
  const genreOptions = await getGenreOptions();

  return (
    <>
      <script
        type="application/ld+json"
        // Contenuto nostro, non input utente: nessuna interpolazione esterna.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      {/* 1 — HERO */}
      <PageHero
        label="per gli artisti"
        title="Sei un artista?"
        description={
          <>
            Fatti trovare da chi cerca musica dal vivo. Il profilo è gratuito e
            non scade: le richieste arrivano a te, senza che tu debba scrivere a
            nessuno.
          </>
        }
      >
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="#candidatura">Candidati, è gratis</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#come-funziona">Come funziona</Link>
            </Button>
          </div>

          <dl className="grid w-full max-w-lg grid-cols-3 gap-4 border-t border-border pt-8 text-center">
            {NARTE_STATS.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-bold tabular-nums md:text-3xl">
                  {s.value}
                </dt>
                <dd className="mt-1 text-pretty text-[11px] uppercase tracking-wider text-muted-foreground md:text-xs">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </PageHero>

      {/* 2 — BENEFICI */}
      <ArtistBenefits />

      {/* 3 — ANTEPRIMA DEL PROFILO */}
      <ArtistProfilePreview />

      {/* 4 — COME FUNZIONA */}
      <ArtistHowItWorks />

      {/* 5 — CONFRONTO */}
      <ArtistComparison />

      {/* 6 — STORIE */}
      <ArtistTestimonials />

      {/* 7 — PIANI. ctaHref punta al form: senza, i tre bottoni linkerebbero
          questa stessa pagina e ricaricherebbero senza portare da nessuna parte. */}
      <PricingSection
        label="i piani"
        title="Il profilo è gratis. Il resto lo scegli quando serve."
        description={
          <>
            Con il piano gratuito hai la pagina pubblica, il calendario e
            richieste di booking illimitate. I piani a pagamento servono se vuoi
            rispondere in chat, caricare più materiale e comparire più in alto.
          </>
        }
        ctaHref="#candidatura"
      />

      {/* 8 — FAQ */}
      <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
        <div className="container-narte">
          <div className="max-w-2xl">
            <Reveal>
              <p className="accent-label mb-3">dubbi legittimi</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
                Le domande che ci fanno tutti.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            {/* Allineato a sinistra con il titolo, non centrato: `mx-auto`
                staccava la colonna delle domande dall'H2.
                La prima aperta di default fa capire a colpo d'occhio che le
                righe si aprono, ed è anche l'obiezione numero uno. */}
            <FaqAccordion
              items={FAQ}
              defaultOpenId="costo"
              className="mt-10 max-w-3xl md:mt-14"
            />
          </Reveal>
        </div>
      </section>

      {/* 9 — CANDIDATURA */}
      <section
        id="candidatura"
        className="relative overflow-hidden border-t border-border py-20 md:py-28"
      >
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2"
        />
        <div className="container-narte relative z-10 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="accent-label mb-3">candidatura</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl md:text-6xl">
                Mandaci due link e sentiamoci.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 max-w-md text-pretty text-base text-muted-foreground md:text-lg">
                Non serve un press kit, non serve un disco fuori. Serve qualcosa
                da ascoltare. Le candidature le leggiamo a mano, una per una, e
                rispondiamo a tutti via email — anche quando la risposta è no.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
                <li>· Iscrizione gratuita, nessuna carta richiesta</li>
                <li>· Nessuna esclusiva: continui a suonare dove vuoi</li>
                <li>· Il cachet lo decidi tu</li>
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lg)] md:p-8">
              <h3 className="font-display text-2xl md:text-3xl">
                Inviaci la tua candidatura
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Dopo la revisione ricevi un&rsquo;email per completare il profilo e
                gestire le disponibilità.
              </p>
              <div className="mt-6">
                <ArtistApplicationForm genreOptions={genreOptions} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
