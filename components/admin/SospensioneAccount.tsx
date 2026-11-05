"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
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
  const [immediata, setImmediata] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const ok = motivo.trim().length >= MIN;
  const verbo = sospeso ? "Riattiva" : "Sospendi";

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = sospeso
        ? await riattivaAccountAction(userId, motivo)
        : await sospendiAccountAction(userId, motivo, immediata);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      if ("programmataPer" in res && res.programmataPer) {
        const quando = new Date(res.programmataPer).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
        setMsg({
          tone: "ok",
          text: `Artista con partita IVA: misura programmata per il ${quando}, con preavviso${res.notified ? " inviato per email" : " (email non partita: scrivigli a mano)"}.`,
        });
        setAperto(false);
        setMotivo("");
        router.refresh();
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

  return (
    <div className="w-full max-w-md space-y-2 text-left">
      <MotivazioneField
        label="Motivazione (obbligatoria)"
        disabled={pending}
        onChange={setMotivo}
        hint="La motivazione viene inviata per email all'interessato, con il collegamento per contestare la decisione."
      />
      {!sospeso && (
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={immediata}
            disabled={pending}
            onChange={(e) => setImmediata(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Violazione grave o obbligo di legge: effetto immediato. Senza questa spunta, per gli artisti con
            partita IVA la misura parte dopo 30 giorni di preavviso (Reg. UE 2019/1150).
          </span>
        </label>
      )}
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
