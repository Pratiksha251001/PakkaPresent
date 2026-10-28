import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border-2 px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        {
          "border-foreground/60 bg-primary text-primary-foreground":
            variant === "default",
          "border-foreground/25 bg-secondary text-secondary-foreground":
            variant === "secondary",
          "border-destructive/45 bg-destructive/10 text-destructive":
            variant === "destructive",
          "border-emerald-600/45 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400":
            variant === "success",
          "border-foreground/55 bg-transparent text-foreground":
            variant === "outline",
        },
        className,
      )}
      {...props}
    />
  );
}
