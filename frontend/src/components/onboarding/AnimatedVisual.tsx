"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface AnimatedVisualProps {
  title: string;
  features: string[];
  gradient: string;
  role: string;
}

function FloatingShape({ delay, className }: { delay: number; className: string }) {
  return (
    <motion.div
      className={cn("absolute rounded-full opacity-20", className)}
      animate={{
        y: [0, -20, 0],
        x: [0, 10, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 8 + delay * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export function AnimatedVisual({ title, features, gradient, role }: AnimatedVisualProps) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center p-8 lg:p-12 overflow-hidden", `bg-gradient-to-br ${gradient}`)}>
      {/* Floating decorative shapes */}
      <FloatingShape delay={0} className="h-32 w-32 bg-primary/30 top-[10%] left-[15%]" />
      <FloatingShape delay={1} className="h-20 w-20 bg-primary/20 top-[60%] right-[10%]" />
      <FloatingShape delay={2} className="h-16 w-16 bg-primary/15 bottom-[15%] left-[25%]" />
      <FloatingShape delay={0.5} className="h-24 w-24 bg-primary/10 top-[30%] right-[25%]" />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Animated role icon */}
        <motion.div
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(255,255,255,0.1)",
              "0 0 0 20px rgba(255,255,255,0)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <RoleIcon role={role} />
        </motion.div>

        <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-3">
          {title}
        </h2>

        <div className="space-y-3 mt-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature}
              className="flex items-center gap-3 text-sm text-text-secondary"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>{feature}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}

function RoleIcon({ role }: { role: string }) {
  const iconClass = "h-10 w-10 text-primary";

  switch (role) {
    case "OWNER":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "STUDENT":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "STAFF":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "BRANCH_MANAGER":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
}
