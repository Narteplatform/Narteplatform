"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { richiediShooting } from "@/app/(artist)/dashboard/abbonamento/_actions";
import type { StatoShooting } from "@/lib/billing/shooting";

const data = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Rome" });

/** Shooting del Max annuale: 1 ora da Hangarram (Napoli), 5 foto, uno per account. */
export function ShootingCard({
  stato,
  profili,
}: {
  stato: StatoShooting;
  profili: { id: string; stage_name: string }[];
}) {
  const router = useRouter();
  const [scelto, setScelto] = useState(profili.length === 1 ? profili[0].id : "");
  const [pending, start] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  if (stato.stato === "non_incluso" || stato.stato === "scaduto" || stato.stato === "non_disponibile") return null;

  function invia() {
    setErrore(null);
    start(async () => {
      const r = await richiediShooting(scelto);
      if (!r.ok) setErrore(r.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="size-4" aria-hidden="true" />
          Shooting fotografico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Incluso nel primo anno del Max annuale: un&apos;ora presso Hangarram (Napoli), 5 foto, per un solo
          profilo dell&apos;account.
        </p>
        {stato.stato === "errore" && (
          <p role="alert" className="text-corallo-dark">
            Non riusciamo a leggere lo stato dello shooting. Riprova fra un momento.
          </p>
        )}
        {stato.stato === "troppo_presto" && (
          <p>Potrai richiederlo da qui a partire dal {data(stato.dal)} (15° giorno di abbonamento).</p>
        )}
        {stato.stato === "richiesto" && (
          <p>
            Richiesto il {data(stato.requestedAt)} per «{stato.artistName}».{" "}
            {stato.doneAt
              ? `Eseguito il ${data(stato.doneAt)}.`
              : stato.scheduledAt
                ? `Fissato per il ${data(stato.scheduledAt)}.`
                : "Ti contatteremo per fissare la data."}
          </p>
        )}
        {stato.stato === "richiedibile" && (
          <div className="space-y-2">
            <p className="text-muted-foreground">Puoi richiederlo fino al {data(stato.entro)}.</p>
            {profili.length > 1 && (
              <select
                aria-label="Profilo per lo shooting"
                value={scelto}
                onChange={(e) => setScelto(e.target.value)}
                className="h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 text-sm"
              >
                <option value="" disabled>
                  Scegli il profilo…
                </option>
                {profili.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.stage_name}
                  </option>
                ))}
              </select>
            )}
            {errore && (
              <p role="alert" className="text-corallo-dark">
                {errore}
              </p>
            )}
            <Button type="button" size="sm" disabled={pending || !scelto} onClick={invia}>
              {pending ? "Invio…" : "Richiedi lo shooting"}
            </Button>
            <p className="text-xs text-muted-foreground">La scelta del profilo è definitiva.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
