import React, { createContext, useContext } from "react";
import { cn } from "../../lib/utils";
interface Ctx {
  value: string;
  change: (value: string) => void;
  disabled?: boolean;
}
const Context = createContext<Ctx | null>(null);
export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}
export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  disabled,
  className,
  children,
  ...props
}) => (
  <Context.Provider value={{ value, change: onValueChange, disabled }}>
    <div {...props} role="radiogroup" className={cn("space-y-2", className)}>
      {children}
    </div>
  </Context.Provider>
);
export interface RadioGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
}
export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, disabled, className, onClick, ...props }, ref) => {
    const c = useContext(Context);
    if (!c) throw new Error("RadioGroupItem must be used inside RadioGroup");
    const selected = c.value === value;
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled || c.disabled}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented && !disabled && !c.disabled) c.change(value);
        }}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-foreground/45 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-40",
          selected && "border-primary",
          className,
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
      </button>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";
