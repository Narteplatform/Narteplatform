import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-lg",
};

function initialsFrom(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: Size;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, alt, name, size = "md", className, ...props }, ref) => {
    const initials = initialsFrom(name ?? alt);
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-foreground font-medium uppercase tracking-tight",
          sizeMap[size],
          className
        )}
        {...props}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? name ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  items: { src?: string | null; name?: string | null; alt?: string }[];
  size?: Size;
  max?: number;
}

export function AvatarStack({ items, size = "sm", max = 4, className, ...props }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const extra = items.length - visible.length;
  return (
    <div className={cn("flex items-center", className)} {...props}>
      {visible.map((item, i) => (
        <Avatar
          key={i}
          src={item.src}
          name={item.name}
          alt={item.alt}
          size={size}
          title={item.name ?? item.alt ?? undefined}
          className={cn(i > 0 && "-ml-2", "ring-2 ring-background")}
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted text-foreground text-xs font-medium ring-2 ring-background -ml-2",
            sizeMap[size]
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
