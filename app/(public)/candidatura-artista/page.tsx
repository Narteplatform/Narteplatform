import Link from "next/link";
import { Check } from "lucide-react";
import { ArtistApplicationForm } from "@/components/forms/ArtistApplicationForm";
import { Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/marketing/PageHero";
import { heroImageConContenuti } from "@/lib/content/hero-images";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { ArtistBenefits } from "@/components/marketing/ArtistBenefits";
import { ArtistProfilePreview } from "@/components/marketing/ArtistProfilePreview";
import { ArtistHowItWorks } from "@/components/marketing/ArtistHowItWorks";
import { ArtistComparison } from "@/components/marketing/ArtistComparison";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { createAdminClient } from "@/lib/supabase/server";
import { serializeJsonForScript } from "@/lib/security/json-script";
import { FAQ } from "@/lib/content/artist-landing";
import { NARTE_STATS } from "@/lib/content/stats";
import { getContenuti } from "@/lib/content/site-settings-server";
import { invitoDaCookie } from "@/lib/inviti/cookie";
import { getGenreOptions } from "@/lib/content/generi";
import { BannerInvito } from "@/components/inviti/BannerInvito";

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
  const [genreOptions, c, invito] = await Promise.all([getGenreOptions(), getContenuti(), invitoDaCookie()]);

  return (
    <>
      <script
        type="application/ld+json"
        // Sempre dal serializzatore unico: anche testi nostri non devono poter
        // chiudere il tag <script> (vedi lib/security/json-script.ts).
        dangerouslySetInnerHTML={{ __html: serializeJsonForScript(faqJsonLd()) }}
      />

      {/* 1 — HERO */}
      <PageHero
        image={await heroImageConContenuti("candidatura-artista")}
        label="per gli artisti"
        title="Sei un artista?"
        description={c["artisti.hero.descrizione"]}
      >
        <div className="flex flex-col items-center gap-8">
          {invito && <BannerInvito chi={invito} />}
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
      <ArtistHowItWorks titolo={c["artisti.passi.titolo"]} sottotitolo={c["artisti.passi.sottotitolo"]} />

      {/* 5 — CONFRONTO */}
      <ArtistComparison />

      {/* 6 — STORIE: sezione RIMOSSA di proposito. Le testimonianze erano
          segnaposto inventati: pubblicarle è pratica commerciale scorretta
          (Cod. consumo, all. I, punto 23-quater). Reinserire <ArtistTestimonials>
          solo con testimonianze reali e documentabili. */}

      {/* 7 — PIANI. ctaHref punta al form: senza, i tre bottoni linkerebbero
          questa stessa pagina e ricaricherebbero senza portare da nessuna parte. */}
      <PricingSection
        label="i piani"
        title="Il profilo è gratuito. I piani a pagamento sono facoltativi."
        description={
          <>
            Con il piano gratuito hai la pagina pubblica, il calendario e
            richieste di booking illimitate, e tratti via email con chi ti
            scrive. I piani a pagamento servono se vuoi la chat con le offerte a
            compenso, caricare più materiale e comparire più in alto.
          </>
        }
        ctaHref="#candidatura"
      />

      {/* 8 — FAQ */}
      <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
        <div className="container-narte">
          <SectionHeading
            label="domande frequenti"
            title="Le risposte alle domande più comuni."
          />
          <Reveal delay={0.2}>
            {/* La prima aperta di default fa capire a colpo d'occhio che le
                righe si aprono, ed è anche l'obiezione numero uno. */}
            <FaqAccordion
              items={FAQ}
              defaultOpenId="costo"
              className="mx-auto mt-10 max-w-3xl md:mt-14"
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
        <div className="container-narte relative z-10">
          <SectionHeading
            label="candidatura"
            title="Invia la tua candidatura."
            description={
              <>
                Non servono un press kit o un disco pubblicato: basta qualcosa da
                ascoltare. Leggiamo ogni candidatura e rispondiamo a tutti via
                email, anche quando l&rsquo;esito è negativo.
              </>
            }
          />

          {/* Le tre rassicurazioni sopra il form, non accanto: sono l'ultima
              obiezione da togliere prima che qualcuno inizi a scrivere. */}
          <Reveal delay={0.25}>
            <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2.5">
              {[
                "Iscrizione gratuita, nessuna carta",
                "Nessuna esclusiva",
                "Il cachet lo decidi tu",
              ].map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground md:text-sm"
                >
                  <Check aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lg)] md:mt-12 md:p-8">
              <h3 className="text-center font-display text-2xl md:text-3xl">
                Inviaci la tua candidatura
              </h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Dopo la revisione ricevi un&rsquo;email per completare il profilo
                e gestire le disponibilità.
              </p>
              <div className="mt-6">
                <ArtistApplicationForm genreOptions={genreOptions} invitatoDa={invito?.stageName ?? null} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
