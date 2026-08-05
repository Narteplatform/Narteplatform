"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/**
 * Campo password con interruttore mostra/nascondi.
 *
 * Su un modulo di accesso è la differenza fra riprovare tre volte e entrare al
 * primo colpo, soprattutto da telefono dove la tastiera nasconde metà schermo.
 * Il bottone è `tabIndex={-1}`: chi naviga da tastiera passa da password a
 * "Accedi" senza inciampare in un controllo che non gli serve, e resta
 * comunque raggiungibile col puntatore e dallo screen reader.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const [shown, setShown] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={shown ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Nascondi password" : "Mostra password"}
        className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
