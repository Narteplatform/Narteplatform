import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stelle di valutazione, in sola lettura.
 *
 * Il disegno delle cinque stelle era ripetuto in tre posti diversi — il modulo
 * di recensione, quello di feedback sulla piattaforma e la dashboard artista —
 * ognuno con le proprie classi e il proprio colore. Da qui in avanti ce n'è
 * uno solo.
 *
 * Supporta i mezzi voti: una media di 4,3 non può essere resa con quattro
 * stelle piene, e arrotondare a 4 o a 5 falsa il dato. La mezza stella si
 * ottiene sovrapponendo una stella piena ritagliata a una vuota, senza SVG
 * personalizzati.
 *
 * Non è un Client Component: è presentazionale puro, quindi si può usare tanto
 * nelle pagine server (profilo pubblico, catalogo) quanto dentro componenti
 * interattivi.
 */

const DIMENSIONI = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

export function StarRating({
  value,
  size = "md",
  className,
  showValue = false,
  count,
}: {
  /** Voto da 0 a 5. Sono ammessi i decimali. */
  value: number;
  size?: keyof typeof DIMENSIONI;
  className?: string;
  /** Mostra il valore numerico accanto alle stelle. */
  showValue?: boolean;
  /** Numero di recensioni su cui è calcolata la media. */
  count?: number;
}) {
  const sicuro = Math.max(0, Math.min(5, Number.isFinite(value) ? value : 0));
  const dim = DIMENSIONI[size];

  // L'etichetta accessibile è quella che conta: il lettore di schermo annuncia
  // il voto, non cinque icone consecutive.
  const etichetta =
    typeof count === "number"
      ? `Valutazione ${sicuro.toFixed(1)} su 5, su ${count} ${count === 1 ? "recensione" : "recensioni"}`
      : `Valutazione ${sicuro.toFixed(1)} su 5`;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={etichetta}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const riempimento = Math.max(0, Math.min(1, sicuro - i));
          return (
            <span key={i} className="relative inline-flex">
              <Star className={cn(dim, "text-palco-60")} />
              {riempimento > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${riempimento * 100}%` }}
                >
                  <Star className={cn(dim, "fill-amber-400 text-amber-400")} />
                </span>
              )}
            </span>
          );
        })}
      </span>

      {showValue && (
        <span
          className="text-sm font-semibold tabular-nums"
          aria-hidden="true"
        >
          {sicuro.toFixed(1).replace(".", ",")}
          {typeof count === "number" && (
            <span className="ml-1 font-normal text-muted-foreground">({count})</span>
          )}
        </span>
      )}
    </span>
  );
}
