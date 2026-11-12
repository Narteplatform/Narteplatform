import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock, Gift, Send, Sparkles, UserCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/components/ui/KpiCard";
import { LinkInvito } from "@/components/inviti/LinkInvito";
import { invitiVisibili } from "@/lib/inviti/modalita";
import { statoInviti } from "@/lib/inviti/stato";
import {
  BADGE_STATO,
  CREDITO_PREMIO_CENT,
  ETICHETTA_STATO,
  GIORNI_ATTESA,
  TETTO_ANNUO,
  formatData,
  formatEuro,
} from "@/lib/inviti/regole";

export const metadata = { title: "Invita un artista — N'arte" };
export const dynamic = "force-dynamic";

const PASSI = [
  {
    icon: Send,
    titolo: "Condividi il tuo link",
    testo: "Mandalo agli artisti che conosci: su WhatsApp, per email o dove preferisci.",
  },
  {
    icon: UserCheck,
    titolo: "Si candida e viene approvato",
    testo: "Il team N'arte valuta la candidatura come per tutti. Tu vedi a che punto è.",
  },
  {
    icon: CalendarCheck,
    titolo: "Si abbona: ricevi 1 mese di Pro",
    testo: `Quando sceglie un piano a pagamento, dopo ${GIORNI_ATTESA} giorni il mese è tuo.`,
  },
];

export default async function InvitaPage() {
  if (!invitiVisibili()) notFound();
  const user = await requireRole(["artist", "superadmin"]);
  const stato = await statoInviti(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Invita un artista, guadagna mesi di Pro</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Per ogni artista che entra su N&apos;arte dal tuo link e si abbona a un piano a pagamento,
          ricevi 1 mese di N&apos;arte Pro. I mesi si sommano, fino a {TETTO_ANNUO} l&apos;anno.
        </p>
      </header>

      {!stato.disponibile ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {stato.motivo === "migrazione"
              ? "Il programma inviti sarà disponibile a breve."
              : (stato.messaggio ?? "Il programma inviti non è disponibile in questo momento.")}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-accent/30">
            <CardContent className="pt-6">
              <LinkInvito link={stato.link} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Mesi guadagnati"
              value={stato.premiTotali}
              icon={<Gift className="size-4" />}
              sublabel={stato.premiTotali === 1 ? "1 artista si è abbonato" : `${stato.premiTotali} artisti si sono abbonati`}
            />
            <KpiCard
              label="In arrivo"
              value={stato.inAttesa}
              icon={<Clock className="size-4" />}
              sublabel={`Si confermano ${GIORNI_ATTESA} giorni dopo il pagamento`}
            />
            <KpiCard
              label="Quest'anno"
              value={`${stato.premiAnno}/${TETTO_ANNUO}`}
              icon={<Sparkles className="size-4" />}
              sublabel={
                stato.rimastiAnno > 0
                  ? `Puoi guadagnare ancora ${stato.rimastiAnno} ${stato.rimastiAnno === 1 ? "mese" : "mesi"}`
                  : "Tetto raggiunto: si riparte il 1° gennaio"
              }
            />
            <PremioCard proFinoAl={stato.proFinoAl} creditoCent={stato.creditoCent} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Come funziona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-5 md:grid-cols-3">
                {PASSI.map((p, i) => (
                  <li key={p.titolo} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <p.icon aria-hidden="true" className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Passo {i + 1}</p>
                      <p className="mt-0.5 font-medium">{p.titolo}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{p.testo}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">I tuoi inviti</CardTitle>
            </CardHeader>
            <CardContent>
              {stato.inviti.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-medium">Ancora nessun invito</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Conosci un artista che suona dal vivo? Mandagli il tuo link: quando si candida lo vedi
                    comparire qui.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {stato.inviti.map((i) => (
                    <li key={i.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.nome}</p>
                        <p className="text-xs text-muted-foreground">Dal {formatData(i.creatoIl)}</p>
                      </div>
                      <Badge variant={BADGE_STATO[i.status]} className="self-start sm:self-auto">
                        {i.status === "in_attesa" && i.confermaIl
                          ? `Abbonato · premio il ${formatData(i.confermaIl)}`
                          : ETICHETTA_STATO[i.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <details className="group rounded-2xl border border-border bg-background p-5">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              Le regole in breve
              <span className="ml-2 text-sm font-normal text-muted-foreground group-open:hidden">Mostra</span>
            </summary>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Il premio scatta quando l&apos;artista invitato paga un piano a pagamento ed è confermato{" "}
                {GIORNI_ATTESA} giorni dopo, se nel frattempo non ha esercitato il recesso.
              </li>
              <li>
                Se sei sul piano Free ricevi 30 giorni di Pro, che si sommano a quelli che hai già. Se hai
                già un abbonamento ricevi {formatEuro(CREDITO_PREMIO_CENT)} di credito, scalati dalle prossime
                fatture.
              </li>
              <li>
                Se ti abboni mentre hai ancora giorni di Pro dagli inviti, quelli che restano diventano credito:
                non perdi nulla.
              </li>
              <li>Vale per artisti nuovi su N&apos;arte. Non si può invitare sé stessi né un account già esistente.</li>
              <li>Fino a {TETTO_ANNUO} mesi per anno solare. Il premio non si converte in denaro e non si cede.</li>
            </ul>
            <p className="mt-4 text-sm">
              <Link href="/help/pagamenti/invita-un-artista" className="underline underline-offset-4">
                Tutti i dettagli nel Centro assistenza
              </Link>
            </p>
          </details>
        </>
      )}
    </div>
  );
}

function PremioCard({ proFinoAl, creditoCent }: { proFinoAl: string | null; creditoCent: number }) {
  if (proFinoAl) {
    return (
      <KpiCard
        label="Pro dagli inviti"
        value="Attivo"
        icon={<Gift className="size-4" />}
        sublabel={`Fino al ${formatData(proFinoAl)}`}
      />
    );
  }
  if (creditoCent > 0) {
    return (
      <KpiCard
        label="Credito dagli inviti"
        value={formatEuro(creditoCent)}
        icon={<Gift className="size-4" />}
        sublabel="Scalato in automatico dalle fatture"
      />
    );
  }
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-dashed border-border p-5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Il tuo premio</span>
      <p className="mt-4 text-sm text-muted-foreground">Comparirà qui il primo mese di Pro che guadagni.</p>
      <Button asChild variant="link" size="sm" className="mt-2 h-auto self-start p-0">
        <Link href="/dashboard/abbonamento">Vedi i vantaggi del Pro</Link>
      </Button>
    </div>
  );
}
