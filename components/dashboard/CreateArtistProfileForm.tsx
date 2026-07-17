"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createArtistProfile } from "@/app/(artist)/dashboard/profili/_actions";
import { Button } from "@/components/ui/Button";

export function CreateArtistProfileForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stageName, setStageName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createArtistProfile({
        stage_name: stageName.trim(),
        city: city.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setStageName("");
      setCity("");
      // Il nuovo profilo diventa quello attivo: si va dritti a compilarlo.
      router.push("/dashboard/profilo-artista");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Nome d&apos;arte</span>
          <input
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            disabled={pending}
            placeholder="Es. Trio Mediterraneo"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">
            Città <span className="text-muted-foreground">(facoltativa)</span>
          </span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            disabled={pending}
            placeholder="Es. Napoli"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending || stageName.trim().length < 2}>
        {pending ? "Creazione…" : "Crea profilo"}
      </Button>
    </form>
  );
}
