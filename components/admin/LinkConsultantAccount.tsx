"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { linkConsultantAccount } from "@/app/(admin)/admin/consulenza/_actions";

export function LinkConsultantAccount({
  consultantId,
  initialEmail,
}: {
  consultantId: string;
  initialEmail?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");

  function submit() {
    setError(null);
    if (!email.trim() || password.length < 8) {
      setError("Email valida e password (min 8 caratteri) obbligatorie.");
      return;
    }
    start(async () => {
      const res = await linkConsultantAccount({
        consultantId,
        email: email.trim(),
        password,
      });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setOpen(false);
      setPassword("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Crea account di login
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
      <p className="text-sm font-medium">Crea account di login per questo consulente</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Creazione..." : "Crea e collega"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
            setPassword("");
          }}
        >
          Annulla
        </Button>
      </div>
    </div>
  );
}
