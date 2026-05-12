import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border-[1.5px] border-border bg-surface text-foreground transition-colors duration-150 placeholder:text-palco-40 focus:outline-none focus:border-azzurro focus:ring-[3px] focus:ring-azzurro/15 disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(fieldBase, "h-10 px-3 text-sm", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, "min-h-[120px] px-3 py-2.5 text-sm leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-[12px] font-semibold tracking-[0.02em] text-foreground mb-1.5",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";
