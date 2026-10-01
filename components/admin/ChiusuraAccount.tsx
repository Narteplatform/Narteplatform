"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { chiudiAccountAction } from "@/app/(admin)/admin/utenti/_actions";

/**
 * «Chiudi account» disposto dal Team. Blocca l'accesso, toglie i profili dal
 * catalogo e disdice l'abbonamento a fine periodo; la cancellazione definitiva
 * dei dati NON parte da qui (resta lo strumento root, dopo 30 giorni).
 */
export function ChiusuraAccount({ userId }: { userId: string }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [capito, setCapito] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = await chiudiAccountAction(userId, motivo);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({
        tone: "ok",
        text: res.notified
          ? "Account chiuso. L'interessato è stato avvisato via email."
          : "Account chiuso, ma l'email all'interessato non è partita: scrivigli a mano.",
      });
      setAperto(false);
      setMotivo("");
      setCapito(false);
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
          className="border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
          onClick={() => {
            setMsg(null);
            setAperto(true);
          }}
        >
          Chiudi account
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
    <div className="w-full max-w-md space-y-2 rounded-lg border border-red-200 p-3 text-left">
      <p className="text-sm font-semibold">Chiudere l&apos;account?</p>
      <p className="text-xs text-muted-foreground">
        L&apos;accesso viene bloccato, i profili escono dal catalogo e l&apos;abbonamento viene disdetto
        a fine periodo. I dati non vengono cancellati subito: la cancellazione definitiva avviene
        dopo 30 giorni, salvo reclamo accolto, con lo strumento root.
      </p>
      <MotivazioneField
        compact
        label="Motivazione (obbligatoria)"
        disabled={pending}
        onChange={setMotivo}
        hint="Viene inviata all'interessato per email, con il collegamento per presentare reclamo."
      />
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={capito}
          disabled={pending}
          onChange={(e) => setCapito(e.target.checked)}
          className="mt-0.5"
        />
        <span>Confermo di voler chiudere questo account.</span>
      </label>
      {msg && msg.tone === "err" && (
        <p role="alert" className="text-xs text-corallo">
          {msg.text}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !motivo || !capito}
          className="bg-red-600 text-white hover:bg-red-700"
          onClick={conferma}
        >
          {pending ? "Attendi…" : "Conferma chiusura"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
