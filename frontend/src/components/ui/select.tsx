import React, { createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
  onValueChange?: (value: string) => void;
}

interface SelectContextValue {
  value?: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, children, options, onValueChange, value, onChange, ...props },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    if (options || !children) {
      return (
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-xl border-2 border-foreground/45 bg-card px-3 py-2 text-sm font-medium shadow-none transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
          value={value}
          onChange={onChange}
        >
          {options
            ? options.map((opt, idx) => (
                <option key={`${opt.value}-${idx}`} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      );
    }

    return (
      <SelectContext.Provider
        value={{
          value: value as string | undefined,
          onValueChange: onValueChange || (() => undefined),
          open,
          setOpen,
        }}
      >
        <div className={cn("relative", className)}>{children}</div>
      </SelectContext.Provider>
    );
  },
);
Select.displayName = "Select";

export const SelectTrigger: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => {
  const context = useContext(SelectContext);
  return (
    <button
      type="button"
      {...props}
      onClick={() => context?.setOpen(!context.open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border-2 border-foreground/45 bg-card px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<{
  placeholder?: string;
  displayValue?: string;
}> = ({ placeholder, displayValue }) => {
  const context = useContext(SelectContext);
  const label = context?.value;
  return <span>{displayValue || label || placeholder || ""}</span>;
};

export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const context = useContext(SelectContext);
  if (!context?.open) return null;
  return (
    <div
      {...props}
      className={cn(
        "absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border-2 border-foreground bg-card p-1 shadow-[0_5px_0_0_hsl(var(--foreground)/0.22)]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
> = ({ value, className, children, ...props }) => {
  const context = useContext(SelectContext);
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() => {
        context?.onValueChange(value);
        context?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
};
