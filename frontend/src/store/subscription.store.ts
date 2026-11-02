"use client";

import { create } from "zustand";
import {
  subscriptionService,
  type CurrentSubscription,
  type Plan,
} from "@/services/subscription.service";
import type { PlanModuleName } from "@/lib/modules";

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Returns days remaining in the trial (positive) or 0 if expired / not on trial. */
export function trialDaysRemaining(sub: CurrentSubscription | null): number {
  if (!sub || sub.status !== "TRIAL" || !sub.trialEndsAt) return 0;
  const ms = new Date(sub.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** True only when the subscription is completely gone / trial has ended with no payment. */
export function isSubscriptionBlocking(sub: CurrentSubscription | null): boolean {
  if (!sub) return false;
  return (
    sub.status === "EXPIRED" ||
    sub.status === "CANCELLED" ||
    (sub.status === "TRIAL" && trialDaysRemaining(sub) === 0)
  );
}

/** Returns warning info when payment is overdue or due soon. */
export function getSubscriptionWarning(sub: CurrentSubscription | null): { type: "overdue" | "due-soon" | "trial-expiring" | null; message: string } {
  if (!sub) return { type: null, message: "" };

  if (sub.status === "PAST_DUE") {
    return { type: "overdue", message: "Subscription payment is overdue — pay now to avoid service interruption." };
  }

  if (sub.status === "TRIAL") {
    const daysLeft = trialDaysRemaining(sub);
    if (daysLeft === 0) {
      return { type: "trial-expiring", message: "Your trial has ended — subscribe to continue using all features." };
    }
    if (daysLeft <= 3) {
      return { type: "trial-expiring", message: `Your trial ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""} — set up payment to avoid interruption.` };
    }
  }

  return { type: null, message: "" };
}

/**
 * Returns the set of active module names from the subscription's plan.
 * Falls back to all modules when no subscription exists (trial/new tenant).
 */
export function getActiveModules(sub: CurrentSubscription | null): Set<PlanModuleName> {
  const ALL: PlanModuleName[] = ["TRAINING", "RENTAL", "EVENTS", "FINANCE", "OPERATIONS", "LEADS"];

  if (!sub?.plan?.modules) return new Set(ALL);

  const active = sub.plan.modules
    .filter((m) => m.isActive)
    .map((m) => m.module.toUpperCase() as PlanModuleName);

  // If no modules are explicitly active, treat all as active (backwards compat)
  if (active.length === 0) return new Set(ALL);

  return new Set(active);
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SubscriptionState {
  subscription: CurrentSubscription | null;
  plans: Plan[];
  isLoading: boolean;
  isActivating: boolean;
  hasFetched: boolean;
  error: string | null;

  /** Fetch the current subscription from the API. */
  fetchSubscription: () => Promise<void>;
  /** Force refresh by resetting hasFetched and fetching fresh data. */
  refreshSubscription: () => Promise<void>;
  /** Fetch available plans. */
  fetchPlans: () => Promise<void>;
  /** Activate (or purchase) a plan. */
  activatePlan: (planId: string) => Promise<void>;
  /** Reset store on logout. */
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  plans: [],
  isLoading: false,
  isActivating: false,
  hasFetched: false,
  error: null,

  fetchSubscription: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const subscription = await subscriptionService.getCurrent();
      set({ subscription, hasFetched: true, isLoading: false });
    } catch {
      set({ isLoading: false, hasFetched: true, error: "Failed to load subscription" });
    }
  },

  refreshSubscription: async () => {
    set({ hasFetched: false });
    await get().fetchSubscription();
  },

  fetchPlans: async () => {
    try {
      const plans = await subscriptionService.getPlans();
      set({ plans });
    } catch {
      // non-critical — already showing cached data
    }
  },

  activatePlan: async (planId: string) => {
    set({ isActivating: true, error: null });
    try {
      const subscription = await subscriptionService.activate(planId);
      set({ subscription, isActivating: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Activation failed";
      set({ isActivating: false, error: msg });
      throw err;
    }
  },

  reset: () =>
    set({
      subscription: null,
      plans: [],
      isLoading: false,
      isActivating: false,
      hasFetched: false,
      error: null,
    }),
}));
