"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import gsap from "gsap";

export interface Step {
  id: string;
  label: string;
  description: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}

export function ProgressStepper({ steps, currentStep, completedSteps }: ProgressStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = currentIndex >= 0 ? ((currentIndex) / (steps.length - 1)) * 100 : 0;
  const currentStepData = steps[currentIndex];

  const containerRef = React.useRef<HTMLDivElement>(null);
  const circleRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const checkRefs = React.useRef<(SVGSVGElement | null)[]>([]);
  const numberRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const mobileBarRef = React.useRef<HTMLDivElement>(null);
  const mobileFillRef = React.useRef<HTMLDivElement>(null);
  const descContainerRef = React.useRef<HTMLDivElement>(null);
  const descTextRef = React.useRef<HTMLParagraphElement>(null);
  const descIconRef = React.useRef<HTMLDivElement>(null);
  const prevStepRef = React.useRef(currentStep);

  // Entrance animation
  React.useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current!,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
      );

      circleRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, delay: 0.1 + i * 0.08, ease: "back.out(2)" },
        );
      });

      labelRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: 4 },
          { opacity: 1, y: 0, duration: 0.3, delay: 0.2 + i * 0.08, ease: "power2.out" },
        );
      });
    }, containerRef);
    return () => ctx.revert();
  }, [steps.length]);

  // Animate description panel on step change
  React.useEffect(() => {
    if (!descContainerRef.current || !descTextRef.current || !descIconRef.current) return;
    const changed = prevStepRef.current !== currentStep;
    prevStepRef.current = currentStep;

    const ctx = gsap.context(() => {
      if (changed) {
        // Slide out old text, slide in new
        gsap.fromTo(
          descTextRef.current!,
          { opacity: 0, x: 12 },
          { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", delay: 0.1 },
        );
        gsap.fromTo(
          descIconRef.current!,
          { scale: 0.6, opacity: 0, rotation: -90 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: "back.out(2)", delay: 0.05 },
        );
      } else {
        // Initial mount
        gsap.fromTo(
          descContainerRef.current!,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.3 },
        );
      }
    }, descContainerRef);
    return () => ctx.revert();
  }, [currentStep]);

  // Animate step transitions
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      circleRefs.current.forEach((el, i) => {
        if (!el) return;
        const isCompleted = completedSteps.includes(steps[i]!.id);
        const isCurrent = steps[i]!.id === currentStep;

        if (isCurrent) {
          gsap.to(el, {
            scale: 1.05,
            duration: 0.4,
            ease: "elastic.out(1, 0.5)",
          });
        } else {
          gsap.to(el, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out",
          });
        }

        if (isCompleted && checkRefs.current[i]) {
          gsap.fromTo(
            checkRefs.current[i]!,
            { scale: 0, rotation: -45 },
            { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(3)" },
          );
        }

        if (!isCompleted && numberRefs.current[i]) {
          gsap.fromTo(
            numberRefs.current[i]!,
            { opacity: 0, scale: 0.5 },
            { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" },
          );
        }
      });

      fillRefs.current.forEach((el, i) => {
        if (!el) return;
        const isCompleted = completedSteps.includes(steps[i]!.id);
        
        gsap.to(el, {
          width: isCompleted ? "100%" : "0%",
          duration: 0.7,
          ease: isCompleted ? "power3.out" : "power2.inOut",
        });
      });

      labelRefs.current.forEach((el, i) => {
        if (!el) return;
        const isCurrent = steps[i]!.id === currentStep;

        if (isCurrent) {
          gsap.to(el, { scale: 1.05, duration: 0.3, ease: "power2.out" });
        } else {
          gsap.to(el, { scale: 1, duration: 0.2 });
        }
      });

      if (mobileFillRef.current) {
        gsap.to(mobileFillRef.current, {
          width: `${progress}%`,
          duration: 0.6,
          ease: "power3.out",
        });
      }
      if (mobileBarRef.current) {
        gsap.fromTo(
          mobileBarRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power2.out" },
        );
      }
    });
    return () => ctx.revert();
  }, [currentStep, completedSteps, progress, steps]);

  return (
    <div ref={containerRef} className="w-full">
      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:block mb-8">
        <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-black/5 dark:border-white/10 px-8 pt-10 pb-12 w-full max-w-4xl mx-auto">
          <div className="flex items-start justify-between relative">
            {steps.map((step, i) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = step.id === currentStep;

              return (
                <React.Fragment key={step.id}>
                  <div className="relative z-10 flex px-6 flex-col items-center">
                    {/* Chevron */}
                    <div 
                      className={cn(
                        "absolute -top-7 text-gray-400 dark:text-gray-500 transition-all duration-500", 
                        isCurrent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                      )}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {/* Circle */}
                    <div 
                      ref={(el) => { circleRefs.current[i] = el; }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-500 z-10",
                        (isCompleted || isCurrent) 
                          ? "bg-[#62C879] text-white border-2 border-[#62C879]" 
                          : "bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-zinc-700 text-gray-300 dark:text-gray-600"
                      )}
                    >
                      {isCompleted ? (
                         <svg 
                           ref={(el) => { checkRefs.current[i] = el; }}
                           width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                         >
                           <polyline points="20 6 9 17 4 12"></polyline>
                         </svg>
                      ) : (
                        <span ref={(el) => { numberRefs.current[i] = el; }}>{i + 1}</span>
                      )}
                    </div>

                    {/* Label */}
                    <div className="absolute top-11 text-center w-32 -ml-16 left-1/2">
                      <span 
                        ref={(el) => { labelRefs.current[i] = el; }}
                        className={cn(
                          "text-xs font-semibold transition-colors duration-500",
                          (isCompleted || isCurrent) ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>

                  {/* Line between nodes */}
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-[2px] bg-gray-200 dark:bg-zinc-800 mt-[15px] relative mx-1 sm:mx-2">
                      <div 
                         ref={(el) => { fillRefs.current[i] = el; }}
                         className="absolute top-0 left-0 h-full bg-[#62C879]"
                         style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Description panel */}
        {/* {currentStepData && (
          <div
            ref={descContainerRef}
            className="mt-6 flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface-overlay/50 px-5 py-4 max-w-4xl mx-auto shadow-sm"
          >
            <div
              ref={descIconRef}
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                completedSteps.includes(currentStepData.id)
                  ? "bg-[#62C879]/10 text-[#62C879]"
                  : "bg-[#62C879]/10 text-[#62C879]",
              )}
            >
              {completedSteps.includes(currentStepData.id) ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="text-xs font-bold">{currentIndex + 1}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">
                {currentStepData.label}
              </p>
              <p ref={descTextRef} className="text-sm leading-relaxed text-text-secondary">
                {currentStepData.description}
              </p>
            </div>
          </div>
        )} */}
      </div>

      {/* Mobile: compact with description */}
      <div ref={mobileBarRef} className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#62C879]/10 text-[11px] font-bold text-[#62C879]">
              {Math.max(1, currentIndex + 1)}
            </span>
            <span className="text-sm font-medium text-text-primary">
              of {steps.length}
            </span>
          </div>
          <span className="text-sm font-semibold text-text-primary">
            {currentStepData?.label}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
          <div
            ref={mobileFillRef}
            className="h-full rounded-full relative bg-[#62C879]"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
