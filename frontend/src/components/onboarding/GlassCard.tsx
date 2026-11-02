"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function GlassCard({ children, className, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "rounded-3xl border border-border/50 bg-surface/80 backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.06)]",
        "p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
