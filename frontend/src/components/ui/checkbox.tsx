import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  invalid?: boolean;
}
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled, invalid, className, onClick, ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked);
      }}
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-foreground/45 bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
        checked && "border-primary bg-primary text-primary-foreground",
        invalid && "border-destructive",
        className,
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  ),
);
Checkbox.displayName = "Checkbox";
