import * as React from "react";
import { cn } from "@/lib/cn";

const variants = {
  default: "bg-surface-overlay text-text-secondary",
  success: "bg-success-light text-success-700 dark:bg-success/15 dark:text-success",
  warning: "bg-warning-light text-warning-700 dark:bg-warning/15 dark:text-warning",
  danger:  "bg-danger-light  text-danger-700  dark:bg-danger/15  dark:text-danger",
  info:    "bg-info-light    text-info-700    dark:bg-info/15    dark:text-info",
  outline: "border border-border text-text-secondary bg-transparent",
  brand:    "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
  secondary: "bg-secondary/10 text-secondary",
} as const;

const sizes = {
  sm: "px-1.5 py-px   text-xs",
  md: "px-2   py-0.5  text-xs",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Badge({ variant = "default", size = "md", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-[var(--radius-xs)]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
