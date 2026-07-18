import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  computeProfileCompletion,
  type ProfileCompletionSource,
} from "@/lib/artist/profile-completion";

/**
 * Avviso di profilo incompleto. A profilo completo non rende nulla: una card
 * che dice solo "100%" occupa il posto migliore della dashboard senza chiedere
 * nulla all'artista.
 *
 * La percentuale deve coincidere con quella del blocco in fondo alla sidebar
 * (che sparisce anch'esso a completamento): entrambi passano da
 * computeProfileCompletion().
 */
export function ProfileCompletionCard({ artist }: { artist: ProfileCompletionSource }) {
  const { pct, filled, total, missing, isComplete } = computeProfileCompletion(artist);

  if (isComplete) return null;

  return (
    <Card className="border-accent/40">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Completa il tuo profilo</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filled} di {total} sezioni compilate.
          </p>
        </div>
        <span className="font-display text-4xl leading-none text-accent">{pct}%</span>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Completamento del profilo artista"
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>Un profilo completo avrà più possibilità di ricevere richieste di booking.</span>
        </p>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cosa manca
          </p>
          <ul className="space-y-2">
            {missing.map((m) => (
              <li key={m.key} className="flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full border border-muted-foreground/40"
                />
                {m.action}
              </li>
            ))}
          </ul>
        </div>

        <Button asChild variant="accent">
          <Link href="/dashboard/profilo-artista">Completa il profilo</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
