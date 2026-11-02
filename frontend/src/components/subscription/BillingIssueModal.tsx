"use client";

import * as React from "react";
import { AlertTriangle, CreditCard, Ban, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSubscriptionStore } from "@/store/subscription.store";
import { cn } from "@/lib/cn";
import type { SubscriptionStatus } from "@/services/subscription.service";
import { toast } from "sonner";

interface BillingIssueModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Only shown for OWNER — lets them pick a new plan to reactivate */
  isOwner?: boolean;
}

const statusConfig: Record<
  Extract<SubscriptionStatus, "PAST_DUE" | "CANCELLED" | "EXPIRED">,
  {
    icon: React.ElementType;
    iconClass: string;
    bgClass: string;
    title: string;
    description: string;
    ownerCta: string;
    staffMessage: string;
  }
> = {
  PAST_DUE: {
    icon: CreditCard,
    iconClass: "text-warning",
    bgClass: "bg-warning-light dark:bg-warning/15",
    title: "Payment Overdue",
    description:
      "Your last payment failed or is pending. Please update your billing details to restore full access.",
    ownerCta: "Update Billing",
    staffMessage:
      "Your organization's payment is overdue. Please ask the account owner to resolve the billing issue.",
  },
  CANCELLED: {
    icon: Ban,
    iconClass: "text-danger",
    bgClass: "bg-danger-light dark:bg-danger/15",
    title: "Subscription Cancelled",
    description:
      "Your subscription has been cancelled. Choose a plan below to reactivate your account and regain access.",
    ownerCta: "Reactivate Plan",
    staffMessage:
      "Your organization's subscription has been cancelled. Please contact the account owner.",
  },
  EXPIRED: {
    icon: RefreshCw,
    iconClass: "text-text-secondary",
    bgClass: "bg-surface-raised",
    title: "Subscription Expired",
    description:
      "Your subscription period has ended. Renew now to continue using the platform.",
    ownerCta: "Renew Now",
    staffMessage:
      "Your organization's subscription has expired. Please contact the account owner to renew.",
  },
};

/**
 * Blocking modal for company roles (OWNER / BRANCH_MANAGER / STAFF) when the
 * subscription is in a non-functional state (PAST_DUE, CANCELLED, EXPIRED).
 *
 * - OWNER sees a plan picker with a CTA.
 * - BRANCH_MANAGER / STAFF see a read-only message asking them to contact the owner.
 *
 * Has no close button — the only exit is fixing billing.
 */
export function BillingIssueModal({ open, isOwner = false }: BillingIssueModalProps) {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const plans = useSubscriptionStore((s) => s.plans);
  const isActivating = useSubscriptionStore((s) => s.isActivating);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const activatePlan = useSubscriptionStore((s) => s.activatePlan);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);

  const status = subscription?.status as Extract<
    SubscriptionStatus,
    "PAST_DUE" | "CANCELLED" | "EXPIRED"
  > | undefined;

  React.useEffect(() => {
    if (open && isOwner && plans.length === 0) {
      fetchPlans();
    }
  }, [open, isOwner, plans.length, fetchPlans]);

  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const active = plans.filter((p) => p.isActive);
      if (active.length > 0) setSelectedPlanId(active[0].id);
    }
  }, [plans, selectedPlanId]);

  if (!open || !status || !(status in statusConfig)) return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const activePlans = plans.filter((p) => p.isActive);

  const handleActivate = async () => {
    if (!selectedPlanId) return;
    try {
      await activatePlan(selectedPlanId);
      toast.success("Subscription restored! Welcome back 🎉");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not process request";
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal
      aria-label={`Billing issue: ${config.title}`}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-4)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", config.bgClass)}>
            <Icon size={26} className={config.iconClass} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">{config.title}</h1>
          <p className="text-sm text-text-secondary max-w-sm">
            {isOwner ? config.description : config.staffMessage}
          </p>
        </div>

        {/* Owner — plan selector */}
        {isOwner && activePlans.length > 0 && (
          <div className="px-6 pb-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Choose a plan to continue
            </p>
            <div className="space-y-2">
              {activePlans.map((plan) => {
                const price = Number(plan.price).toLocaleString("en-IN", {
                  style: "currency",
                  currency: plan.currency ?? "INR",
                  maximumFractionDigits: 0,
                });
                const interval = plan.interval === "YEARLY" ? "/yr" : "/mo";
                const isSelected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "w-full flex items-center justify-between rounded-[var(--radius-md)] border-2 px-4 py-3 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="font-medium text-sm text-text-primary">{plan.name}</span>
                    <span className="text-sm font-bold text-text-primary">
                      {price}
                      <span className="text-xs font-normal text-text-secondary ml-0.5">{interval}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border px-6 py-5 flex flex-col items-center gap-2">
          {isOwner ? (
            <>
              <Button
                size="lg"
                variant="primary"
                className="w-full"
                disabled={!selectedPlanId}
                loading={isActivating}
                rightIcon={<ArrowRight size={17} />}
                onClick={handleActivate}
              >
                {config.ownerCta}
              </Button>
              <p className="text-xs text-text-secondary text-center">
                Need help?{" "}
                <a
                  href="mailto:support@1Grow.com"
                  className="underline hover:text-text-primary"
                >
                  Contact support
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-text-secondary text-center">
              Please contact your organization owner to resolve this issue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
