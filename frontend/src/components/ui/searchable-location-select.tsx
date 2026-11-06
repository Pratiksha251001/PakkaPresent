import React, { useId } from "react";
import { cn } from "../../lib/utils";
import { Select } from "./select";

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
  const errorId = `location-${dataSelector}-${useId().replace(/:/g, "")}-error`;
  return (
    <label className="min-w-0 space-y-1.5 text-xs font-semibold">
      {label}
      <Select
        value={value}
        options={options}
        onValueChange={onValueChange}
        disabled={disabled}
        placeholder={placeholder}
        searchable
        searchLocale="en-IN"
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        triggerRef={inputRef}
        triggerProps={{
          "data-location-selector": dataSelector,
          "aria-invalid": !!error,
          "aria-describedby": error ? errorId : undefined,
          className: cn("mt-1.5 min-w-0", error && "border-destructive"),
        }}
      />
      {error && (
        <span id={errorId} className="block text-xs font-semibold text-destructive">
          {error}
        </span>
      )}
    </label>
  );
};
