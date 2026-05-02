"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { setLeadTags } from "@/app/(admin)/admin/leads/_actions";
import { cn } from "@/lib/utils";

const SUGGESTED = ["caldo", "freddo", "follow-up", "preventivo", "no-budget", "spam"] as const;

export function LeadTagsEditor({
  leadId,
  initialTags,
}: {
  leadId: string;
  initialTags: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function commit(next: string[]) {
    setErr(null);
    setTags(next);
    start(async () => {
      const res = await setLeadTags(leadId, next);
      if (!res.ok) setErr(res.error ?? "Errore");
      router.refresh();
    });
  }

  function addTag(value: string) {
    const v = value.trim().toLowerCase();
    if (!v) return;
    if (tags.includes(v)) return;
    commit([...tags, v]);
    setDraft("");
  }

  function removeTag(value: string) {
    commit(tags.filter((t) => t !== value));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full border border-foreground/20 bg-muted px-3 py-1 text-xs uppercase"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              aria-label={`rimuovi tag ${t}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-foreground/30 px-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="aggiungi tag…"
            disabled={pending}
            className="h-7 w-32 bg-transparent text-xs uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => addTag(draft)}
            disabled={pending || draft.trim() === ""}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="aggiungi"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-[10px] uppercase text-muted-foreground">
        <span>suggeriti:</span>
        {SUGGESTED.filter((s) => !tags.includes(s)).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => addTag(s)}
            disabled={pending}
            className={cn(
              "rounded-full border border-border px-2 py-0.5 hover:border-foreground",
              pending && "opacity-50"
            )}
          >
            + {s}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
