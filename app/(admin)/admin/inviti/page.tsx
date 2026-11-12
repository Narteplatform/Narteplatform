import Link from "next/link";
import { Gift, Link2, MousePointerClick, Wallet } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { modalitaInviti } from "@/lib/inviti/modalita";
import { riepilogoInvitiAdmin, type RigaArtistaInviti } from "@/lib/inviti/admin";
import { CREDITO_PREMIO_CENT, TETTO_ANNUO, formatData, formatEuro } from "@/lib/inviti/regole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/components/ui/KpiCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ImbutoInviti } from "@/components/admin/ImbutoInviti";

export const metadata = { title: "Inviti tra artisti — N'arte Admin" };
export const dynamic = "force-dynamic";

const MODALITA = {
  spento: { badge: "muted", testo: "Spento", spiega: "Il programma non è visibile agli artisti e i link portano alla candidatura normale." },
  conta: {
    badge: "warning",
    testo: "Solo conteggio",
    spiega: "Gli artisti vedono e usano il link; il cron conta i premi maturati ma non li assegna e non scrive crediti su Stripe.",
  },
  attivo: { badge: "success", testo: "Attivo", spiega: "I premi maturati vengono assegnati ogni mattina dal cron." },
} as const;

const ORDINI = {
  premi: { label: "Mesi guadagnati", chiave: (r: RigaArtistaInviti) => r.premi * 1e6 + r.paganti * 1e3 + r.candidature },
  paganti: { label: "Paganti", chiave: (r: RigaArtistaInviti) => r.paganti * 1e6 + r.entrati * 1e3 + r.candidature },
  candidature: { label: "Candidature", chiave: (r: RigaArtistaInviti) => r.candidature * 1e6 + (r.clic ?? 0) },
  aperture: { label: "Aperture del link", chiave: (r: RigaArtistaInviti) => (r.aperture ?? 0) * 1e3 + (r.clic ?? 0) },
  recenti: { label: "Link creati di recente", chiave: (r: RigaArtistaInviti) => new Date(r.creatoIl).getTime() },
} as const;
type Ordine = keyof typeof ORDINI;

const FILTRI = {
  tutti: "Tutti i link",
  attivita: "Con almeno un'apertura o candidatura",
  paganti: "Con almeno un pagante",
  attesa: "Con premi in attesa",
  disattivati: "Link disattivati",
} as const;
type Filtro = keyof typeof FILTRI;

function primo(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function passaFiltro(r: RigaArtistaInviti, f: Filtro): boolean {
  switch (f) {
    case "attivita":
      return r.candidature > 0 || (r.aperture ?? 0) > 0 || (r.clic ?? 0) > 0;
    case "paganti":
      return r.paganti > 0;
    case "attesa":
      return r.inAttesa > 0;
    case "disattivati":
      return r.disattivatoIl !== null;
    default:
      return true;
  }
}

function numero(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("it-IT");
}

export default async function AdminInvitiPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  await requireAdminPageAccess("inviti");
  const sp = await searchParams;
  const q = primo(sp.q).trim().toLowerCase().slice(0, 60);
  const ordine: Ordine = primo(sp.ordina) in ORDINI ? (primo(sp.ordina) as Ordine) : "premi";
  const filtro: Filtro = primo(sp.filtro) in FILTRI ? (primo(sp.filtro) as Filtro) : "tutti";

  const modalita = modalitaInviti();
  const m = MODALITA[modalita];
  const dati = await riepilogoInvitiAdmin();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Inviti tra artisti</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Il percorso di ogni link «Invita un artista»: chi lo apre, chi si candida, chi entra, chi paga e i mesi di
            Pro guadagnati da chi ha invitato. Un premio = 1 mese di Pro (30 giorni, o {formatEuro(CREDITO_PREMIO_CENT)} di credito a
            chi paga già), massimo {TETTO_ANNUO} l&apos;anno.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-border p-3 text-xs sm:max-w-xs">
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Programma</span>
            <Badge variant={m.badge}>{m.testo}</Badge>
          </p>
          <p className="mt-2 text-muted-foreground">{m.spiega}</p>
        </div>
      </header>

      {!dati.ok ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dati.motivo === "migrazione" ? (
              "Applica la migration 0078 per attivare il programma inviti."
            ) : (
              <span role="alert">Non riesco a leggere gli inviti. Riprova fra un momento.</span>
            )}
          </CardContent>
        </Card>
      ) : (
        <Contenuto dati={dati} q={q} ordine={ordine} filtro={filtro} />
      )}
    </div>
  );
}

