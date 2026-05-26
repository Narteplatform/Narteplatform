"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  max?: number;
};

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleziona…",
  emptyText = "Nessuna opzione",
  searchPlaceholder = "Cerca…",
  className,
  max,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = React.useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else {
      if (max && value.length >= max) return;
      onChange([...value, v]);
    }
  }

  function remove(v: string) {
    onChange(value.filter((x) => x !== v));
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm",
            "focus:outline-none focus:ring-2 focus:ring-foreground",
            className
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((o) => (
                <span
                  key={o.value}
                  className="inline-flex items-center gap-1 rounded-full border border-foreground/30 bg-muted px-2 py-0.5 text-xs"
                >
                  {o.label}
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(o.value);
                    }}
                    className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Rimuovi ${o.label}`}
                  >
                    <X className="size-3" />
                  </span>
                </span>
              ))
            )}
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[--radix-popover-trigger-width] overflow-hidden rounded-md border border-border bg-background shadow-lg"
        >
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              filtered.map((o) => {
                const checked = value.includes(o.value);
                const disabled = !checked && max !== undefined && value.length >= max;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => toggle(o.value)}
                      disabled={disabled}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
                        checked && "bg-muted/60",
                        disabled && "cursor-not-allowed opacity-40"
                      )}
                    >
                      <span>{o.label}</span>
                      {checked && <Check className="size-4 text-foreground" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
