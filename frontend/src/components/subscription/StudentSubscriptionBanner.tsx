"use client";

import * as React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { useSubscriptionStore } from "@/store/subscription.store";
import { cn } from "@/lib/cn";
import type { SubscriptionStatus } from "@/services/subscription.service";

/**
 * Non-blocking read-only banner shown to STUDENT users when their organization's
 * subscription is in a degraded state.
 *
 * Students cannot take any action — this just informs them that some features
 * may be limited and they should contact their organization.
 */
export function StudentSubscriptionBanner() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const [dismissed, setDismissed] = React.useState(false);

  if (!subscription || dismissed) return null;

  const status = subscription.status as SubscriptionStatus;

  const config = getBannerConfig(status);
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      role="alert"
      aria-label={`Subscription notice: ${config.title}`}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-sm",
        config.bannerClass,
      )}
    >
      <Icon size={16} className="shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{config.title}:</span>{" "}
        <span className="opacity-90">{config.message}</span>
      </div>
      <button
        aria-label="Dismiss notice"
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-current text-xs px-1"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface BannerConfig {
  icon: React.ElementType;
  title: string;
  message: string;
  bannerClass: string;
}

function getBannerConfig(status: SubscriptionStatus): BannerConfig | null {
  switch (status) {
    case "PAST_DUE":
      return {
        icon: AlertTriangle,
        title: "Payment Overdue",
        message:
          "Your organization has a pending payment. Some features may be temporarily restricted. Please ask your institution to update their billing details.",
        bannerClass: "bg-warning text-warning-900",
      };
    case "CANCELLED":
      return {
        icon: AlertTriangle,
        title: "Subscription Cancelled",
        message:
          "Your organization's subscription has been cancelled. Access to certain features may be limited. Contact your institution for more information.",
        bannerClass: "bg-danger text-white",
      };
    case "EXPIRED":
      return {
        icon: Info,
        title: "Subscription Expired",
        message:
          "Your organization's subscription has expired. Some features may be unavailable. Please contact your institution.",
        bannerClass: "bg-surface-raised text-text-secondary border-b border-border",
      };
    default:
      return null;
  }
}
