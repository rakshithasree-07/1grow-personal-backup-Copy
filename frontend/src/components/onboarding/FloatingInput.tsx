"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  displayValue?: string;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, type, displayValue, value, defaultValue, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(() => !!defaultValue || !!value || !!displayValue);
    const [showPassword, setShowPassword] = React.useState(false);

    React.useEffect(() => {
      if (value !== undefined) setHasValue(!!value);
    }, [value]);

    React.useEffect(() => {
      if (displayValue !== undefined) setHasValue(!!displayValue);
    }, [displayValue]);

    const isPassword = type === "password";
    const effectiveType = isPassword && showPassword ? "text" : type;
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium transition-colors duration-200",
            hasError ? "text-danger" : focused ? "text-primary" : "text-text-primary",
          )}
        >
          {label}
          {props.required && <span className="ml-0.5 text-danger">*</span>}
        </label>
        <div className="relative">
          {leftIcon && (
            <span className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
              hasError ? "text-danger" : focused ? "text-primary" : "text-text-secondary",
            )}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              setHasValue(!!e.target.value);
            }}
            onChange={(e) => {
              setHasValue(!!e.target.value);
              props.onChange?.(e);
            }}
            value={displayValue ?? value}
            className={cn(
              "w-full h-12 rounded-xl border-2 bg-transparent px-4 py-3 text-sm text-text-primary",
              "placeholder-text-placeholder",
              "transition-all duration-200 ease-out",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40",
              hasError
                ? "border-danger/60 focus:border-danger"
                : focused
                  ? "border-primary/60 focus:border-primary"
                  : "border-border hover:border-border/80",
              leftIcon && "pl-12",
              (rightIcon || isPassword) && "pr-12",
              className,
            )}
            placeholder={`Enter ${label.toLowerCase()}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
          {!isPassword && rightIcon && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-danger flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-text-secondary">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
FloatingInput.displayName = "FloatingInput";
