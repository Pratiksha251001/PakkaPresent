import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border-2 text-sm font-bold transition-[transform,background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer motion-reduce:transform-none",
          {
            "border-foreground bg-primary text-primary-foreground shadow-[0_2px_0_0_hsl(var(--foreground)/0.28)] hover:-translate-y-0.5 hover:bg-primary/85 hover:shadow-[0_3px_0_0_hsl(var(--foreground)/0.28)]":
              variant === "default",
            "border-destructive bg-destructive text-destructive-foreground shadow-[0_3px_0_0_hsl(var(--destructive)/0.35)] hover:-translate-y-0.5 hover:bg-destructive/90":
              variant === "destructive",
            "border-foreground/70 bg-background text-foreground shadow-sm hover:-translate-y-0.5 hover:bg-secondary":
              variant === "outline",
            "border-foreground/60 bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-primary/35":
              variant === "secondary",
            "border-transparent text-foreground hover:border-foreground/25 hover:bg-secondary":
              variant === "ghost",
            "border-transparent p-0 text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary-foreground":
              variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-lg px-3 text-xs": size === "sm",
            "h-11 rounded-xl px-6 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
