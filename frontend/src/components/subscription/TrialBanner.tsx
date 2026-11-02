"use client";

import * as React from "react";
import { Clock, X, Zap, AlertTriangle, Ban, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useSubscriptionStore,
  trialDaysRemaining,
} from "@/store/subscription.store";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import type { SubscriptionStatus } from "@/services/subscription.service";

interface TrialBannerProps {
  /** Called when user clicks "Upgrade Now" */
  onUpgrade?: () => void;
}

/**
 * Shows a sticky banner at the top of the app for non-ACTIVE subscription states.
 * - TRIAL (active): countdown banner with Upgrade Now → /owner/subscription
 * - EXPIRED / CANCELLED / PAST_DUE: warning banner with Upgrade Now → /owner/subscription
 * Automatically hides once the subscription becomes ACTIVE.
 */
export function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const router = useRouter();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const [dismissed, setDismissed] = React.useState(false);

  const days = trialDaysRemaining(subscription);
  const isTrial = subscription?.status === "TRIAL";
  const isExpired = isTrial && days === 0;
  const billingIssue =
    subscription?.status === "EXPIRED" ||
    subscription?.status === "CANCELLED" ||
    subscription?.status === "PAST_DUE";

  // Hide if ACTIVE, or dismissed for the session
  if (!subscription || subscription.status === "ACTIVE" || dismissed) return null;

  // Trial that has ended — hide (modal takes over)
  if (isExpired) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push("/owner/subscription");
    }
  };

  const status = subscription.status as SubscriptionStatus;
  const config = getBannerConfig(status, days);

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      role="banner"
      aria-label={`Subscription notice: ${config.title}`}
      className={cn(
        "relative w-full flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium transition-colors",
        config.bannerClass,
      )}
    >
      {/* Left — icon + text */}
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={15} className="shrink-0" aria-hidden />
        <span className="truncate">{config.message}</span>
      </div>

      {/* Right — CTA + dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Zap size={13} />}
          className="border-current text-inherit hover:bg-white/20"
          onClick={handleUpgrade}
        >
          Upgrade Now
        </Button>
        <button
          aria-label="Dismiss banner"
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X size={15} />
        </button>
      </div>
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

function getBannerConfig(status: SubscriptionStatus, days: number): BannerConfig | null {
  switch (status) {
    case "TRIAL": {
      const isUrgent = days <= 3;
      const isWarning = days <= 7 && !isUrgent;
      const label =
        days === 1
          ? "1 day left in your free trial"
          : `${days} days left in your free trial`;
      return {
        icon: Clock,
        title: "Trial",
        message: `${label} — unlock the full platform by choosing a plan.`,
        bannerClass: isUrgent
          ? "bg-danger text-white"
          : isWarning
            ? "bg-warning text-warning-900"
            : "bg-primary text-primary-foreground",
      };
    }
    case "PAST_DUE":
      return {
        icon: AlertTriangle,
        title: "Payment Overdue",
        message: "Your payment is overdue. Upgrade now to restore full access.",
        bannerClass: "bg-warning text-warning-900",
      };
    case "CANCELLED":
      return {
        icon: Ban,
        title: "Subscription Cancelled",
        message: "Your subscription has been cancelled. Upgrade now to reactivate.",
        bannerClass: "bg-danger text-white",
      };
    case "EXPIRED":
      return {
        icon: RefreshCw,
        title: "Subscription Expired",
        message: "Your subscription has expired. Upgrade now to continue.",
        bannerClass: "bg-surface-raised text-text-primary border-b border-border",
      };
    default:
      return null;
  }
}
