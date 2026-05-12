import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap font-sans",
  {
    variants: {
      variant: {
        default: "bg-azzurro/10 text-azzurro",
        muted: "bg-muted text-foreground",
        success: "bg-[#2A9D5C18] text-[#1F7A46]",
        warning: "bg-[#E8A03022] text-[#B87020]",
        danger: "bg-[#D93D2A18] text-[#D93D2A]",
        accent: "bg-corallo/10 text-corallo-dark",
        dark: "bg-notte text-palco",
        outline: "border border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const DOT_COLOR: Record<string, string> = {
  default: "bg-azzurro",
  success: "bg-[#2A9D5C]",
  warning: "bg-[#E8A030]",
  danger: "bg-[#D93D2A]",
  accent: "bg-corallo",
  dark: "bg-palco",
  muted: "bg-muted-foreground",
  outline: "bg-muted-foreground",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const dotColor = DOT_COLOR[variant ?? "default"] ?? "bg-current";
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotColor)} />}
      {children}
    </span>
  );
}
