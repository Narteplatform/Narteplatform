"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";

/**
 * Guscio comune dei blocchi: <form> + footer con Salva, stato e errore inline.
 *
 * L'errore resta a schermo anche dopo il toast: i messaggi di limite di piano
 * ("Il piano FREE include 3 foto…") sono lunghi e vanno letti con calma, non in
 * un avviso che sparisce dopo tre secondi.
 */
export function ProfileSectionForm({
  onSubmit,
  isDirty,
  isSubmitting,
  serverError,
  children,
  footerNote,
}: {
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isDirty: boolean;
  isSubmitting: boolean;
  serverError: string | null;
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {children}

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Salvataggio…" : "Salva"}
        </Button>
        {isDirty && !isSubmitting && (
          <span className="text-sm text-muted-foreground">Modifiche non salvate</span>
        )}
        {footerNote}
      </div>
    </form>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
