"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createGenre, deleteGenre } from "@/app/(admin)/admin/generi/_actions";

type Genre = { id: string; name: string; order_index: number };

export function GenresManager({ genres }: { genres: Genre[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim()) return;
    setError(null);
    start(async () => {
      const res = await createGenre(name);
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteGenre(id);
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 border border-border p-4">
        <Label>Aggiungi nuovo genere</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Drill, Lo-fi…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className="max-w-xs"
          />
          <Button type="button" onClick={add} disabled={pending}>
            <Plus className="size-4" /> Aggiungi
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="border border-border">
        {genres.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nessun genere. Aggiungi il primo qui sopra.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {genres.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm">{g.name}</span>
                <button
                  type="button"
                  onClick={() => remove(g.id)}
                  disabled={pending}
                  aria-label={`Rimuovi ${g.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-red-600"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
