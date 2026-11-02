"use client";

import * as React from "react";
import { Zap, Check, Star, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSubscriptionStore } from "@/store/subscription.store";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import type { Plan } from "@/services/subscription.service";

interface TrialExpiredModalProps {
  /** Whether the modal is visible */
  open: boolean;
}

/**
 * Full-screen blocking modal shown when the trial has expired and no plan is active.
 * The user must choose and activate a plan to continue using the app.
 * Has no close button — the only exit is purchasing a plan.
 */
export function TrialExpiredModal({ open }: TrialExpiredModalProps) {
  const plans = useSubscriptionStore((s) => s.plans);
  const isActivating = useSubscriptionStore((s) => s.isActivating);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const activatePlan = useSubscriptionStore((s) => s.activatePlan);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && plans.length === 0) {
      fetchPlans();
    }
  }, [open, plans.length, fetchPlans]);

  // Pre-select the first active plan
  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const activePlans = plans.filter((p) => p.isActive);
      if (activePlans.length > 0) setSelectedPlanId(activePlans[0].id);
    }
  }, [plans, selectedPlanId]);

  if (!open) return null;

  const activePlans = plans.filter((p) => p.isActive);

  const handleActivate = async () => {
    if (!selectedPlanId) return;
    try {
      await activatePlan(selectedPlanId);
      toast.success("Plan activated! Welcome aboard 🎉");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not activate plan";
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal
      aria-label="Trial expired — choose a plan"
    >
      <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-4)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center border-b border-border">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-light dark:bg-warning/15">
            <Zap size={26} className="text-warning" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Your Free Trial Has Ended</h1>
          <p className="text-sm text-text-secondary max-w-md">
            Thank you for trying out the platform! Choose a plan below to unlock full access
            and keep your data intact.
          </p>
        </div>

        {/* Plans grid */}
        <div className="flex-1 px-6 py-6">
          {activePlans.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-text-secondary" />
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                activePlans.length === 1
                  ? "grid-cols-1 max-w-xs mx-auto"
                  : activePlans.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {activePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlanId === plan.id}
                  onSelect={() => setSelectedPlanId(plan.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-border px-6 py-5 flex flex-col items-center gap-2">
          <Button
            size="lg"
            variant="primary"
            className="w-full max-w-xs"
            disabled={!selectedPlanId || activePlans.length === 0}
            loading={isActivating}
            rightIcon={<ArrowRight size={17} />}
            onClick={handleActivate}
          >
            {isActivating ? "Activating…" : "Get Started"}
          </Button>
          <p className="text-xs text-text-secondary">
            You can upgrade, downgrade, or cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Plan Card ──────────────────────────────────────────────────────────────*/

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  const price = Number(plan.price).toLocaleString("en-IN", {
    style: "currency",
    currency: plan.currency ?? "INR",
    maximumFractionDigits: 0,
  });
  const interval = plan.interval === "YEARLY" ? "/ year" : "/ month";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col rounded-[var(--radius-lg)] border-2 p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-border bg-surface hover:border-primary/40 hover:bg-surface-raised",
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check size={11} className="text-white" strokeWidth={3} />
        </span>
      )}

      {/* Popular badge */}
      {plan.sortOrder === 1 && (
        <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-warning-light px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning/15 dark:text-warning">
          <Star size={10} className="fill-warning-500 text-warning-500" />
          Most Popular
        </span>
      )}

      <p className="text-base font-bold text-text-primary">{plan.name}</p>
      {plan.description && (
        <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{plan.description}</p>
      )}

      <div className="mt-3 mb-4">
        <span className="text-2xl font-bold text-text-primary">{price}</span>
        <span className="ml-1 text-xs text-text-secondary">{interval}</span>
      </div>

      {/* Feature list */}
      {plan.features.filter((f) => f.isEnabled).length > 0 && (
        <ul className="space-y-1">
          {plan.features
            .filter((f) => f.isEnabled)
            .slice(0, 5)
            .map((f) => (
              <li key={f.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Check size={11} className="shrink-0 text-success" strokeWidth={3} />
                {f.value ? `${f.feature}: ${f.value}` : f.feature}
              </li>
            ))}
        </ul>
      )}

      {/* Limits */}
      <ul className="mt-2 space-y-0.5">
        {plan.maxUsers && (
          <li className="text-xs text-text-secondary">Up to {plan.maxUsers} users</li>
        )}
        {plan.maxBranches && (
          <li className="text-xs text-text-secondary">Up to {plan.maxBranches} branches</li>
        )}
        {plan.maxStudents && (
          <li className="text-xs text-text-secondary">Up to {plan.maxStudents} students</li>
        )}
      </ul>
    </button>
  );
}
