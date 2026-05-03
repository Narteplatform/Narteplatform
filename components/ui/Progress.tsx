import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "accent";
}

export function Progress({
  value,
  max = 100,
  variant = "default",
  className,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-valuemin={0}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          variant === "accent" ? "bg-accent" : "bg-foreground"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
