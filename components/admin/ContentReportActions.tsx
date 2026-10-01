"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { decideReport, takeReportInCharge } from "@/app/(admin)/admin/segnalazioni/_actions";

const MIN = 10;

export function ContentReportActions({
  id,
  status,
  conflitto = null,
}: {
  id: string;
  status: "ricevuta" | "in_esame" | "accolta" | "respinta" | "archiviata";
  /** Avviso se chi decide ha preso la decisione contestata da questo reclamo. */
  conflitto?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confermaConflitto, setConfermaConflitto] = useState(false);

  if (status !== "ricevuta" && status !== "in_esame") return null;

  function prendiInCarico() {
    setMsg(null);
    start(async () => {
      const res = await takeReportInCharge(id);
      if (!res.ok) setMsg({ tone: "err", text: res.error });
      else router.refresh();
    });
  }

  function decidi(outcome: "accolta" | "respinta" | "archiviata") {
    setMsg(null);
    start(async () => {
      const res = await decideReport(id, outcome, note, confermaConflitto);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({
        tone: "ok",
        text: res.notified
          ? "Decisione registrata e comunicata al segnalante."
          : "Decisione registrata, ma l'email al segnalante non è partita: scrivigli a mano.",
      });
      router.refresh();
    });
  }

  const motivazioneOk = note.trim().length >= MIN && (!conflitto || confermaConflitto);

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {status === "ricevuta" && (
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={prendiInCarico}>
          Prendi in carico
        </Button>
      )}
      <div className="space-y-2">
        {conflitto && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p>{conflitto}</p>
            <label className="mt-2 flex items-start gap-2">
              <input
                type="checkbox"
                checked={confermaConflitto}
                disabled={pending}
                onChange={(e) => setConfermaConflitto(e.target.checked)}
                className="mt-0.5"
              />
              <span>Lo so: decido comunque io.</span>
            </label>
          </div>
        )}
        <MotivazioneField
          label="Motivazione (obbligatoria, la riceve il segnalante)"
          disabled={pending}
          onChange={setNote}
          maxFatti={1800}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending || !motivazioneOk} onClick={() => decidi("accolta")}>
            Accogli
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !motivazioneOk}
            onClick={() => decidi("respinta")}
          >
            Respingi
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || !motivazioneOk}
            onClick={() => decidi("archiviata")}
          >
            Archivia
          </Button>
        </div>
      </div>
      {msg && (
        <p role="status" className={msg.tone === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
