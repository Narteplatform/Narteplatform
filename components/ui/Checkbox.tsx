"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Casella di spunta accessibile.
 *
 * Prima non esisteva: i dieci checkbox sparsi nel progetto erano
 * `<input type="checkbox">` nudi, ognuno con le proprie classi o senza
 * nessuna. Serviva un componente vero per i consensi privacy, dove la casella
 * non è un dettaglio estetico ma la prova che il consenso è stato dato.
 *
 * PERCHÉ NON RADIX: `@radix-ui/react-checkbox` non è fra le dipendenze del
 * progetto e aggiungerne una per un solo controllo non si giustifica.
 * L'`<input>` nativo è già accessibile per costruzione — tastiera, lettori di
 * schermo, stato indeterminato — e qui viene solo reso invisibile e sostituito
 * da una casella disegnata, senza toccarne il comportamento.
 *
 * `forwardRef` è indispensabile: senza, `register()` di react-hook-form non
 * riesce ad agganciare il campo.
 */

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  /** Testo accanto alla casella. Accetta JSX per contenere collegamenti. */
  label?: React.ReactNode;
  /** Riga di spiegazione sotto l'etichetta. */
  hint?: React.ReactNode;
  /** Messaggio d'errore: sostituisce l'hint e colora il bordo. */
  error?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generato = React.useId();
    const inputId = id ?? generato;
    const descId = `${inputId}-desc`;

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-start gap-2.5">
          <span className="relative mt-0.5 inline-flex shrink-0">
            <input
              ref={ref}
              id={inputId}
              type="checkbox"
              aria-invalid={error ? true : undefined}
              aria-describedby={hint || error ? descId : undefined}
              className="peer size-[18px] cursor-pointer appearance-none rounded border border-border bg-surface transition-colors checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-error"
              {...props}
            />
            {/* `pointer-events-none` perché il click deve arrivare all'input
                sottostante, non fermarsi sull'icona sovrapposta. */}
            <Check
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 size-[18px] scale-75 p-[2px] text-accent-foreground opacity-0 transition-opacity peer-checked:opacity-100"
            />
          </span>

          {label && (
            <label
              htmlFor={inputId}
              className="cursor-pointer select-none text-sm leading-snug"
            >
              {label}
            </label>
          )}
        </div>

        {(hint || error) && (
          <p
            id={descId}
            className={cn(
              "pl-[28px] text-xs",
              error ? "text-error" : "text-muted-foreground"
            )}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
