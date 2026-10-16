import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { NewProfileActions } from "@/components/admin/NewProfileActions";
import type { EsitoProfiliInAttesa } from "@/lib/admin/profili-in-attesa";

const dataFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/**
 * Profili artista creati dall'account e in attesa di approvazione. Se la
 * lettura è fallita lo dice: un elenco vuoto per errore sembrerebbe «niente
 * da fare». Se non c'è nulla da approvare non si mostra.
 */
export function PendingProfilesCard({
  esito,
  titolo,
  descrizione,
}: {
  esito: EsitoProfiliInAttesa;
  titolo: string;
  descrizione: string;
}) {
  if (!esito.ok) {
    return (
      <Card className="border-corallo/40 bg-corallo/10">
        <CardContent className="py-4 text-sm text-corallo-dark" role="alert">
          {titolo}: {esito.error}
        </CardContent>
      </Card>
    );
  }
  if (esito.profili.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{titolo}</CardTitle>
          <Badge variant="accent">{esito.profili.length}</Badge>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">{descrizione}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {esito.profili.map((p) => (
          <article
            key={p.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Avatar name={p.stageName} size="md" />
              <div className="min-w-0">
                <p className="font-display text-base leading-tight tracking-tight break-words">
                  {p.stageName}
                </p>
                <p className="text-sm text-muted-foreground break-words">
                  {p.ownerName ? `${p.ownerName} · ` : ""}
                  {p.ownerEmail ? (
                    <a href={`mailto:${p.ownerEmail}`} className="underline-offset-2 hover:underline">
                      {p.ownerEmail}
                    </a>
                  ) : (
                    "Account non leggibile"
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.city ? `${p.city} · ` : ""}Creato il {dataFmt.format(new Date(p.createdAt))}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {p.ownerSospeso && <Badge variant="danger">Account sospeso</Badge>}
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href={`/admin/artisti/${p.id}`}>
                      <Pencil className="size-4" /> Apri la scheda
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href={`/artisti/${p.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> Anteprima
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <NewProfileActions artistId={p.id} />
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
