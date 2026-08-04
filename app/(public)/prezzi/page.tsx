import Link from "next/link";
import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { heroImageFor } from "@/lib/content/hero-images";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Piani e prezzi — N'arte",
  description:
    "N'arte Free, Pro e Max: scegli il piano per farti trovare dagli organizzatori. Richieste di booking illimitate su ogni piano.",
};

export default function PrezziPage() {
  return (
    <>
      <PageHero
        image={heroImageFor("prezzi")}
        label="piani e prezzi"
        title={
          <>
            Scegli quanto <br className="hidden md:block" />
            farti trovare.
          </>
        }
        description={
          <>
            Le richieste di booking sono <strong>illimitate su ogni piano</strong>, anche quello
            gratuito: non blocchiamo mai un organizzatore che ti sta cercando. Con Pro e Max
            sblocchi la chat, le recensioni e la visibilità.
          </>
        }
      />

      <section className="border-b border-border py-16 md:py-24">
        <div className="container-narte">
          <Reveal>
            <PlanComparison />
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-narte">
          <Reveal>
            <div className="mx-auto max-w-2xl space-y-8">
              <h2 className="font-display text-2xl tracking-tight">Domande frequenti</h2>

              <div className="space-y-6 text-sm">
                <div>
                  <p className="font-medium">Il piano vale per un artista o per l&rsquo;account?</p>
                  <p className="mt-1 text-muted-foreground">
                    Per l&rsquo;account. Con Pro gestisci 2 profili artista, con Max fino a 5, e
                    tutti ereditano i vantaggi del piano: paghi una volta sola. È pensato per band,
                    manager e agenzie.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Con il piano gratuito ricevo comunque richieste?</p>
                  <p className="mt-1 text-muted-foreground">
                    Sì, illimitate, e ti avvisiamo via email a ogni richiesta. Per rispondere in
                    chat e negoziare serve Pro.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Cosa succede se disdico?</p>
                  <p className="mt-1 text-muted-foreground">
                    Il piano resta attivo fino alla fine del periodo già pagato. Dopo, foto, video e
                    profili oltre i limiti del piano gratuito vengono nascosti, ma{" "}
                    <strong>non vengono mai cancellati</strong>: se torni, ricompare tutto
                    com&rsquo;era.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Come funziona il badge Verificato N&rsquo;arte?</p>
                  <p className="mt-1 text-muted-foreground">
                    È incluso in Pro e Max e compare sul profilo appena attivi il piano: non devi
                    richiederlo né aspettare un&rsquo;approvazione. Dice agli organizzatori che
                    dietro il profilo c&rsquo;è un artista che sta lavorando sul serio. Con Max hai
                    anche l&rsquo;etichetta <strong>TOP Artist</strong> e la fascia in evidenza in
                    cima alla pagina Artisti.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Cosa vuol dire &ldquo;ti candidiamo a 2 eventi al mese&rdquo;?</p>
                  <p className="mt-1 text-muted-foreground">
                    Sul piano Max ci pensiamo noi: ogni mese il team ti propone ad almeno due eventi
                    N&rsquo;arte in linea con il tuo profilo. Non devi cercarli né candidarti tu.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Lo shooting fotografico del piano Max?</p>
                  <p className="mt-1 text-muted-foreground">
                    È incluso una tantum nell&rsquo;abbonamento <strong>Max annuale</strong>. Dopo
                    l&rsquo;attivazione ti scriviamo per organizzarlo.
                  </p>
                </div>

                <div>
                  <p className="font-medium">Posso cambiare piano quando voglio?</p>
                  <p className="mt-1 text-muted-foreground">
                    Sì, dalla tua area riservata, in qualsiasi momento. Upgrade, downgrade e
                    disdetta sono immediati.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
                <p className="font-display text-lg tracking-tight">
                  Non sei ancora un artista N&rsquo;arte?
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Candidati: la valutazione è gratuita e il piano lo scegli dopo l&rsquo;approvazione.
                </p>
                <Button asChild variant="accent" className="mt-4">
                  <Link href="/candidatura-artista">Candidati come artista</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
