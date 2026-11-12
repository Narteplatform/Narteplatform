"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import {
  disattivaLinkAction,
  escludiInvitoAction,
  riattivaLinkAction,
  type EsitoInviti,
} from "@/app/(admin)/admin/inviti/_actions";

/** Regole applicabili alle decisioni sul programma inviti. */
const REGOLE_INVITI = [
  "Regole del programma «Invita un artista»",
  "Termini d'uso, art. 7 (comportamento)",
  "Segnalazione accolta",
  "Obbligo di legge",
  "Altro",
] as const;

type Messaggio = { tone: "ok" | "err"; text: string } | null;

function esitoInTesto(res: EsitoInviti, fatto: string): Messaggio {
  if (!res.ok) return { tone: "err", text: res.error };
  return {
    tone: "ok",
    text: res.notified ? `${fatto} L'artista è stato avvisato per email.` : `${fatto}`,
  };
}

function Esito({ msg }: { msg: Messaggio }) {
  if (!msg) return null;
  return (
    <p role={msg.tone === "err" ? "alert" : "status"} className={`text-xs ${msg.tone === "ok" ? "text-muted-foreground" : "text-corallo"}`}>
      {msg.text}
    </p>
  );
}

/** Disattiva (con motivazione inviata all'artista) o riattiva il link d'invito. */
export function AzioneLinkInvito({ userId, disattivato }: { userId: string; disattivato: boolean }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Messaggio>(null);

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = disattivato ? await riattivaLinkAction(userId, motivo) : await disattivaLinkAction(userId, motivo);
      setMsg(esitoInTesto(res, disattivato ? "Link riattivato." : "Link disattivato."));
      if (res.ok) {
        setAperto(false);
        setMotivo("");
        router.refresh();
      }
    });
  }

  if (!aperto) {
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" variant={disattivato ? "default" : "outline"} onClick={() => setAperto(true)}>
          {disattivato ? "Riattiva il link" : "Disattiva il link"}
        </Button>
        <Esito msg={msg} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      {disattivato ? (
        <label className="block text-xs">
          <span className="mb-1 block font-semibold">Nota (facoltativa, solo per il registro)</span>
          <input
            type="text"
            value={motivo}
            maxLength={300}
            disabled={pending}
            onChange={(e) => setMotivo(e.target.value)}
            className="h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-2 text-sm focus:border-azzurro focus:outline-none"
          />
        </label>
      ) : (
        <MotivazioneField
          label="Motivazione (obbligatoria)"
          regole={REGOLE_INVITI}
          disabled={pending}
          onChange={setMotivo}
          hint="Viene inviata per email all'artista, con il collegamento per contestare. Gli inviti già registrati proseguono."
        />
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={disattivato ? "default" : "accent"}
          disabled={pending || (!disattivato && motivo.trim().length < 10)}
          onClick={conferma}
        >
          {pending ? "Attendi…" : disattivato ? "Conferma: riattiva" : "Conferma: disattiva"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Annulla
        </Button>
      </div>
      <Esito msg={msg} />
    </div>
  );
}

/** Esclude un invito non ancora premiato. La motivazione va all'artista che ha invitato. */
export function EscludiInvito({ inviteId, nome }: { inviteId: string; nome: string }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Messaggio>(null);

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = await escludiInvitoAction(inviteId, motivo);
      setMsg(esitoInTesto(res, "Invito escluso."));
      if (res.ok) {
        setAperto(false);
        setMotivo("");
        router.refresh();
      }
    });
  }

  if (!aperto) {
    return (
      <div className="space-y-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => setAperto(true)} aria-label={`Escludi l'invito di ${nome}`}>
          Escludi
        </Button>
        <Esito msg={msg} />
      </div>
    );
  }

  return (
    <div className="w-72 space-y-2 text-left">
      <MotivazioneField
        compact
        label="Motivazione"
        regole={REGOLE_INVITI}
        disabled={pending}
        onChange={setMotivo}
        hint="L'invito non darà il mese di Pro. La motivazione va all'artista che ha invitato."
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="accent" disabled={pending || motivo.trim().length < 10} onClick={conferma}>
          {pending ? "Attendi…" : "Conferma: escludi"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Annulla
        </Button>
      </div>
      <Esito msg={msg} />
    </div>
  );
}
