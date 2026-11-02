"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface AnimatedFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedFrame({ children, className }: AnimatedFrameProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes onb-gradient-shift {
          0% { background-position: 0% 50%; }
          25% { background-position: 50% 100%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 0%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes onb-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}} />
      <div
        className={cn("relative flex flex-col min-h-full w-full", className)}
        style={{ padding: "28px" }}
      >
        {/* Animated gradient layer */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #f97316, #fb7185, #ec4899, #a855f7, #6366f1, #3b82f6, #06b6d4, #14b8a6, #fbbf24, #f97316)",
            backgroundSize: "300% 300%",
            animation: "onb-gradient-shift 6s ease infinite",
          }}
        />
        {/* Soft glow */}
        <div
          className="absolute -inset-1 rounded-[30px] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.25), rgba(168,85,247,0.20), rgba(59,130,246,0.25), rgba(6,182,212,0.20))",
            backgroundSize: "300% 300%",
            animation: "onb-gradient-shift 6s ease infinite",
            filter: "blur(20px)",
            opacity: 0.7,
            animationName: "onb-gradient-shift, onb-glow-pulse",
            animationDuration: "6s, 3s",
            animationTimingFunction: "ease, ease-in-out",
            animationIterationCount: "infinite, infinite",
          }}
        />
        {/* Inner panel — theme-aware surface */}
        <div className="relative z-10 flex-1 min-h-0 w-full rounded-[12px] bg-surface overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
          {children}
        </div>
      </div>
    </>
  );
}
