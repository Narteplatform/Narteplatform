"use client";

import { useState, useTransition } from "react";
import { ADMIN_PAGE_KEYS, type AdminPageKey } from "@/lib/validators/schemas";
import { Button } from "@/components/ui/Button";
import { updatePagePermissions, removeSuperadmin } from "@/app/(admin)/admin/impostazioni/_actions";

const PAGE_LABELS: Record<AdminPageKey, string> = {
  overview: "Overview",
  eventi: "Eventi",
  format: "Format",
  artisti: "Artisti",
  generi: "Generi",
  leads: "Lead",
  richieste: "Richieste",
  chat: "Chat",
  consulenza: "Consulenza",
  blog: "Blog",
  email: "Email",
  profilo: "Profilo",
  impostazioni: "Impostazioni",
  feedback: "Feedback",
};

const FORCED: AdminPageKey[] = ["overview", "profilo"];

export type SuperadminRow = {
  id: string;
  email: string;
  full_name: string | null;
  is_root: boolean;
  allowed: AdminPageKey[];
};

export function PermissionsMatrix({ rows }: { rows: SuperadminRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun superadmin secondario. Invita qualcuno per assegnare permessi.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {rows.map((r) => (
        <SuperadminRowEditor key={r.id} row={r} />
      ))}
    </div>
  );
}

function SuperadminRowEditor({ row }: { row: SuperadminRow }) {
  const [selected, setSelected] = useState<Set<AdminPageKey>>(new Set(row.allowed));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(key: AdminPageKey) {
    if (FORCED.includes(key) || row.is_root) return;
    setDone(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setDone(false);
    setSelected(new Set<AdminPageKey>(ADMIN_PAGE_KEYS));
  }

  function selectNone() {
    setDone(false);
    setSelected(new Set<AdminPageKey>(FORCED));
  }

  function save() {
    setError(null);
    setDone(false);
    const fd = new FormData();
    fd.set("user_id", row.id);
    for (const key of selected) {
      if (!FORCED.includes(key)) fd.append("page_keys", key);
    }
    startTransition(async () => {
      const res = await updatePagePermissions(fd);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  function demote() {
    if (row.is_root) return;
    if (!confirm(`Rimuovere ${row.email} dai superadmin?`)) return;
    setError(null);
    const fd = new FormData();
    fd.set("user_id", row.id);
    startTransition(async () => {
      const res = await removeSuperadmin(fd);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="font-medium">{row.full_name || row.email}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
          {row.is_root && (
            <p className="mt-1 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
              Root — accesso totale
            </p>
          )}
        </div>
        {!row.is_root && (
          <Button type="button" variant="ghost" size="sm" onClick={demote} disabled={pending}>
            Rimuovi superadmin
          </Button>
        )}
      </header>

      {!row.is_root && (
        <>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Tutto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={selectNone}>
              Niente
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {ADMIN_PAGE_KEYS.map((key) => {
              const isForced = FORCED.includes(key);
              const checked = selected.has(key) || isForced;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm ${
                    isForced ? "opacity-60" : "cursor-pointer hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isForced}
                    onChange={() => toggle(key)}
                    className="size-4 accent-azzurro"
                  />
                  <span>{PAGE_LABELS[key]}</span>
                </label>
              );
            })}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {done && <p className="mt-3 text-sm text-emerald-600">Permessi salvati.</p>}
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Salvataggio…" : "Salva permessi"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
