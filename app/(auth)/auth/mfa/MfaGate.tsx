"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VerificaCodice } from "./VerificaCodice";

/**
 * Verifica del secondo fattore all'ingresso di un'area protetta. Se l'account
 * non ha un fattore TOTP attivo (o la lettura fallisce) non si blocca nessuno:
 * si prosegue verso `next`, e il middleware decide di nuovo.
 */
export function MfaGate({ next }: { next: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [stato, setStato] = useState<"lettura" | "pronto">("lettura");

  useEffect(() => {
    let annullato = false;
    const supabase = createClient();
    supabase.auth.mfa
      .listFactors()
      .then(({ data, error }) => {
        if (annullato) return;
        const totp = error ? undefined : data?.totp?.[0];
        if (!totp) {
          router.replace(next);
          return;
        }
        setFactorId(totp.id);
        setStato("pronto");
      })
      .catch(() => {
        if (!annullato) router.replace(next);
      });
    return () => {
      annullato = true;
    };
  }, [next, router]);

  if (stato === "lettura" || !factorId) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <VerificaCodice
      factorId={factorId}
      onVerificato={() => {
        router.replace(next);
        router.refresh();
      }}
    />
  );
}
