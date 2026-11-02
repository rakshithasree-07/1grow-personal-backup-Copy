"use client";

import { motion } from "framer-motion";

export function SuccessAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Animated checkmark circle */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Pulse rings */}
        <motion.div
          className="absolute inset-0 rounded-full bg-success/20"
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-success/10"
          animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
        />

        {/* Main circle */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success shadow-lg shadow-success/30">
          <motion.svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <motion.polyline
              points="20 6 9 17 4 12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            />
          </motion.svg>
        </div>
      </motion.div>

      <motion.h3
        className="text-xl font-bold text-text-primary"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        All set!
      </motion.h3>
      <motion.p
        className="mt-2 text-sm text-text-secondary text-center max-w-xs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        Your onboarding is complete. Welcome to your dashboard.
      </motion.p>

      {/* Confetti-like particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][i % 6],
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((i * 30 * Math.PI) / 180) * (80 + Math.random() * 40),
            y: Math.sin((i * 30 * Math.PI) / 180) * (80 + Math.random() * 40),
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 1, delay: 0.2 + i * 0.05, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
