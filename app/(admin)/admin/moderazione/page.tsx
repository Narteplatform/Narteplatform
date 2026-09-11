import { AlertTriangle, ShieldCheck } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { getModerationQueue } from "@/lib/media/moderation-queries";
import { Card, CardContent } from "@/components/ui/Card";
import { MediaModerationCard } from "@/components/admin/MediaModerationCard";

export const metadata = { title: "Moderazione — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminModerazionePage() {
  await requireAdminPageAccess("moderazione");

  const { groups, totalCount, errors } = await getModerationQueue();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Moderazione contenuti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Foto, audio e video caricati dagli artisti restano invisibili sul profilo pubblico
          finché non li approvi qui.{" "}
          {totalCount > 0 ? (
            <>
              <span className="font-semibold text-foreground">{totalCount}</span>{" "}
              {totalCount === 1 ? "contenuto" : "contenuti"} in attesa, per{" "}
              <span className="font-semibold text-foreground">{groups.length}</span>{" "}
              {groups.length === 1 ? "artista" : "artisti"}.
            </>
          ) : (
            "Nessun contenuto in attesa."
          )}
        </p>
      </header>

      {errors.length > 0 && (
        <Card className="border-corallo/40 bg-corallo/10">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-corallo-dark" aria-hidden="true" />
            <div className="space-y-1 text-sm text-corallo-dark">
              <p className="font-semibold">
                Lettura della coda parzialmente fallita: quello che vedi qui sotto potrebbe NON
                essere l&apos;elenco completo.
              </p>
              <ul className="list-inside list-disc">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && errors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
            <ShieldCheck className="size-8 opacity-50" aria-hidden="true" />
            <p className="font-medium text-foreground">Nessun contenuto in attesa</p>
            <p className="text-sm">
              Quando un artista carica foto, audio o video nuovi, li trovi qui prima che
              compaiano sul suo profilo pubblico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <MediaModerationCard key={group.artist.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
