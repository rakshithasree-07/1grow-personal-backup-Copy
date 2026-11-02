"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon, X, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export interface DatePickerProps {
  label?: string;
  required?: boolean;
  error?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showTimePicker?: boolean;
}

export function DatePicker({
  label,
  required,
  error,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  showTimePicker = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [timeValue, setTimeValue] = React.useState("12:00");

  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    if (showTimePicker) {
      const [h, m] = timeValue.split(":").map(Number);
      date.setHours(h, m, 0, 0);
    }
    onChange(date.toISOString());
    if (!showTimePicker) {
      setOpen(false);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setTimeValue(t);
    if (value) {
      const d = parseISO(value);
      if (isValid(d)) {
        const [h, m] = t.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        onChange(d.toISOString());
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  const displayValue = value && isValid(parseISO(value))
    ? format(parseISO(value), showTimePicker ? "MMM d, yyyy h:mm a" : "MMM d, yyyy")
    : "";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex items-center w-full h-10 rounded-[var(--radius-md)] border bg-surface px-3 text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              error ? "border-danger" : "border-border",
              disabled && "cursor-not-allowed opacity-50",
              !displayValue && "text-text-placeholder",
            )}
          >
            <CalendarIcon size={16} className="mr-2 shrink-0 text-text-secondary" />
            <span className="flex-1 text-left truncate">
              {displayValue || placeholder}
            </span>
            {value && (
              <span onMouseDown={(e) => e.stopPropagation()}>
                <X
                  size={14}
                  className="cursor-pointer text-text-secondary hover:text-text-primary shrink-0"
                  onClick={handleClear}
                />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-2)]">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleSelect}
              autoFocus
            />
            {showTimePicker && (
              <div className="flex items-center gap-3 border-t border-border p-3 bg-surface-raised">
                <div className="flex items-center gap-2 flex-1">
                  <Clock size={14} className="text-text-secondary shrink-0" />
                  <span className="text-xs font-medium text-text-secondary">Time</span>
                </div>
                <input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-28"
                />
                <Button
                  size="xs"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
