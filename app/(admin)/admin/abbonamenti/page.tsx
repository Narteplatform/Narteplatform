import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { incassiDelMese } from "@/lib/billing/incassi";
import { formatPrice } from "@/lib/billing/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

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
const PIANO: Record<string, string> = { free: "Free", pro: "Pro", max: "Max" };

function dataIt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
}

type Omaggio = {
  id: string;
  nome: string;
  piano: string;
  scadenza: string | null;
  scaduto: boolean;
  motivo: string | null;
  chi: string;
  quando: string | null;
};

/**
 * Artisti con un piano omaggio (`tier_override`) attivo o scaduto, con chi lo
 * ha concesso e quando, ricavati dal registro delle azioni. Sola lettura.
 */
async function leggiOmaggi(): Promise<{ ok: true; omaggi: Omaggio[]; avviso: string | null } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: artisti, error } = await admin
    .from("artists")
    .select("id, stage_name, tier_override, tier_override_expires_at, tier_override_reason")
    .not("tier_override", "is", null)
    .order("stage_name");
  if (error) {
    logger.error("admin/abbonamenti", "piani omaggio non leggibili:", error.message);
    return { ok: false, error: "Non riesco a leggere i piani omaggio. L'elenco non è vuoto, è non disponibile." };
  }
  const righe = artisti ?? [];
  if (righe.length === 0) return { ok: true, omaggi: [], avviso: null };

  // Chi e quando: l'ultima azione «omaggio_%» per ciascun profilo.
  let avviso: string | null = null;
  const ultima = new Map<string, { actor: string | null; at: string }>();
  const { data: azioni, error: azErr } = await admin
    .from("moderation_actions")
    .select("target_id, actor_id, created_at")
    .eq("target_type", "profilo")
    .like("action", "omaggio_%")
    .in("target_id", righe.map((r) => r.id))
    .order("created_at", { ascending: false });
  if (azErr) {
    logger.warn("admin/abbonamenti", "registro degli omaggi non leggibile:", azErr.message);
    avviso = "Il registro delle azioni non è leggibile: chi e quando non sono disponibili.";
  } else {
    for (const a of azioni ?? []) {
      if (a.target_id && !ultima.has(a.target_id)) ultima.set(a.target_id, { actor: a.actor_id, at: a.created_at });
    }
  }

  const nomi = new Map<string, string>();
  for (const id of new Set([...ultima.values()].map((u) => u.actor).filter((x): x is string => !!x))) {
    const { data, error: uErr } = await admin.auth.admin.getUserById(id);
    if (uErr) logger.warn("admin/abbonamenti", "operatore non leggibile:", uErr.message);
    nomi.set(id, data?.user?.email ?? id.slice(0, 8));
  }

  const adesso = Date.now();
  const omaggi: Omaggio[] = righe.map((r) => {
    const u = ultima.get(r.id);
    const scadenza = r.tier_override_expires_at;
    return {
      id: r.id,
      nome: r.stage_name,
      piano: PIANO[r.tier_override ?? ""] ?? String(r.tier_override),
      scadenza,
      scaduto: scadenza ? new Date(scadenza).getTime() < adesso : false,
      motivo: r.tier_override_reason,
      chi: u?.actor ? (nomi.get(u.actor) ?? u.actor.slice(0, 8)) : "—",
      quando: u?.at ?? null,
    };
  });
  return { ok: true, omaggi, avviso };
}

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
  const omaggi = await leggiOmaggi();

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Piani omaggio</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!omaggi.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {omaggi.error}
            </p>
          ) : omaggi.omaggi.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun piano omaggio attivo.</p>
          ) : (
            <>
              {omaggi.avviso && <p className="mb-2 text-xs text-muted-foreground">{omaggi.avviso}</p>}
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Artista</th>
                    <th className="py-2 pr-4">Piano</th>
                    <th className="py-2 pr-4">Scadenza</th>
                    <th className="py-2 pr-4">Motivo</th>
                    <th className="py-2 pr-4">Concesso da</th>
                    <th className="py-2">Il</th>
                  </tr>
                </thead>
                <tbody>
                  {omaggi.omaggi.map((o) => (
                    <tr key={o.id} className="border-t border-border align-top">
                      <td className="py-2 pr-4 font-medium">
                        <Link href={`/admin/artisti/${o.id}`} className="underline-offset-2 hover:underline">
                          {o.nome}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{o.piano}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {o.scadenza ? dataIt(o.scadenza) : "Senza scadenza"}
                        {o.scaduto && <span className="ml-1 text-xs text-destructive">(scaduto)</span>}
                      </td>
                      <td className="max-w-sm whitespace-pre-wrap py-2 pr-4">{o.motivo ?? "—"}</td>
                      <td className="py-2 pr-4">{o.chi}</td>
                      <td className="py-2 whitespace-nowrap">{dataIt(o.quando)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
