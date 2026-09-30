import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { incassiDelMese } from "@/lib/billing/incassi";
import { formatPrice } from "@/lib/billing/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abbonamenti — N'arte Admin" };

function meseCorrente(): string {
  const oggi = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  return `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}`;
}

function meseSpostato(mese: string, delta: number): string {
  const [a, m] = mese.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Incassi degli abbonamenti del mese, da passare al commercialista per la
 * fatturazione elettronica (regime forfettario: niente IVA, fattura SdI per
 * ogni incasso, bollo di 2 € sopra 77,47 €). Sola lettura da Stripe.
 */
export default async function AdminAbbonamentiPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  await requireAdminPageAccess("abbonamenti");
  const richiesto = (await searchParams).mese;
  const mese = richiesto && /^\d{4}-\d{2}$/.test(richiesto) ? richiesto : meseCorrente();
  const esito = await incassiDelMese(mese);
  const totale = esito.ok ? esito.incassi.reduce((s, i) => s + i.importoCent, 0) : 0;
  const bolli = esito.ok ? esito.incassi.filter((i) => i.bolloDovuto).length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Abbonamenti — incassi</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Gli incassi del mese letti da Stripe, con i dati per emettere la fattura elettronica.
          Regime forfettario: nessuna IVA; su ogni fattura oltre 77,47 € va applicata la marca da
          bollo di 2 €. Stripe non trasmette al Sistema di Interscambio: il file va consegnato al
          commercialista o caricato nel gestionale di fatturazione.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/admin/abbonamenti?mese=${meseSpostato(mese, -1)}`} className="underline underline-offset-4">
          ← Mese precedente
        </Link>
        <span className="font-medium">{mese}</span>
        <Link href={`/admin/abbonamenti?mese=${meseSpostato(mese, 1)}`} className="underline underline-offset-4">
          Mese successivo →
        </Link>
        {esito.ok && esito.incassi.length > 0 && (
          <a
            href={`/admin/abbonamenti/export?mese=${mese}`}
            className="ml-auto rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            Scarica CSV per il commercialista
          </a>
        )}
      </div>

      {!esito.ok ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{esito.error}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {esito.incassi.length} incassi · totale {formatPrice(totale)} · bollo dovuto su {bolli}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {esito.incassi.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun incasso in questo mese.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">CF / P.IVA</th>
                    <th className="py-2 pr-4">Descrizione</th>
                    <th className="py-2 pr-4 text-right">Importo</th>
                    <th className="py-2">Bollo</th>
                  </tr>
                </thead>
                <tbody>
                  {esito.incassi.map((i) => (
                    <tr key={i.idFattura} className="border-t border-border align-top">
                      <td className="py-2 pr-4 whitespace-nowrap">{i.data}</td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{i.cliente || "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.email}</div>
                        <div className="text-xs text-muted-foreground">{i.indirizzo}</div>
                      </td>
                      <td className="py-2 pr-4">{i.codiceFiscaleOPartitaIva || "—"}</td>
                      <td className="py-2 pr-4">{i.descrizione}</td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap">{formatPrice(i.importoCent)}</td>
                      <td className="py-2">{i.bolloDovuto ? "sì" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
