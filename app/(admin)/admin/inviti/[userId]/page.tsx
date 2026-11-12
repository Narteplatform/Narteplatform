import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { schedaInvitiAdmin, type InvitoDettaglio } from "@/lib/inviti/admin";
import { getSiteUrl } from "@/lib/site-url";
import {
  GIORNI_PREMIO,
  MOTIVO_ANNULLO_ADMIN,
  STATI_ESCLUDIBILI,
  STATO_ADMIN,
  TETTO_ANNUO,
  formatData,
  formatEuro,
} from "@/lib/inviti/regole";
import type { InviteStatus } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ImbutoInviti } from "@/components/admin/ImbutoInviti";
import { AzioneLinkInvito, EscludiInvito } from "@/components/admin/GestioneInviti";

export const metadata = { title: "Inviti di un artista — N'arte Admin" };
export const dynamic = "force-dynamic";

const BADGE: Record<InviteStatus, "muted" | "outline" | "warning" | "success" | "danger"> = {
  candidatura: "muted",
  approvato: "outline",
  in_attesa: "warning",
  confermato: "success",
  annullato: "danger",
  oltre_limite: "muted",
};

function descriviPremio(p: NonNullable<InvitoDettaglio["premio"]>): string {
  if (p.kind === "credito_stripe") return `${formatEuro(p.amountCents ?? 0)} di credito Stripe`;
  const periodo =
    p.proFrom && p.proUntil ? `${GIORNI_PREMIO} gg di Pro, ${formatData(p.proFrom)} → ${formatData(p.proUntil)}` : `${GIORNI_PREMIO} gg di Pro`;
  return p.convertedCents ? `${periodo} · convertiti ${formatEuro(p.convertedCents)} in credito` : periodo;
}

export default async function AdminInvitiArtistaPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdminPageAccess("inviti");
  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) notFound();

  const scheda = await schedaInvitiAdmin(userId);
  if (!scheda.ok && scheda.motivo === "assente") notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/inviti" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tutti gli inviti
      </Link>

      {!scheda.ok ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {scheda.motivo === "migrazione" ? (
              "Applica la migration 0078 per attivare il programma inviti."
            ) : (
              <span role="alert">Non riesco a leggere gli inviti di questo artista. Riprova fra un momento.</span>
            )}
          </CardContent>
        </Card>
      ) : (
        <Scheda scheda={scheda} />
      )}
    </div>
  );
}

