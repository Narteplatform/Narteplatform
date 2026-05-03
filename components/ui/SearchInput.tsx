import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "compact" | "sidebar";
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, variant = "default", placeholder = "Cerca…", ...props }, ref) => {
    const sizing =
      variant === "compact"
        ? "h-9 text-sm"
        : variant === "sidebar"
        ? "h-10 bg-muted/50 border-transparent text-sm"
        : "h-11 text-sm";
    return (
      <div className={cn("relative w-full", className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn(
            "w-full rounded-full border border-border bg-background pl-9 pr-4 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground",
            sizing
          )}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
