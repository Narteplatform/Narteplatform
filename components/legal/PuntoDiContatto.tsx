import { TITOLARE } from "@/lib/legal/titolare";

/**
 * Punto di contatto unico per autorità e utenti (artt. 11-12 Reg. UE
 * 2022/2065, DSA). Stessi dati in /segnalazioni, /contatti e nel regolamento:
 * vengono tutti da lib/legal/titolare.ts.
 */
export function PuntoDiContatto({ className }: { className?: string }) {
  const lingue = TITOLARE.lingueContatto.join(" e ");
  return (
    <div className={className}>
      <h2 className="font-display text-lg text-foreground">Punto di contatto unico</h2>
      <p className="mt-1">
        Per autorità e utenti, anche ai sensi del Regolamento UE 2022/2065 (Digital Services Act):{" "}
        <a href={`mailto:${TITOLARE.emailContatti}`} className="underline underline-offset-2">
          {TITOLARE.emailContatti}
        </a>
        {" · "}PEC{" "}
        <a href={`mailto:${TITOLARE.pec}`} className="underline underline-offset-2">
          {TITOLARE.pec}
        </a>
        . Lingue: {lingue}.
      </p>
    </div>
  );
}
