"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/app/(artist)/dashboard/abbonamento/_actions";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { BillingInterval } from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";

export function SubscriptionPanel({
  currentTier,
  hasSubscription,
}: {
  currentTier: ArtistTier;
  hasSubscription: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSelect(tier: "pro" | "max", interval: BillingInterval) {
    setError(null);
    start(async () => {
      // In caso di successo la action fa redirect() e non ritorna: si arriva
      // qui solo se qualcosa è andato storto.
      const res = await createCheckoutSession({ tier, interval });
      if (res && !res.ok) setError(res.error ?? "Errore");
    });
  }

  function onPortal() {
    setError(null);
    start(async () => {
      const res = await createBillingPortalSession();
      if (res && !res.ok) setError(res.error ?? "Errore");
    });
  }

  return (
    <div className="space-y-6">
      {hasSubscription && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">Fatturazione</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Cambia piano, aggiorna la carta, scarica le fatture o disdici.
              </p>
            </div>
            <Button variant="outline" onClick={onPortal} disabled={pending}>
              <CreditCard className="size-4" />
              {pending ? "Apertura…" : "Gestisci fatturazione"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <PlanComparison
        currentTier={currentTier}
        onSelect={onSelect}
        pending={pending}
        // Chi ha già un piano attivo cambia dal Portal, che gestisce proration e
        // switch: un secondo checkout creerebbe una subscription parallela.
        disabledReason={
          hasSubscription
            ? "Hai già un abbonamento attivo: usa «Gestisci fatturazione» per cambiare piano."
            : undefined
        }
      />
    </div>
  );
}
