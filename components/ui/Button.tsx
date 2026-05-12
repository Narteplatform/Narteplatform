import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold tracking-[0.01em] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-azzurro text-white hover:bg-azzurro-dark hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(26,107,173,0.30)]",
        outline:
          "border border-azzurro/80 bg-transparent text-azzurro hover:bg-azzurro-subtle",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        accent:
          "bg-corallo text-white hover:bg-corallo-dark hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(232,84,42,0.30)]",
        dark:
          "bg-notte-80 text-palco hover:bg-notte",
        link:
          "underline-offset-4 hover:underline text-azzurro",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px] rounded-md",
        md: "h-10 px-5 text-sm rounded-md",
        lg: "h-12 px-7 text-base rounded-md",
        pill: "h-10 px-5 text-sm rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
