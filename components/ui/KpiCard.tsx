import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  sublabel?: string;
  href?: string;
  className?: string;
}

export function KpiCard({ label, value, icon, sublabel, href, className }: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <span className="font-display text-5xl leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {href && (
          <ArrowUpRight
            className="size-4 text-muted-foreground transition group-hover:text-foreground"
            aria-hidden="true"
          />
        )}
      </div>
      {sublabel && (
        <p className="mt-3 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </>
  );

  const baseClass = cn(
    "group block rounded-2xl border border-border bg-background p-5 transition",
    href && "hover:border-foreground/30 hover:shadow-sm",
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }
  return <div className={baseClass}>{content}</div>;
}
