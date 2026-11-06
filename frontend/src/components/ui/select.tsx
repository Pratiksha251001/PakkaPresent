import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options?: SelectOption[];
  value?: string | number | readonly string[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  title?: string;
  placeholder?: string;
  valuePrefix?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  contentWidth?: "trigger" | "wide";
  children?: React.ReactNode;
}

interface PopupPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  listboxId: string;
}

const SelectContext = createContext<SelectContextValue | null>(null);

const dispatchLegacyChange = (onChange: SelectProps["onChange"], value: string) => {
  if (!onChange) return;
  onChange({
    target: { value },
    currentTarget: { value },
  } as React.ChangeEvent<HTMLSelectElement>);
};

const getPopupPosition = (
  trigger: HTMLElement,
  contentWidth: SelectProps["contentWidth"],
): PopupPosition => {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 12;
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
  const desiredWidth = contentWidth === "wide" ? Math.max(rect.width, 420) : rect.width;
  const width = Math.min(desiredWidth, window.innerWidth - viewportPadding * 2);
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    window.innerWidth - width - viewportPadding,
  );
  const available = Math.max(160, (openAbove ? spaceAbove : spaceBelow) - gap);
  return {
    left,
    width,
    maxHeight: Math.min(440, available),
    ...(openAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
  };
};

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      className,
      children,
      options,
      onValueChange,
      value,
      onChange,
      disabled = false,
      name,
      required,
      title,
      placeholder = "Select an option",
      valuePrefix = "",
      searchable = false,
      searchPlaceholder = "Search options...",
      emptyMessage = "No options available",
      contentWidth = "trigger",
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [position, setPosition] = useState<PopupPosition | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listboxId = `select-${useId().replace(/:/g, "")}`;
    const stringValue = String(value ?? "");
    const selectedOption = options?.find((option) => option.value === stringValue);
    const filteredOptions = useMemo(() => {
      if (!options || !query.trim()) return options ?? [];
      const normalized = query.toLowerCase().trim();
      return options.filter((option) =>
        [option.label, option.description, option.searchText]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      );
    }, [options, query]);

    const updatePosition = () => {
      if (triggerRef.current) {
        setPosition(getPopupPosition(triggerRef.current, contentWidth));
      }
    };

    const selectValue = (nextValue: string) => {
      onValueChange?.(nextValue);
      dispatchLegacyChange(onChange, nextValue);
      setOpen(false);
      setQuery("");
      requestAnimationFrame(() => triggerRef.current?.focus());
    };

    useLayoutEffect(() => {
      if (!open) return;
      updatePosition();

      const handleViewportScroll = (event: Event) => {
        const target = event.target;

        if (target instanceof Node && popupRef.current?.contains(target)) {
          return;
        }

        updatePosition();
      };

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", handleViewportScroll, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", handleViewportScroll, true);
      };
    }, [open, contentWidth]);

    useEffect(() => {
      const closeOutside = (event: PointerEvent) => {
        const target = event.target as Node;
        if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) {
          setOpen(false);
        }
      };
      document.addEventListener("pointerdown", closeOutside);
      return () => document.removeEventListener("pointerdown", closeOutside);
    }, []);

    useEffect(() => {
      if (!open) setQuery("");
    }, [open]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!options?.length) return;
      const enabled = filteredOptions.filter((option) => !option.disabled);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const focused = document.activeElement?.getAttribute("data-select-value");
        const current = enabled.findIndex((option) => option.value === focused);
        let next = current;
        if (event.key === "Home") next = 0;
        else if (event.key === "End") next = enabled.length - 1;
        else if (event.key === "ArrowDown") next = Math.min(enabled.length - 1, current + 1);
        else next = Math.max(0, current < 0 ? enabled.length - 1 : current - 1);
        popupRef.current
          ?.querySelector<HTMLButtonElement>(`[data-select-index="${Math.max(0, next)}"]`)
          ?.focus();
      }
    };

    if (options) {
      const popup =
        open && position
          ? createPortal(
              <div
                ref={popupRef}
                style={{
                  position: "fixed",
                  left: position.left,
                  top: position.top,
                  bottom: position.bottom,
                  width: position.width,
                  maxHeight: position.maxHeight,
                }}
                className="z-[200] flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_4px_0_0_hsl(var(--border))]"
              >
                {searchable && (
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none hover:border-foreground/50 focus:border-foreground/60 focus:ring-0"
                      />
                    </div>
                  </div>
                )}
                <div
                  id={listboxId}
                  role="listbox"
                  className="min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.55)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/55"
                >
                  {filteredOptions.length ? (
                    filteredOptions.map((option, index) => {
                      const selected = option.value === stringValue;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          data-select-value={option.value}
                          data-select-index={index}
                          disabled={option.disabled}
                          onClick={() => selectValue(option.value)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                            option.description ? "min-h-12" : "h-10",
                            selected &&
                              "bg-muted text-foreground ring-1 ring-inset ring-foreground/20",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span
                              className="block whitespace-normal break-words text-sm font-semibold leading-4"
                              title={option.label}
                            >
                              {option.label}
                            </span>
                            {option.description && (
                              <span className="block whitespace-normal text-[11px] leading-4 text-muted-foreground">
                                {option.description}
                              </span>
                            )}
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {emptyMessage}
                    </p>
                  )}
                </div>
              </div>,
              document.body,
            )
          : null;

      return (
        <div
          {...props}
          ref={(node) => {
            rootRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn("relative", className)}
          onKeyDown={handleKeyDown}
        >
          {name && <input type="hidden" name={name} value={stringValue} required={required} />}
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            title={title || selectedOption?.label}
            onClick={() => setOpen((current) => !current)}
            className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border-2 border-foreground/45 bg-card px-3 py-2 text-left text-sm font-medium shadow-none transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={cn("min-w-0 flex-1 truncate", !selectedOption && "text-muted-foreground")}
            >
              {selectedOption ? `${valuePrefix}${selectedOption.label}` : placeholder}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          {popup}
        </div>
      );
    }

    return (
      <SelectContext.Provider
        value={{
          value: stringValue,
          onValueChange: selectValue,
          open,
          setOpen,
          triggerRef,
          listboxId,
        }}
      >
        <div {...props} ref={ref} className={cn("relative", className)} onKeyDown={handleKeyDown}>
          {children}
        </div>
      </SelectContext.Provider>
    );
  },
);
Select.displayName = "Select";

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, forwardedRef) => {
  const context = useContext(SelectContext);
  return (
    <button
      ref={(node) => {
        if (context) context.triggerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      type="button"
      role="combobox"
      aria-controls={context?.listboxId}
      aria-expanded={context?.open}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context?.setOpen(!context.open);
      }}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border-2 border-foreground/45 bg-card px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4", context?.open && "rotate-180")} />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue: React.FC<{
  placeholder?: string;
  displayValue?: string;
}> = ({ placeholder, displayValue }) => {
  const context = useContext(SelectContext);
  return <span className="truncate">{displayValue || context?.value || placeholder || ""}</span>;
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
      id={context.listboxId}
      role="listbox"
      className={cn(
        "absolute left-0 top-full z-[80] mt-1 max-h-64 w-full overflow-auto rounded-xl border-2 border-foreground/70 bg-popover p-1 shadow-[0_6px_0_0_hsl(var(--foreground)/0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
> = ({ value, className, children, onClick, ...props }) => {
  const context = useContext(SelectContext);
  const selected = context?.value === value;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context?.onValueChange(value);
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "bg-primary/15 text-primary",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {selected && <Check className="h-4 w-4" />}
    </button>
  );
};
