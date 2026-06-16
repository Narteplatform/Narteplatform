"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateConsultantCredentials } from "@/app/(admin)/admin/impostazioni/_actions";

type ConsultantOption = { id: string; name: string; email: string | null };

export function GenerateConsultantCredentials({
  consultants,
}: {
  consultants: ConsultantOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [consultantId, setConsultantId] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function submit() {
    setError(null);
    setResult(null);
    if (!consultantId && !email.trim()) {
      setError("Seleziona un consulente o inserisci un'email.");
      return;
    }
    start(async () => {
      const res = await generateConsultantCredentials({
        consultantId: consultantId || undefined,
        email: email.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setResult({ email: res.email, password: res.password });
      setConsultantId("");
      setEmail("");
      router.refresh();
    });
  }

  async function copyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${result.email}\nPassword: ${result.password}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copia negli appunti non riuscita.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Consulente esistente (senza account)
          </span>
          <select
            value={consultantId}
            onChange={(e) => setConsultantId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">— Seleziona —</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.email ? ` · ${c.email}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@esempio.it"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Opzionale se hai selezionato un consulente con email.
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? "Generazione..." : "Genera credenziali"}
      </Button>

      {result && (
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">
            Credenziali generate. Copiale e inviale al consulente: non saranno più visibili.
          </p>
          <dl className="grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">Email</dt>
              <dd className="font-mono break-all">{result.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">Password</dt>
              <dd className="font-mono break-all">{result.password}</dd>
            </div>
          </dl>
          <Button type="button" variant="outline" size="sm" onClick={copyAll}>
            {copied ? (
              <>
                <Check className="size-4" /> Copiato
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copia credenziali
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
