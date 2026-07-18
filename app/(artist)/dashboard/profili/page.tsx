import Link from "next/link";
import { ExternalLink, Lock } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getArtistContext } from "@/lib/artist/current";
import { getAccountEntitlements } from "@/lib/billing/entitlements";
import { isUnlimited, PLAN_LABELS } from "@/lib/billing/plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CreateArtistProfileForm } from "@/components/dashboard/CreateArtistProfileForm";

export const metadata = { title: "I tuoi profili artista — N'arte" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  approved: "Pubblicato",
  pending: "In revisione",
  rejected: "Non approvato",
} as const;

const STATUS_VARIANT = {
  approved: "success",
  pending: "warning",
  rejected: "muted",
} as const;

export default async function ArtistProfilesPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const { owned, active } = await getArtistContext(user.id);
  const ent = await getAccountEntitlements(user.id);

  const max = ent.artistProfilesMax;
  const used = owned.length;
  const canCreate = isUnlimited(max) || used < max;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">I tuoi profili artista</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Il tuo abbonamento vale per l&apos;account: ogni profilo che crei eredita i vantaggi del
          piano {PLAN_LABELS[ent.tier]}.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Profili usati</p>
            <p className="font-display text-2xl">
              {used} <span className="text-base text-muted-foreground">/ {isUnlimited(max) ? "∞" : max}</span>
            </p>
          </div>
          <Badge variant={canCreate ? "success" : "warning"}>
            {canCreate
              ? isUnlimited(max)
                ? "Puoi crearne altri"
                : `${max - used} ancora disponibili`
              : "Limite raggiunto"}
          </Badge>
        </CardContent>
      </Card>

      <section className="space-y-3">
        {owned.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <Avatar src={a.cover_image} name={a.stage_name} />
                <div>
                  <p className="font-medium">
                    {a.stage_name}
                    {active?.id === a.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(attivo)</span>
                    )}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {PLAN_LABELS[a.tier]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                {a.status === "approved" && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/artisti/${a.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crea un nuovo profilo</CardTitle>
            <CardDescription>
              Il profilo viene creato subito ed eredita il tuo piano, ma resta in revisione finché il
              team N&apos;arte non lo approva: solo allora sarà visibile agli organizzatori.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateArtistProfileForm />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <Lock className="mx-auto size-6 text-muted-foreground" />
            <p className="font-display text-lg tracking-tight">
              Hai usato tutti i profili del piano {PLAN_LABELS[ent.tier]}
            </p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {ent.tier === "free"
                ? "Il piano Free include un solo profilo artista. Con Pro ne gestisci 2, con Max fino a 5 — tutti con i vantaggi del piano."
                : "Con il piano Max puoi gestire fino a 5 profili artista dallo stesso account."}
            </p>
            <Button asChild>
              <Link href="/dashboard/abbonamento">
                {ent.tier === "free" ? "Passa a Pro" : "Passa a Max"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
