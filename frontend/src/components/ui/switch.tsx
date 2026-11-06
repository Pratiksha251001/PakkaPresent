import React from "react";
import { cn } from "../../lib/utils";
export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className, onClick, ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
        checked
          ? "border-primary bg-primary"
          : "border-foreground/35 bg-muted-foreground/35 dark:border-foreground/30 dark:bg-muted-foreground/40",
        className,
      )}
    >
      <span
        className={cn(
          "block h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/15 transition-transform dark:ring-white/15",
          checked
            ? "translate-x-5 dark:bg-primary-foreground"
            : "translate-x-0.5 dark:bg-foreground",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";
