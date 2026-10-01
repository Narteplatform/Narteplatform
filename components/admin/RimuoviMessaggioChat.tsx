"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { rimuoviMessaggioChat } from "@/lib/chat/moderation";

/**
 * «Rimuovi» su un singolo messaggio o allegato, visibile solo al Team con un
 * accesso motivato valido. Il mittente riceve la motivazione per email.
 */
export function RimuoviMessaggioChat({
  conversationId,
  messageId,
  haAllegato,
}: {
  conversationId: string;
  messageId: string;
  haAllegato: boolean;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function conferma() {
    setError(null);
    start(async () => {
      const res = await rimuoviMessaggioChat({ conversationId, messageId, motivo });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAperto(false);
      router.refresh();
    });
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-600 underline-offset-2 hover:underline"
      >
        <Trash2 className="size-3" aria-hidden /> Rimuovi
      </button>
    );
  }

  return (
    <div className="mt-2 w-72 max-w-full space-y-2 rounded-lg border border-red-200 bg-white p-3 text-left text-notte">
      <MotivazioneField
        compact
        rows={2}
        label={haAllegato ? "Motivazione (rimuove anche l'allegato)" : "Motivazione"}
        disabled={pending}
        maxFatti={400}
        onChange={setMotivo}
        hint="Viene inviata al mittente per email, con il collegamento per contestare."
      />
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
          Annulla
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !motivo}
          onClick={conferma}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {pending ? "Rimozione…" : "Conferma rimozione"}
        </Button>
      </div>
    </div>
  );
}
