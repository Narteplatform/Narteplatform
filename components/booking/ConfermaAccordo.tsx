"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { confermaAccordo, respingiAccordo } from "@/app/(organizer)/organizzatore/_actions";
import { etichettaFascia, formatDataIt, formatEuroIt } from "@/lib/booking/etichette";

/**
 * Artista (trattativa via email): l'organizzatore ha registrato l'accordo.
 * Confermandolo, la data si blocca a quel compenso; «Non corrisponde» lo
 * rimanda all'organizzatore.
 */
export function ConfermaAccordo({
  requestId,
  organizzatore,
  data,
  fascia,
  prezzo,
}: {
  requestId: string;
  organizzatore: string;
  data: string;
  fascia: string | null;
  prezzo: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const riepilogo = [formatDataIt(data), etichettaFascia(fascia), formatEuroIt(prezzo)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border-[1.5px] border-corallo/50 bg-corallo/[0.05] p-4 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-corallo-dark">
        Accordo da confermare
      </p>
      <p className="mt-1.5">
        <strong>{organizzatore}</strong> ha registrato l&apos;accordo preso con te:
      </p>
      <p className="mt-1 font-display text-lg tracking-tight">{riepilogo}</p>

      {confirming ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3 text-xs leading-relaxed">
          <p>
            Confermando dichiari di aver raggiunto questo accordo <strong>direttamente</strong> con
            l&apos;organizzatore: la data viene bloccata nel calendario di entrambi a{" "}
            {formatEuroIt(prezzo)}.
          </p>
          <p className="text-muted-foreground">
            L&apos;accordo è solo fra voi: N&apos;arte non è parte del contratto e non gestisce il
            pagamento.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await confermaAccordo(requestId);
                  if (!r.ok) setError(r.error);
                  setConfirming(false);
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
              Confermo, blocca la data
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
              Indietro
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => setConfirming(true)}>
            <CalendarCheck className="size-4" /> Conferma l&apos;accordo
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await respingiAccordo(requestId);
                if (!r.ok) setError(r.error);
              })
            }
          >
            <X className="size-4" /> Non corrisponde
          </Button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
