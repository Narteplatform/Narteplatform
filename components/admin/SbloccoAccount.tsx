"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { sbloccaAccountChiusoAction } from "@/app/(admin)/admin/utenti/_actions";

const MIN = 10;

/**
 * «Sblocca account» per un account chiuso e non ancora cancellato in via
 * definitiva: annulla la chiusura, riapre l'accesso e riporta online i profili.
 * Non c'è da aspettare i 30 giorni: quelli valgono solo per la cancellazione.
 */
export function SbloccoAccount({ userId }: { userId: string }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = await sbloccaAccountChiusoAction(userId, motivo);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({
        tone: "ok",
        text: res.notified
          ? "Account sbloccato. L'interessato è stato avvisato via email."
          : "Account sbloccato, ma l'email all'interessato non è partita: scrivigli a mano.",
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
          variant="outline"
          onClick={() => {
            setMsg(null);
            setAperto(true);
          }}
        >
          Sblocca account
        </Button>
        {msg && (
          <p role="status" className={`text-xs ${msg.tone === "ok" ? "text-muted-foreground" : "text-corallo"}`}>
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  const id = `sblocca-${userId}`;
  return (
    <div className="w-full max-w-md space-y-2 rounded-lg border p-3 text-left">
      <p className="text-sm font-semibold">Sbloccare l&apos;account?</p>
      <p className="text-xs text-muted-foreground">
        Annulla la chiusura: l&apos;accesso si riapre e i profili tornano online. L&apos;abbonamento non viene
        riattivato. Se la persona si è ricandidata, sbloccala dalla candidatura in Artisti: lì puoi scegliere se
        tenere il profilo vecchio o quello nuovo.
      </p>
      <label className="block text-xs font-semibold" htmlFor={id}>
        Motivazione (obbligatoria, minimo {MIN} caratteri)
      </label>
      <Textarea
        id={id}
        rows={2}
        value={motivo}
        disabled={pending}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Es. l'artista ha chiesto di riattivare l'account."
      />
      {msg && msg.tone === "err" && (
        <p role="alert" className="text-xs text-corallo">
          {msg.text}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending || motivo.trim().length < MIN} onClick={conferma}>
          {pending ? "Attendi…" : "Conferma sblocco"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Indietro
        </Button>
      </div>
    </div>
  );
}
