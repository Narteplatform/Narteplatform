"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { inviaAvvisoModifiche } from "./_actions";

export function InviaAvvisoModifiche({ destinatari }: { destinatari: number }) {
  const router = useRouter();
  const [conferma, setConferma] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function invia() {
    setMsg(null);
    start(async () => {
      const r = await inviaAvvisoModifiche();
      setMsg(r.ok ? `Inviate ${r.inviate} email${r.fallite ? `, ${r.fallite} non partite (vedi Email)` : ""}.` : r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={conferma} onChange={(e) => setConferma(e.target.checked)} className="mt-0.5" />
        <span>Confermo di inviare l&apos;avviso a {destinatari} utenti. Si invia una volta sola per data.</span>
      </label>
      <Button type="button" size="sm" disabled={!conferma || pending} onClick={invia}>
        {pending ? "Invio in corso…" : "Invia l'avviso"}
      </Button>
      {msg && <p role="status" className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
