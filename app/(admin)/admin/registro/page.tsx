import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { leggiFiltri, leggiRegistro, TIPI_OGGETTO, etichettaAzione } from "@/lib/admin/registro";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata = { title: "Registro — N'arte Admin" };
export const dynamic = "force-dynamic";

const PER_PAGINA = 50;
/** Profondità massima: la fusione delle due tabelle legge `pagina * PER_PAGINA` righe da ciascuna. */
const PAGINA_MAX = 40;

function quando(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });
}

export default async function AdminRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ operatore?: string; tipo?: string; dal?: string; al?: string; page?: string }>;
}) {
  await requireAdminPageAccess("registro");
  const sp = await searchParams;
  const filtri = leggiFiltri(sp);
  const pagina = Math.min(PAGINA_MAX, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));

  const admin = createAdminClient();
  const [esito, operatoriRes] = await Promise.all([
    leggiRegistro(filtri, { pagina, perPagina: PER_PAGINA }),
    admin.from("profiles").select("id, full_name").eq("role", "superadmin"),
  ]);
  if (operatoriRes.error) {
    logger.warn("admin/registro", "elenco operatori non leggibile:", operatoriRes.error.message);
  }
  const operatori = operatoriRes.data ?? [];

  const base = new URLSearchParams();
  if (filtri.operatore) base.set("operatore", filtri.operatore);
  if (filtri.tipo) base.set("tipo", filtri.tipo);
  if (filtri.dal) base.set("dal", filtri.dal);
  if (filtri.al) base.set("al", filtri.al);
  const qs = base.toString();
  const href = (p: number) => {
    const x = new URLSearchParams(base);
    x.set("page", String(p));
    return `/admin/registro?${x.toString()}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Registro</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tutto ciò che il team ha fatto: decisioni, approvazioni, modifiche e accessi motivati alle
            conversazioni, dal più recente.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/admin/registro/export${qs ? `?${qs}` : ""}`}>Esporta CSV</a>
        </Button>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold">
          Operatore
          <select
            name="operatore"
            defaultValue={filtri.operatore ?? ""}
            className="mt-1 block h-10 rounded-md border-[1.5px] border-border bg-surface px-2 text-sm font-normal"
          >
            <option value="">Tutti</option>
            {operatori.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name || o.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Tipo
          <select
            name="tipo"
            defaultValue={filtri.tipo ?? ""}
            className="mt-1 block h-10 rounded-md border-[1.5px] border-border bg-surface px-2 text-sm font-normal"
          >
            <option value="">Tutti</option>
            <option value="accessi_chat">Accessi alle chat</option>
            {TIPI_OGGETTO.map((t) => (
              <option key={t} value={t}>
                {etichettaAzione(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Dal
          <Input type="date" name="dal" defaultValue={filtri.dal ?? ""} className="mt-1 font-normal" />
        </label>
        <label className="text-xs font-semibold">
          Al
          <Input type="date" name="al" defaultValue={filtri.al ?? ""} className="mt-1 font-normal" />
        </label>
        <Button type="submit" variant="outline">
          Filtra
        </Button>
        {qs && (
          <Link href="/admin/registro" className="pb-2 text-xs underline underline-offset-2">
            Azzera i filtri
          </Link>
        )}
      </form>

      {!esito.ok ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {esito.error}
        </p>
      ) : (
        <>
          {esito.avvisi.map((a) => (
            <p key={a} role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {a}
            </p>
          ))}
          <Card>
            <CardContent className="overflow-x-auto pt-4">
              {esito.righe.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna voce con questi filtri.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">Data</th>
                      <th className="px-2 py-2">Operatore</th>
                      <th className="px-2 py-2">Azione</th>
                      <th className="px-2 py-2">Oggetto</th>
                      <th className="px-2 py-2">Interessato</th>
                      <th className="px-2 py-2">Motivo</th>
                      <th className="px-2 py-2">Notifica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {esito.righe.map((r) => (
                      <tr key={`${r.fonte}-${r.id}`} className="border-t border-border align-top">
                        <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">{quando(r.at)}</td>
                        <td className="px-2 py-2">{r.operatore}</td>
                        <td className="px-2 py-2 font-medium">{r.azione}</td>
                        <td className="max-w-[16rem] break-all px-2 py-2 text-xs text-muted-foreground">{r.oggetto}</td>
                        <td className="px-2 py-2">{r.interessato}</td>
                        <td className="max-w-md whitespace-pre-wrap px-2 py-2">{r.motivo}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">{r.notifica}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 text-sm">
            {pagina > 1 && (
              <Link href={href(pagina - 1)} className="underline underline-offset-4">
                ← Precedente
              </Link>
            )}
            <span className="text-muted-foreground">
              Pagina {pagina} · {esito.totale} voci
            </span>
            {pagina * PER_PAGINA < esito.totale && pagina < PAGINA_MAX && (
              <Link href={href(pagina + 1)} className="underline underline-offset-4">
                Successiva →
              </Link>
            )}
          </div>
          {pagina >= PAGINA_MAX && (
            <p className="text-xs text-muted-foreground">
              Oltre questa profondità usa i filtri per data o l&apos;esportazione CSV.
            </p>
          )}
        </>
      )}
    </div>
  );
}
