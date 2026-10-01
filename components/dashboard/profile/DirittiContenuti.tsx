"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { dichiaraDirittiContenuti } from "@/app/(artist)/dashboard/diritti/_actions";
import {
  DIRITTI_NON_DICHIARATI,
  TESTO_DICHIARAZIONE_DIRITTI,
} from "@/lib/legal/diritti-contenuti";

/**
 * Dichiarazione dei diritti sui contenuti, per tutta la pagina profilo.
 *
 * UNA modale sola, montata dal Provider: i blocchi (foto, audio, video,
 * copertina) non ne hanno una ciascuno. Compare in due casi:
 *  - prima del primo caricamento, se l'artista non ha ancora dichiarato per la
 *    versione legale in vigore (`richiedi`);
 *  - quando il server risponde `DIRITTI_NON_DICHIARATI` (`gestisciErrore`), che
 *    è la vera barriera: il controllo lato client è solo cortesia.
 *
 * Una volta confermata, vale per tutti i blocchi senza ricaricare la pagina.
 */

type DirittiContextValue = {
  dichiarato: boolean;
  /** True se si può procedere; altrimenti apre la modale e restituisce false. */
  richiedi: () => boolean;
  /** Se `error` è il codice del server apre la modale e restituisce true. */
  gestisciErrore: (error: string | null | undefined) => boolean;
};

const DirittiContext = React.createContext<DirittiContextValue | null>(null);

export function DirittiContenutiProvider({
  initialDichiarato,
  children,
}: {
  initialDichiarato: boolean;
  children: React.ReactNode;
}) {
  const [dichiarato, setDichiarato] = React.useState(initialDichiarato);
  const [open, setOpen] = React.useState(false);

  const value = React.useMemo<DirittiContextValue>(
    () => ({
      dichiarato,
      richiedi: () => {
        if (dichiarato) return true;
        setOpen(true);
        return false;
      },
      gestisciErrore: (error) => {
        if (error !== DIRITTI_NON_DICHIARATI) return false;
        // Il server ha l'ultima parola: se dice «non dichiarato» lo stato del
        // client era sbagliato (versione cambiata, ritiro) e va corretto.
        setDichiarato(false);
        setOpen(true);
        return true;
      },
    }),
    [dichiarato]
  );

  return (
    <DirittiContext.Provider value={value}>
      {children}
      <DirittiContenutiModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirmed={() => {
          setDichiarato(true);
          setOpen(false);
          toast.success("Dichiarazione registrata. Ora puoi caricare i tuoi contenuti.");
        }}
      />
    </DirittiContext.Provider>
  );
}

/**
 * Fuori dal Provider restituisce un valore neutro: il client non blocca nulla e
 * resta il controllo del server, che non dipende da questo stato.
 */
export function useDirittiContenuti(): DirittiContextValue {
  return (
    React.useContext(DirittiContext) ?? {
      dichiarato: true,
      richiedi: () => true,
      gestisciErrore: () => false,
    }
  );
}

function DirittiContenutiModal({
  open,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [checked, setChecked] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  // Esc chiude, il focus va sulla casella all'apertura e torna dove era alla
  // chiusura. onClose/pending passano da un ref: l'effetto dipende solo da `open`.
  const chiudiRef = React.useRef({ onClose, pending });
  chiudiRef.current = { onClose, pending };
  React.useEffect(() => {
    if (!open) return;
    const prima = document.activeElement as HTMLElement | null;
    checkboxRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !chiudiRef.current.pending) chiudiRef.current.onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prima?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function conferma() {
    setError(null);
    startTransition(async () => {
      const res = await dichiaraDirittiContenuti();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setChecked(false);
      onConfirmed();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diritti-contenuti-title"
      onClick={() => !pending && onClose()}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-lg bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="diritti-contenuti-title" className="font-display text-lg tracking-tight">
          Prima di caricare
        </h2>
        <label className="flex items-start gap-2 text-sm">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>{TESTO_DICHIARAZIONE_DIRITTI}</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Le regole complete sono nelle{" "}
          <Link
            href={process.env.NEXT_PUBLIC_LEGAL_V2_PUBBLICATO === "1" ? "/condizioni-artisti" : "/termini"}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {process.env.NEXT_PUBLIC_LEGAL_V2_PUBBLICATO === "1"
              ? "condizioni per gli artisti"
              : "condizioni d'uso"}
          </Link>
          .
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Annulla
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={conferma}
            disabled={!checked || pending}
          >
            {pending ? "Registrazione…" : "Confermo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
