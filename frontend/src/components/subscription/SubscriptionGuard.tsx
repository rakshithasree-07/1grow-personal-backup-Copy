"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  useSubscriptionStore,
  trialDaysRemaining,
  isSubscriptionBlocking,
} from "@/store/subscription.store";
import { TrialBanner } from "./TrialBanner";
import { TrialExpiredModal } from "./TrialExpiredModal";
import { BillingIssueModal } from "./BillingIssueModal";
import { StudentSubscriptionBanner } from "./StudentSubscriptionBanner";

/** Roles that belong to the organization (tenant) side — they see billing modals. */
const COMPANY_ROLES = new Set(["OWNER", "BRANCH_MANAGER", "STAFF"]);

/** Roles that are completely exempt from subscription checks (e.g. super-admin, client). */
const EXEMPT_ROLES = new Set(["SUPER_ADMIN", "CLIENT"]);

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * SubscriptionGuard sits inside AppShell and handles all subscription-related UI:
 *
 * 1. **TRIAL (active)** — shows a dismissible countdown banner at the top.
 * 2. **TRIAL (expired / daysRemaining === 0)** — shows a full-screen blocking modal to choose a plan.
 * 3. **PAST_DUE / CANCELLED / EXPIRED** (company roles) — shows a blocking billing-issue modal.
 *    - OWNER sees a plan selector + CTA.
 *    - BRANCH_MANAGER / STAFF see a read-only message.
 * 4. **PAST_DUE / CANCELLED / EXPIRED** (STUDENT) — shows a non-blocking top banner.
 *
 * Rules:
 * - SUPER_ADMIN and CLIENT are exempt from all checks.
 * - The guard only activates after auth initialization and subscription is fetched.
 * - Subscription is lazily fetched once per session when the user is authenticated.
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  const subscription = useSubscriptionStore((s) => s.subscription);
  const hasFetched = useSubscriptionStore((s) => s.hasFetched);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);

  const [showUpgrade, setShowUpgrade] = React.useState(false);

  // ── Fetch subscription once the user is authenticated ──────────────────────
  React.useEffect(() => {
    if (!user || isAuthLoading || hasFetched) return;
    if (EXEMPT_ROLES.has(user.role)) return;
    // Only fetch for users with a tenant (enrolled/active users)
    if (!user.tenantId) return;

    fetchSubscription();
  }, [user, isAuthLoading, hasFetched, fetchSubscription]);

  // Pre-fetch plans whenever subscription becomes non-ACTIVE so modals load fast
  React.useEffect(() => {
    if (!subscription) return;
    if (subscription.status !== "ACTIVE" && subscription.status !== "TRIAL") {
      fetchPlans();
    }
  }, [subscription, fetchPlans]);

  // ── Poll subscription status every 10s when not ACTIVE ────────────────────
  React.useEffect(() => {
    if (!subscription || subscription.status === "ACTIVE") return;
    const interval = setInterval(() => {
      fetchSubscription();
    }, 10_000);
    return () => clearInterval(interval);
  }, [subscription, fetchSubscription]);

  // ── No user or exempt role — pass through ──────────────────────────────────
  if (!user || EXEMPT_ROLES.has(user.role)) {
    return <>{children}</>;
  }

  // ── Derive state ────────────────────────────────────────────────────────────
  const role = user.role;
  const isCompany = COMPANY_ROLES.has(role);
  const isStudent = role === "STUDENT";
  const isOwner = role === "OWNER";

  const trialActive = subscription?.status === "TRIAL" && trialDaysRemaining(subscription) > 0;
  const trialExpiredBlocking =
    subscription?.status === "TRIAL" && trialDaysRemaining(subscription) === 0;
  const billingIssue =
    subscription?.status === "PAST_DUE" ||
    subscription?.status === "CANCELLED" ||
    subscription?.status === "EXPIRED";

  // ── Open upgrade modal ─────────────────────────────────────────────────────
  const handleUpgrade = () => {
    fetchPlans();
    setShowUpgrade(true);
  };

  // Show banner for any non-ACTIVE subscription state
  const showBanner = isCompany && subscription && subscription.status !== "ACTIVE";

  return (
    <>
      {/* ── Subscription status banner (non-ACTIVE states) ── */}
      {showBanner && <TrialBanner />}

      {/* ── Student: non-blocking billing notice ── */}
      {isStudent && billingIssue && <StudentSubscriptionBanner />}

      {/* ── App content ── */}
      {children}

      {/* ── Trial expired: full-screen blocking modal (company) ── */}
      {isCompany && (trialExpiredBlocking || showUpgrade) && (
        <TrialExpiredModal
          open={trialExpiredBlocking || showUpgrade}
        />
      )}

      {/* ── Billing issue: blocking modal for company roles ── */}
      {isCompany && billingIssue && !trialExpiredBlocking && (
        <BillingIssueModal
          open={billingIssue}
          isOwner={isOwner}
        />
      )}
    </>
  );
}
