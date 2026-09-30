"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import {
  riattivaAccountAction,
  sospendiAccountAction,
} from "@/app/(admin)/admin/utenti/_actions";

const MIN = 10;

/**
 * Modulo «Sospendi account» / «Riattiva account». Riusato nell'elenco utenti e
 * nella scheda artista. La motivazione è obbligatoria e viene inviata
 * all'interessato insieme al collegamento per contestare la decisione.
 */
export function SospensioneAccount({
  userId,
  sospeso,
}: {
  userId: string;
  sospeso: boolean;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const ok = motivo.trim().length >= MIN;
  const verbo = sospeso ? "Riattiva" : "Sospendi";

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = sospeso
        ? await riattivaAccountAction(userId, motivo)
        : await sospendiAccountAction(userId, motivo);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({
        tone: "ok",
        text: res.notified
          ? "Fatto. L'interessato è stato avvisato via email."
          : "Fatto, ma l'email all'interessato non è partita: scrivigli a mano.",
      });
      setAperto(false);
      setMotivo("");
      router.refresh();
    });
  }

  if (!aperto) {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          size="sm"
          variant={sospeso ? "outline" : "accent"}
          onClick={() => {
            setMsg(null);
            setAperto(true);
          }}
        >
          {verbo} account
        </Button>
        {msg && (
          <p role="status" className={`text-xs ${msg.tone === "ok" ? "text-muted-foreground" : "text-corallo"}`}>
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  const id = `motivo-${userId}`;
  return (
    <div className="w-full max-w-md space-y-2 text-left">
      <label className="block text-xs font-semibold" htmlFor={id}>
        Motivazione (obbligatoria, minimo {MIN} caratteri)
      </label>
      <Textarea
        id={id}
        rows={3}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder={
          sospeso
            ? "Perché riattivi l'account."
            : "Cosa è successo e quale regola dei termini è stata violata."
        }
      />
      <p className="text-xs text-muted-foreground">
        La motivazione viene inviata per email all&apos;interessato, con il collegamento per
        contestare la decisione.
      </p>
      {msg && msg.tone === "err" && (
        <p role="alert" className="text-xs text-corallo">
          {msg.text}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={sospeso ? "default" : "accent"}
          disabled={pending || !ok}
          onClick={conferma}
        >
          {pending ? "Attendi…" : `Conferma: ${verbo.toLowerCase()}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
