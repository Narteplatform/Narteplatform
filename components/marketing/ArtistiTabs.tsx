"use client";

import { useState, type ReactNode } from "react";
import { Sparkles, Users2 } from "lucide-react";

type TabKey = "artisti" | "consulente";

export function ArtistiTabs({
  artistsPanel,
  consultantPanel,
}: {
  artistsPanel: ReactNode;
  consultantPanel: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("artisti");

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3 md:mb-10">
        <TabButton
          active={active === "artisti"}
          onClick={() => setActive("artisti")}
          icon={<Users2 className="size-4" />}
        >
          Tutti gli artisti
        </TabButton>
        <TabButton
          active={active === "consulente"}
          onClick={() => setActive("consulente")}
          icon={<Sparkles className="size-4" />}
          featured
        >
          Consulente N&apos;arte
        </TabButton>
      </div>

      <div hidden={active !== "artisti"}>{artistsPanel}</div>
      <div hidden={active !== "consulente"}>{consultantPanel}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  featured = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  featured?: boolean;
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition";
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed="true"
        className={`${base} ${
          featured
            ? "bg-accent text-accent-foreground shadow-[0_4px_20px_rgba(232,84,42,0.35)]"
            : "bg-foreground text-background"
        }`}
      >
        {icon}
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed="false"
      className={`${base} border bg-background hover:border-accent ${
        featured
          ? "border-accent/40 text-accent hover:text-accent-foreground hover:bg-accent"
          : "border-border text-foreground"
      }`}
    >
      {icon}
      {children}
      {featured && !active && (
        <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
          NEW
        </span>
      )}
    </button>
  );
}
