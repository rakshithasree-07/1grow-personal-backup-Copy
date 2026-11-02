import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption { value: string; label: string; disabled?: boolean }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children" | "onChange"> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, placeholder, options, value, onChange, disabled, className, id, name, ...nativeProps }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const [open, setOpen] = React.useState(false);
    const [focusedIdx, setFocusedIdx] = React.useState(-1);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);
    const displayText = selected?.label ?? placeholder ?? "Select...";
    const hasValue = !!value;

    React.useEffect(() => {
      if (!open) return;
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIdx(idx >= 0 ? idx : 0);
    }, [open, options, value]);

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (!triggerRef.current?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    React.useEffect(() => {
      if (open && listRef.current) {
        const focused = listRef.current.querySelector('[data-focused="true"]');
        focused?.scrollIntoView({ block: "nearest" });
      }
    }, [focusedIdx, open]);

    const callOnChange = (val: string) => {
      if (!onChange) return;
      onChange(val);
    };

    const selectOption = (val: string, disabled?: boolean) => {
      if (disabled) return;
      callOnChange(val);
      setOpen(false);
      triggerRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      const enabledIndices = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
      const currentEnabledPos = enabledIndices.indexOf(focusedIdx);
      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp": {
          e.preventDefault();
          const dir = e.key === "ArrowDown" ? 1 : -1;
          const next = currentEnabledPos >= 0
            ? enabledIndices[(currentEnabledPos + dir + enabledIndices.length) % enabledIndices.length]!
            : enabledIndices[0]!;
          setFocusedIdx(next);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          const opt = options[focusedIdx];
          if (opt) selectOption(opt.value, opt.disabled);
          break;
        }
        case "Escape":
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
            {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </label>
        )}
        <div className="relative">
          <button
            ref={triggerRef}
            id={inputId}
            name={name}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={!!error}
            disabled={disabled}
            onClick={() => !disabled && setOpen((o) => !o)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex h-12 w-full items-center justify-between rounded-xl border-2 bg-surface pl-4 pr-10 text-left text-sm",
              "transition-all duration-200 focus:outline-none focus:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-overlay",
              hasValue ? "text-text-primary" : "text-text-placeholder",
              error ? "border-danger/60 focus:border-danger" : "border-border hover:border-border/80",
              className,
            )}
          >
            <span className="truncate">{displayText}</span>
          </button>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <ChevronDown size={16} className={cn("text-text-secondary transition-transform duration-200", open && "rotate-180")} />
          </div>

          {open && (
            <div
              ref={listRef}
              role="listbox"
              className={cn(
                "absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-border bg-surface py-1",
                "shadow-[var(--shadow-2)] animate-in fade-in-0 zoom-in-95",
              )}
            >
              {options.map((o, i) => {
                const isSelected = o.value === value;
                const isFocused = i === focusedIdx;
                return (
                  <div
                    key={o.value}
                    data-focused={isFocused || undefined}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={o.disabled}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
                      isFocused && "bg-surface-overlay",
                      o.disabled && "cursor-not-allowed opacity-40",
                    )}
                    onMouseEnter={() => !o.disabled && setFocusedIdx(i)}
                    onMouseDown={(e) => { e.preventDefault(); selectOption(o.value, o.disabled); }}
                  >
                    <span className={cn("flex-1 truncate", isSelected && "font-medium")}>
                      {o.label}
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
