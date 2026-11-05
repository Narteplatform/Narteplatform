"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { annullaMisuraAction } from "@/app/(admin)/admin/utenti/_actions";

/**
 * Sospensione o chiusura programmata con preavviso (artisti con partita IVA):
 * mostra la data e permette di annullarla, ad esempio dopo un reclamo accolto.
 */
export function MisuraProgrammata({
  userId,
  tipo,
  efficaceDal,
}: {
  userId: string;
  tipo: "sospensione" | "chiusura";
  efficaceDal: string;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const quando = new Date(efficaceDal).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });

  function conferma() {
    setErrore(null);
    start(async () => {
      const res = await annullaMisuraAction(userId, motivo);
      if (!res.ok) {
        setErrore(res.error);
        return;
      }
      setAperto(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 text-left text-xs">
      <p className="font-semibold text-corallo-dark">
        {tipo === "sospensione" ? "Sospensione" : "Chiusura"} programmata per il {quando}
      </p>
      {!aperto ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setAperto(true)}>
          Annulla la misura
        </Button>
      ) : (
        <div className="max-w-md space-y-2">
          <MotivazioneField compact label="Perché si annulla (obbligatorio)" disabled={pending} onChange={setMotivo} />
          {errore && (
            <p role="alert" className="text-corallo">
              {errore}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending || motivo.trim().length < 10} onClick={conferma}>
              {pending ? "Attendi…" : "Conferma annullamento"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAperto(false)}>
              Indietro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