function Scheda({ scheda }: { scheda: Extract<Awaited<ReturnType<typeof schedaInvitiAdmin>>, { ok: true }> }) {
  const r = scheda.riga;
  const link = `${getSiteUrl()}/invito/${r.codice}`;

  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">{r.nome}</h1>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            <a href={link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {link}
            </a>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {r.disattivatoIl ? (
              <Badge variant="danger">Disattivato il {formatData(r.disattivatoIl)}</Badge>
            ) : (
              <Badge variant="success">Link attivo</Badge>
            )}
            <span>Creato il {formatData(r.creatoIl)}</span>
            {scheda.email && <span>· {scheda.email}</span>}
            {r.slug && (
              <>
                ·{" "}
                <Link href={`/artisti/${r.slug}`} className="underline underline-offset-4" target="_blank">
                  profilo pubblico
                </Link>
              </>
            )}
            · <Link href={`/admin/utenti/${r.userId}`} className="underline underline-offset-4">scheda account</Link>
          </p>
        </div>
        <div className="shrink-0">
          <AzioneLinkInvito userId={r.userId} disattivato={r.disattivatoIl !== null} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dal link al premio</CardTitle>
          </CardHeader>
          <CardContent>
            <ImbutoInviti
              titolo={`Imbuto degli inviti di ${r.nome}`}
              passi={[
                { etichetta: "Aperture del link", valore: r.aperture, nota: "visitatori unici al giorno" },
                { etichetta: "Clic su «Candidati»", valore: r.clic },
                { etichetta: "Candidature", valore: r.candidature },
                { etichetta: "Entrati su N'arte", valore: r.entrati },
                { etichetta: "Hanno pagato", valore: r.paganti },
                { etichetta: "Premi assegnati", valore: r.premi },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mesi di Pro guadagnati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-display text-4xl leading-none tracking-tight tabular-nums">{r.premi}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Quest&apos;anno</dt>
              <dd className="tabular-nums">
                {r.premiAnno} su {TETTO_ANNUO}
              </dd>
              <dt className="text-muted-foreground">Come giorni di Pro</dt>
              <dd className="tabular-nums">{r.premiGiorniPro}</dd>
              <dt className="text-muted-foreground">Come credito</dt>
              <dd className="tabular-nums">{r.premiCredito}</dd>
              <dt className="text-muted-foreground">In attesa (14 gg)</dt>
              <dd className="tabular-nums">{r.inAttesa}</dd>
              {r.oltreLimite > 0 && (
                <>
                  <dt className="text-muted-foreground">Oltre il tetto</dt>
                  <dd className="tabular-nums">{r.oltreLimite}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Pro dagli inviti</dt>
              <dd>{r.proFinoAl ? `attivo fino al ${formatData(r.proFinoAl)}` : "non attivo"}</dd>
              <dt className="text-muted-foreground">Credito su Stripe</dt>
              <dd className="tabular-nums">{formatEuro(r.creditoCent)}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inviti ({scheda.inviti.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {scheda.inviti.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nessuna candidatura arrivata da questo link.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invitato</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Candidatura</TableHead>
                  <TableHead>Pagato il</TableHead>
                  <TableHead>Premio</TableHead>
                  <TableHead>
                    <span className="sr-only">Azioni</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheda.inviti.map((i) => (
                  <TableRow key={i.id} className="align-top">
                    <TableCell className="font-medium">
                      {i.inviteeUserId ? (
                        <Link href={`/admin/utenti/${i.inviteeUserId}`} className="underline-offset-4 hover:underline">
                          {i.nome}
                        </Link>
                      ) : (
                        i.nome
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={BADGE[i.status]}>{STATO_ADMIN[i.status]}</Badge>
                      {i.status === "annullato" && i.cancelReason && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {MOTIVO_ANNULLO_ADMIN[i.cancelReason] ?? i.cancelReason}
                        </span>
                      )}
                      {i.status === "in_attesa" && i.confirmAfter && (
                        <span className="mt-1 block text-xs text-muted-foreground">conferma dal {formatData(i.confirmAfter)}</span>
                      )}
                      {(i.status === "confermato" || i.status === "oltre_limite") && i.confirmedAt && (
                        <span className="mt-1 block text-xs text-muted-foreground">il {formatData(i.confirmedAt)}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatData(i.creatoIl)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{i.paidAt ? formatData(i.paidAt) : "—"}</TableCell>
                    <TableCell className="text-xs">{i.premio ? descriviPremio(i.premio) : "—"}</TableCell>
                    <TableCell className="text-right">
                      {STATI_ESCLUDIBILI.includes(i.status) && <EscludiInvito inviteId={i.id} nome={i.nome} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            «Escludi» è possibile finché il premio non è assegnato. Un premio già assegnato non si revoca da qui: è un
            periodo di Pro o un credito Stripe già accreditato.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aperture degli ultimi 30 giorni</CardTitle>
        </CardHeader>
        <CardContent>
          {scheda.andamento === null ? (
            <p className="text-sm text-muted-foreground">Disponibili dopo aver applicato la migration 0079.</p>
          ) : scheda.andamento.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna apertura negli ultimi 30 giorni.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Giorno</TableHead>
                  <TableHead className="text-right">Aperture</TableHead>
                  <TableHead className="text-right">Clic su «Candidati»</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheda.andamento.map((g) => (
                  <TableRow key={g.giorno}>
                    <TableCell>{formatData(`${g.giorno}T12:00:00Z`)}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.aperture}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.clic}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
