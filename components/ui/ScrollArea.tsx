import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  snap?: boolean;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = "horizontal", snap = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        orientation === "horizontal"
          ? "overflow-x-auto overflow-y-hidden"
          : "overflow-y-auto overflow-x-hidden",
        snap && (orientation === "horizontal" ? "snap-x snap-mandatory" : "snap-y snap-mandatory"),
        "narte-scrollbar",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ScrollArea.displayName = "ScrollArea";
