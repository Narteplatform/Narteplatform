"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { annullaCancellazioneAction } from "./_actions";

const MIN = 10;

/** Ripensamento: annulla una cancellazione già confermata (motivazione obbligatoria). */
export function AnnullaCancellazione({ richiestaId }: { richiestaId: string }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = await annullaCancellazioneAction(richiestaId, motivo);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({ tone: "ok", text: res.messaggio });
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
          variant="outline"
          onClick={() => {
            setMsg(null);
            setAperto(true);
          }}
        >
          Annulla la cancellazione (ripensamento)
        </Button>
        {msg && (
          <p role="status" className={`text-xs ${msg.tone === "ok" ? "text-muted-foreground" : "text-corallo"}`}>
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  const id = `annulla-${richiestaId}`;
  return (
    <div className="w-full max-w-md space-y-2">
      <label className="block text-xs font-semibold" htmlFor={id}>
        Motivazione (obbligatoria, minimo {MIN} caratteri)
      </label>
      <Textarea
        id={id}
        rows={3}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Come e quando l'interessato ha chiesto di annullare."
      />
      <p className="text-xs text-muted-foreground">
        Riapre l&apos;accesso e riporta online i profili. L&apos;abbonamento non viene riattivato: l&apos;utente può
        abbonarsi di nuovo. L&apos;interessato riceve un&apos;email.
      </p>
      {msg && msg.tone === "err" && (
        <p role="alert" className="text-xs text-corallo">
          {msg.text}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending || motivo.trim().length < MIN} onClick={conferma}>
          {pending ? "Attendi…" : "Conferma l'annullamento"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Indietro
        </Button>
      </div>
    </div>
  );
}
