"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-2",
        month_caption: "flex items-center justify-between pt-1 relative",
        caption_label: "text-sm font-medium text-text-primary",
        nav: "flex items-center gap-1",
        button_previous:
          "inline-flex items-center justify-center h-7 w-7 rounded-[var(--radius-sm)] border border-border bg-transparent text-text-secondary hover:bg-surface-overlay transition-colors",
        button_next:
          "inline-flex items-center justify-center h-7 w-7 rounded-[var(--radius-sm)] border border-border bg-transparent text-text-secondary hover:bg-surface-overlay transition-colors",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 h-9 text-xs font-medium text-text-secondary flex items-center justify-center",
        week: "flex w-full mt-0.5",
        day: cn(
          "relative p-0 text-center text-sm h-9 w-9 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors",
          "hover:bg-surface-overlay",
          props.mode === "range"
            ? "group-[.range]:bg-primary/5"
            : "",
        ),
        day_button: "h-9 w-9 rounded-[var(--radius-sm)] text-sm text-text-primary font-normal aria-selected:opacity-100",
        selected: "bg-primary text-white hover:bg-primary/90 focus:bg-primary focus:text-white rounded-[var(--radius-sm)]",
        today: "bg-surface-overlay text-text-primary font-semibold",
        outside: "text-text-disabled aria-selected:text-text-disabled",
        disabled: "text-text-disabled opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft size={16} {...rest} />
          ) : (
            <ChevronRight size={16} {...rest} />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
