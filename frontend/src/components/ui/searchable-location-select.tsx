import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";

interface SearchableLocationOption {
  value: string;
  label: string;
}

interface SearchableLocationSelectProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value: string;
  options: SearchableLocationOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  inputRef?: (element: HTMLButtonElement | null) => void;
  dataSelector: "state" | "city";
}

export const SearchableLocationSelect: React.FC<SearchableLocationSelectProps> = ({
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  options,
  onValueChange,
  disabled = false,
  error,
  inputRef,
  dataSelector,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase("en-IN");
  const filteredOptions = useMemo(
    () =>
      normalizedQuery
        ? options.filter((option) =>
            option.label.toLocaleLowerCase("en-IN").includes(normalizedQuery),
          )
        : options,
    [normalizedQuery, options],
  );

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const selectOption = (option: SearchableLocationOption) => {
    onValueChange(option.value);
    setQuery("");
    setOpen(false);
  };

  return (
    <label className="min-w-0 space-y-1.5 text-xs font-semibold">
      {label}
      <div ref={rootRef} className="relative mt-1.5">
        <button
          ref={inputRef}
          type="button"
          data-location-selector={dataSelector}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={!!error}
          disabled={disabled}
          title={selected?.label}
          onClick={() => {
            if (!disabled) setOpen((current) => !current);
          }}
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border-2 border-foreground/45 bg-card px-3 text-sm font-medium transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground")}>
            {selected?.label || placeholder}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-[100] mt-2 w-full max-w-full isolate overflow-hidden rounded-2xl border-2 border-foreground/45 bg-card shadow-[0_16px_32px_rgba(0,0,0,0.4)]">
            <div className="border-b border-border p-2">
              <div className="flex items-center gap-2 rounded-xl border-2 border-foreground/35 bg-background px-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div role="listbox" className="max-h-72 overflow-y-auto overscroll-contain p-2">
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      option.value === value && "bg-primary/20 font-bold",
                    )}
                  >
                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">{option.label}</span>
                    {option.value === value && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
};
