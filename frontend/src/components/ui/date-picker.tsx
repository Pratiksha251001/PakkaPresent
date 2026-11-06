import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { isDateWithinBounds, parseLocalDate, toLocalDateString } from "../../lib/local-date";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTodayHelper?: boolean;
  id?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  className,
  disabled = false,
  showTodayHelper = true,
  id,
}) => {
  const todayStr = toLocalDateString(new Date());
  const selectedDate = parseLocalDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

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

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();

      if (!triggerRect) return;

      const viewportPadding = 12;
      const gap = 8;
      const popupWidth = Math.min(304, window.innerWidth - viewportPadding * 2);
      const estimatedPopupHeight = 520;
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
      const spaceAbove = triggerRect.top - viewportPadding;
      const openAbove = spaceBelow < estimatedPopupHeight && spaceAbove > spaceBelow;

      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        window.innerWidth - popupWidth - viewportPadding,
      );

      setPopupPosition({
        left,
        ...(openAbove
          ? { bottom: window.innerHeight - triggerRect.top + gap }
          : { top: triggerRect.bottom + gap }),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const monthDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      return day >= 1 && day <= monthDays ? new Date(year, month, day) : null;
    });
  }, [viewDate]);

  const formattedDisplay = selectedDate?.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const choose = (date: Date) => {
    const next = toLocalDateString(date);
    if (!isDateWithinBounds(next, min, max)) return;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative flex flex-col gap-1.5", open && "z-[300]", className)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-card pl-3 pr-20 text-left text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className={cn("truncate", !formattedDisplay && "text-muted-foreground")}>
            {formattedDisplay || placeholder}
          </span>
        </button>
        <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {showTodayHelper && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isDateWithinBounds(todayStr, min, max)) onChange(todayStr);
              }}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                value === todayStr
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              Today
            </button>
          )}
        </div>
      </div>
      {open && popupPosition
        ? createPortal(
            <div
              ref={popupRef}
              role="dialog"
              aria-label="Choose date"
              style={{
                position: "fixed",
                left: popupPosition.left,
                top: popupPosition.top,
                bottom: popupPosition.bottom,
                width: "19rem",
                maxWidth: "calc(100vw - 1.5rem)",
              }}
              className="z-[1000] rounded-2xl border-2 border-foreground/70 bg-popover p-3 text-popover-foreground shadow-[0_4px_0_0_hsl(var(--border))]"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                  }
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm font-bold">
                  {viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                  }
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[10px] font-bold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) return <span key={`blank-${index}`} />;
                  const dateValue = toLocalDateString(date);
                  const selected = dateValue === value;
                  const today = dateValue === todayStr;
                  const unavailable = !isDateWithinBounds(dateValue, min, max);
                  return (
                    <button
                      key={dateValue}
                      type="button"
                      disabled={unavailable}
                      onClick={() => choose(date)}
                      aria-label={date.toLocaleDateString("en-GB", { dateStyle: "full" })}
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30",
                        selected && "bg-primary text-primary-foreground hover:bg-primary",
                        today && !selected && "border border-primary text-primary",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  onClick={() => onChange("")}
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={!isDateWithinBounds(todayStr, min, max)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
                  onClick={() => choose(new Date())}
                >
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
      {formattedDisplay && (
        <p className="pl-1 text-[11px] font-medium text-muted-foreground">
          {formattedDisplay}{" "}
          {value === todayStr && <span className="font-semibold text-primary">(Today)</span>}
        </p>
      )}
    </div>
  );
};