function Contenuto({
  dati,
  q,
  ordine,
  filtro,
}: {
  dati: Extract<Awaited<ReturnType<typeof riepilogoInvitiAdmin>>, { ok: true }>;
  q: string;
  ordine: Ordine;
  filtro: Filtro;
}) {
  const t = dati.totali;
  const righe = dati.artisti
    .filter((r) => passaFiltro(r, filtro))
    .filter((r) => !q || r.nome.toLowerCase().includes(q) || r.codice.includes(q))
    .sort((a, b) => ORDINI[ordine].chiave(b) - ORDINI[ordine].chiave(a));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Link creati"
          value={t.link}
          icon={<Link2 className="size-4" />}
          sublabel={`${t.linkUsati} usati almeno una volta`}
        />
        <KpiCard
          label="Aperture del link"
          value={numero(t.aperture)}
          icon={<MousePointerClick className="size-4" />}
          sublabel={t.aperture === null ? "Applica la migration 0079" : "Visitatori unici al giorno"}
        />
        <KpiCard
          label="Mesi di Pro assegnati"
          value={t.premi}
          icon={<Gift className="size-4" />}
          sublabel={`${t.premiGiorniPro} in giorni · ${t.premiCredito} in credito · ${t.inAttesa} in attesa`}
        />
        <KpiCard
          label="Credito su Stripe"
          value={formatEuro(t.creditoCent)}
          icon={<Wallet className="size-4" />}
          sublabel="Premi ad abbonati + giorni convertiti"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dal link al premio, tutti gli artisti</CardTitle>
        </CardHeader>
        <CardContent>
          <ImbutoInviti
            titolo="Imbuto complessivo del programma inviti"
            passi={[
              { etichetta: "Aperture del link", valore: t.aperture, nota: "visitatori unici al giorno" },
              { etichetta: "Clic su «Candidati»", valore: t.clic },
              { etichetta: "Candidature", valore: t.candidature },
              { etichetta: "Entrati su N'arte", valore: t.entrati, nota: "approvati, account nuovo" },
              { etichetta: "Hanno pagato", valore: t.paganti },
              { etichetta: "Premi assegnati", valore: t.premi, nota: t.oltreLimite ? `${t.oltreLimite} oltre il tetto` : undefined },
            ]}
          />
          {dati.visiteDisponibili ? null : (
            <p className="mt-4 text-xs text-muted-foreground">
              Aperture e clic si contano dopo aver applicato la migration 0079: prima di allora la colonna resta «—».
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base">Per artista</CardTitle>
          <form method="get" className="flex flex-col gap-2 md:flex-row md:items-end">
            <label className="flex-1">
              <span className="sr-only">Cerca per nome d&apos;arte o codice</span>
              <SearchInput name="q" defaultValue={q} variant="compact" placeholder="Cerca per nome o codice…" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Mostra</span>
              <select
                name="filtro"
                defaultValue={filtro}
                className="h-9 w-full rounded-md border-[1.5px] border-border bg-surface px-2 text-sm md:w-auto"
              >
                {(Object.keys(FILTRI) as Filtro[]).map((k) => (
                  <option key={k} value={k}>
                    {FILTRI[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Ordina per</span>
              <select
                name="ordina"
                defaultValue={ordine}
                className="h-9 w-full rounded-md border-[1.5px] border-border bg-surface px-2 text-sm md:w-auto"
              >
                {(Object.keys(ORDINI) as Ordine[]).map((k) => (
                  <option key={k} value={k}>
                    {ORDINI[k].label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" variant="outline">
              Applica
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {dati.artisti.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun artista ha ancora aperto la pagina «Invita un artista»: il link si crea alla prima visita.
            </p>
          ) : righe.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nessun link corrisponde ai filtri.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                {righe.length} link su {dati.artisti.length}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artista</TableHead>
                    <TableHead className="text-right">Aperture</TableHead>
                    <TableHead className="text-right">Clic</TableHead>
                    <TableHead className="text-right">Candidature</TableHead>
                    <TableHead className="text-right">Entrati</TableHead>
                    <TableHead className="text-right">Paganti</TableHead>
                    <TableHead className="text-right">Mesi guadagnati</TableHead>
                    <TableHead>Premio in corso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {righe.map((r) => (
                    <TableRow key={r.userId}>
                      <TableCell className="min-w-48">
                        <Link href={`/admin/inviti/${r.userId}`} className="font-medium underline-offset-4 hover:underline">
                          {r.nome}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          /invito/{r.codice}
                          {r.disattivatoIl && <Badge variant="danger">Disattivato</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {numero(r.aperture)}
                        {r.aperture30gg !== null && r.aperture30gg > 0 && (
                          <span className="block text-[11px] text-muted-foreground">{r.aperture30gg} in 30 gg</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{numero(r.clic)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.candidature}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.entrati}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.paganti}
                        {r.inAttesa > 0 && <span className="block text-[11px] text-muted-foreground">{r.inAttesa} in attesa</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="font-semibold">{r.premi}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {r.premiAnno}/{TETTO_ANNUO} quest&apos;anno
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.proFinoAl ? (
                          <>Pro fino al {formatData(r.proFinoAl)}</>
                        ) : r.creditoCent > 0 ? (
                          <>{formatEuro(r.creditoCent)} di credito</>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <details className="rounded-2xl border border-border bg-background p-5 text-sm">
        <summary className="cursor-pointer font-medium">Come si contano questi numeri</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>
            <strong>Aperture</strong>: browser veri rimasti almeno 2 secondi sulla pagina del link. Una persona conta una
            volta al giorno per link; bot, anteprime di WhatsApp, chi possiede il link e il team non contano. Non salviamo
            IP né account: solo uno pseudonimo che cambia ogni giorno (richiede <code>VISIT_HASH_SALT</code>).
          </li>
          <li>
            <strong>Clic</strong>: chi ha premuto «Invia la candidatura» dalla pagina del link, con lo stesso criterio.
          </li>
          <li>
            <strong>Entrati</strong>: candidature approvate su un account nuovo. Auto-inviti, account già esistenti e
            artisti già invitati da altri non contano.
          </li>
          <li>
            <strong>Paganti</strong>: primo pagamento reale (importo maggiore di zero). Il premio si assegna 14 giorni
            dopo, se non c&apos;è stato recesso o rimborso.
          </li>
          <li>
            Le candidature non approvate vengono cancellate dalla conservazione automatica: possono sparire dal
            conteggio delle candidature con il tempo.
          </li>
        </ul>
      </details>
    </>
  );
}
