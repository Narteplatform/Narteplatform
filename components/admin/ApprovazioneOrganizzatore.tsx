"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import {
  approvaOrganizzatoreAction,
  rifiutaOrganizzatoreAction,
} from "@/app/(admin)/admin/utenti/_actions";

/** Approva o rifiuta un organizzatore. Il rifiuto richiede una motivazione, inviata all'interessato. */
export function ApprovazioneOrganizzatore({ userId, rifiutabile = true }: { userId: string; rifiutabile?: boolean }) {
  const router = useRouter();
  const [rifiuto, setRifiuto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function approva() {
    setMsg(null);
    start(async () => {
      const res = await approvaOrganizzatoreAction(userId);
      if (!res.ok) return setMsg({ tone: "err", text: res.error });
      setMsg({
        tone: "ok",
        text: res.notified ? "Approvato. L'interessato è stato avvisato." : "Approvato, ma l'email non è partita: scrivigli a mano.",
      });
      router.refresh();
    });
  }

  function rifiuta() {
    setMsg(null);
    start(async () => {
      const res = await rifiutaOrganizzatoreAction(userId, motivo);
      if (!res.ok) return setMsg({ tone: "err", text: res.error });
      setMsg({
        tone: "ok",
        text: res.notified ? "Rifiutato. L'interessato è stato avvisato." : "Rifiutato, ma l'email non è partita: scrivigli a mano.",
      });
      setRifiuto(false);
      setMotivo("");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md space-y-2 text-left">
      {!rifiuto && (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={approva}>
            {pending ? "Attendi…" : "Approva"}
          </Button>
          {rifiutabile && (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setRifiuto(true)}>
              Rifiuta
            </Button>
          )}
        </div>
      )}
      {rifiuto && (
        <>
          <MotivazioneField
            label="Motivazione (obbligatoria)"
            disabled={pending}
            onChange={setMotivo}
            hint="La motivazione viene inviata per email all'interessato, con il collegamento per contestare la decisione."
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="accent" disabled={pending || motivo.trim().length < 10} onClick={rifiuta}>
              {pending ? "Attendi…" : "Conferma: rifiuta"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setRifiuto(false)}>
              Annulla
            </Button>
          </div>
        </>
      )}
      {msg && (
        <p role={msg.tone === "err" ? "alert" : "status"} className={`text-xs ${msg.tone === "ok" ? "text-muted-foreground" : "text-corallo"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
