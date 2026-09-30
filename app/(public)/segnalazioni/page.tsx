import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { ContentReportForm } from "@/components/forms/ContentReportForm";
import { getCurrentUser } from "@/lib/auth/guards";
import { REPORT_REFERENCE_RE, REPORT_TARGET_TYPES, type ReportTargetType } from "@/lib/validators/schemas";

export const metadata = { title: "Segnala un contenuto — N'arte" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function SegnalazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const tipoGrezzo = first(sp.tipo);
  const tipo: ReportTargetType =
    tipoGrezzo in REPORT_TARGET_TYPES && tipoGrezzo !== "decisione"
      ? (tipoGrezzo as ReportTargetType)
      : "profilo";

  // Solo percorsi interni: un indirizzo esterno arrivato dalla querystring non
  // viene precompilato, per non trasformare la pagina in un veicolo di link.
  const urlGrezzo = first(sp.url);
  const url = urlGrezzo.startsWith("/") && !urlGrezzo.startsWith("//") ? urlGrezzo.slice(0, 500) : "";

  const reclamoGrezzo = first(sp.reclamo).trim();
  const reclamo = REPORT_REFERENCE_RE.test(reclamoGrezzo) ? reclamoGrezzo.toUpperCase() : "";
  const isReclamo = reclamo !== "";

  const user = await getCurrentUser();

  return (
    <>
      <PageHero
        label={isReclamo ? "reclamo" : "segnalazioni"}
        title={isReclamo ? "Contesta una decisione" : "Segnala un contenuto"}
        description={
          isReclamo ? (
            <>
              Se ritieni che una decisione di N&rsquo;arte sia sbagliata puoi presentare reclamo{" "}
              <strong>entro 6 mesi</strong> dalla decisione. Lo riesamina una persona del team e ti
              rispondiamo con una nuova motivazione. Restano salvi gli altri rimedi previsti dalla
              legge.
            </>
          ) : (
            <>
              Hai trovato qualcosa che ritieni illecito o contrario alle regole della piattaforma?
              Dicci dove si trova e perché.
            </>
          )
        }
      />

      <section className="bg-muted py-16 md:py-24">
        <div className="container-narte grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
              {isReclamo ? null : (
                <>
                  <div>
                    <h2 className="font-display text-lg text-foreground">Cosa puoi segnalare</h2>
                    <p className="mt-1">
                      Profili, foto, video e audio, recensioni, messaggi in chat: contenuti illeciti,
                      che violano il diritto d&rsquo;autore o mostrano dati e immagini di terzi senza
                      consenso, recensioni false o offensive, molestie, minacce, spam e truffe.
                    </p>
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-foreground">Cosa succede dopo</h2>
                    <p className="mt-1">
                      Ti mandiamo subito un riferimento via email. Prendiamo in carico la segnalazione
                      entro <strong>2 giorni lavorativi</strong> e, di norma, ti comunichiamo l&rsquo;esito
                      con la motivazione entro <strong>7 giorni lavorativi</strong>. Chi ha pubblicato il
                      contenuto viene informato della decisione e può contestarla.
                    </p>
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-foreground">Se è urgente</h2>
                    <p className="mt-1">
                      Nei casi gravi (minacce, rischio per una persona) intervengono per prime le
                      segnalazioni urgenti: indicalo nella descrizione. In caso di pericolo immediato
                      rivolgiti prima alle autorità.
                    </p>
                  </div>
                </>
              )}
              {isReclamo && (
                <div>
                  <h2 className="font-display text-lg text-foreground">Come funziona</h2>
                  <p className="mt-1">
                    Spiegaci perché la decisione è, secondo te, sbagliata. La riesamina una persona
                    del team che non l&rsquo;ha presa: ti scriviamo l&rsquo;esito con il motivo. Il
                    riferimento a destra è quello della decisione che stai contestando.
                  </p>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
              <ContentReportForm
                defaultName={user?.profile?.full_name ?? ""}
                defaultEmail={user?.email ?? ""}
                defaultTargetType={tipo}
                defaultTargetUrl={url}
                contestedReference={reclamo}
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
