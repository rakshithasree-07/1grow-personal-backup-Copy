"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export interface RoleCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function RoleCard({
  icon,
  label,
  description,
  color,
  bg,
  border,
  ring,
  selected,
  onSelect,
  disabled,
}: RoleCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative w-full text-left rounded-3xl border-2 p-5 transition-all duration-300 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        selected
          ? cn("border-primary bg-primary/5 shadow-lg shadow-primary/10", ring && `ring-2 ${ring}`)
          : cn("border-border/60 bg-surface hover:border-border hover:shadow-md", border),
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300",
            selected ? cn(bg, color) : "bg-surface-overlay text-text-secondary",
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
            {selected && (
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check size={12} strokeWidth={3} />
                </div>
              </motion.div>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>

      {selected && (
        <motion.div
          className="absolute inset-0 rounded-3xl border-2 border-primary/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
}
