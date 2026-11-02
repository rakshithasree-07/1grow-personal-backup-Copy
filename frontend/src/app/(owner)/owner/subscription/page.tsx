"use client";

import * as React from "react";
import {
  CreditCard, CheckCircle2, XCircle, PauseCircle, PlayCircle,
  Shield, Users, Building2, GraduationCap, AlertTriangle,
  History, Receipt, Download, Eye, RefreshCw, ArrowRight,
  Sparkles, BookOpen, Package, CalendarDays, Wallet, ClipboardCheck,
  Target, Banknote, BadgeCheck, Clock, ReceiptText,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import {
  subscriptionService,
  type CurrentSubscription,
  type Plan,
  type SubscriptionHistory,
  type SubscriptionInvoice,
  type SubscriptionStatus,
} from "@/services/subscription.service";
import { paymentService } from "@/services/payment";
import { useSubscriptionStore } from "@/store/subscription.store";
import { useAuthStore } from "@/store/auth.store";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { MODULE_LABELS, type PlanModuleName } from "@/lib/modules";
import { downloadSubscriptionInvoicePdf } from "@/utils/subscription-invoice-pdf";
import { cn } from "@/lib/cn";

/* ─── Shared labels & helpers ─────────────────────────────────────────────── */

const statusVariant: Record<SubscriptionStatus, "success" | "warning" | "danger" | "info" | "secondary"> = {
  TRIAL: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "danger",
  EXPIRED: "secondary",
  PAUSED: "secondary",
};

const statusLabel: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past Due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  PAUSED: "Paused",
};

const moduleIcons: Record<string, React.ReactNode> = {
  TRAINING: <BookOpen size={10} />,
  RENTAL: <Package size={10} />,
  EVENTS: <CalendarDays size={10} />,
  FINANCE: <Wallet size={10} />,
  OPERATIONS: <ClipboardCheck size={10} />,
  LEADS: <Target size={10} />,
};

const historyIcons: Record<string, React.ReactNode> = {
  ACTIVATED: <BadgeCheck size={14} />,
  SUBSCRIBED: <BadgeCheck size={14} />,
  PAYMENT_RECEIVED: <Banknote size={14} />,
  CANCELLED: <XCircle size={14} />,
  PAUSED: <PauseCircle size={14} />,
  RESUMED: <PlayCircle size={14} />,
  SYNCED: <RefreshCw size={14} />,
  COMPLETED: <CheckCircle2 size={14} />,
  EXPIRED: <Clock size={14} />,
};

const intervalLabel = (interval: Plan["interval"]) =>
  interval === "MONTHLY" ? "month" : "year";

const isNeedsSubscription = (sub: CurrentSubscription | null) =>
  !sub || sub.status === "EXPIRED" || sub.status === "CANCELLED";

const invoiceStatusVariant = (status: string): "success" | "warning" | "danger" | "secondary" => {
  const s = status.toLowerCase();
  if (s === "paid" || s === "success") return "success";
  if (s === "overdue" || s === "failed") return "danger";
  if (s === "cancelled" || s === "refunded" || s === "draft") return "secondary";
  return "warning";
};

const invoiceStatusLabel = (status: string) => status.toLowerCase().replace(/_/g, " ");

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("en-IN") : "—";

/* ─── Plan card (used in upgrade modal & choose-a-plan) ───────────────────── */

function PlanCard({
  plan,
  isCurrent,
  mode,
  actionLoading,
  onPrimary,
  onSecondary,
}: {
  plan: Plan;
  isCurrent?: boolean;
  mode: "activate" | "upgrade";
  actionLoading: string | null;
  onPrimary: (plan: Plan) => void;
  onSecondary?: (plan: Plan) => void;
}) {
  const primaryKey = mode === "activate" ? `activate:${plan.id}` : `switch:${plan.id}`;
  return (
    <Card className={cn("relative flex flex-col p-5", isCurrent && "ring-2 ring-primary")}>
      {isCurrent && (
        <Badge variant="brand" size="sm" className="absolute right-3 top-3">
          Current
        </Badge>
      )}
      <h3 className="text-base font-bold text-text-primary">{plan.name}</h3>
      <p className="mt-1 text-2xl font-bold text-text-primary tabular-nums">
        ₹{plan.price.toLocaleString("en-IN")}
        <span className="text-sm font-normal text-text-secondary">
          /{plan.interval === "MONTHLY" ? "mo" : "yr"}
        </span>
      </p>
      {plan.description && <p className="mt-2 text-sm text-text-secondary">{plan.description}</p>}

      {plan.modules.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plan.modules
            .filter((m) => m.isActive)
            .map((m) => {
              const modName = m.module.toUpperCase() as PlanModuleName;
              return (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20"
                >
                  {moduleIcons[modName] ?? null}
                  {MODULE_LABELS[modName] ?? m.module}
                </span>
              );
            })}
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        {plan.features.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            {f.isEnabled ? (
              <CheckCircle2 size={14} className="shrink-0 text-success" />
            ) : (
              <XCircle size={14} className="shrink-0 text-text-disabled" />
            )}
            <span className="text-xs text-text-primary">{f.feature}</span>
            {f.value && <span className="text-xs text-text-secondary">({f.value})</span>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
        {plan.maxUsers != null && (
          <span className="inline-flex items-center gap-1"><Users size={12} /> {plan.maxUsers} users</span>
        )}
        {plan.maxBranches != null && (
          <span className="inline-flex items-center gap-1"><Building2 size={12} /> {plan.maxBranches} branches</span>
        )}
        {plan.maxStudents != null && (
          <span className="inline-flex items-center gap-1"><GraduationCap size={12} /> {plan.maxStudents} students</span>
        )}
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <Button
          className="w-full"
          size="sm"
          leftIcon={mode === "activate" ? <CreditCard size={14} /> : <Sparkles size={14} />}
          onClick={() => onPrimary(plan)}
          loading={actionLoading === primaryKey}
        >
          {mode === "activate" ? "Activate Plan" : `Upgrade to ${plan.name}`}
        </Button>
        {onSecondary && (
          <Button
            className="w-full"
            size="sm"
            variant="outline"
            leftIcon={<CreditCard size={14} />}
            onClick={() => onSecondary(plan)}
            loading={actionLoading === `razorpay-setup:${plan.id}`}
          >
            Set Up AutoPay
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

type ConfirmType = "cancel" | "pause" | "resume" | "activate" | "razorpay-setup" | "sync" | "switch";

export default function OwnerSubscriptionPage() {
  const { primaryColor } = useBrandTheme();
  const user = useAuthStore((s) => s.user);
  const refreshSubscription = useSubscriptionStore((s) => s.refreshSubscription);

  const [current, setCurrent] = React.useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [plansFetched, setPlansFetched] = React.useState(false);
  const [plansLoading, setPlansLoading] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  const [history, setHistory] = React.useState<SubscriptionHistory[]>([]);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const [invoices, setInvoices] = React.useState<SubscriptionInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = React.useState(false);
  const [invoicesLoaded, setInvoicesLoaded] = React.useState(false);
  const [viewInvoice, setViewInvoice] = React.useState<SubscriptionInvoice | null>(null);

  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    open: boolean;
    type: ConfirmType;
    planId?: string;
    planName?: string;
    planPrice?: number;
    planInterval?: string;
    currentPlanName?: string;
  }>({ open: false, type: "cancel" });

  const needsSubscription = isNeedsSubscription(current);

  const extractError = (err: unknown): string => {
    if (err && typeof err === "object" && "response" in err) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      return resp?.data?.message ?? "An unexpected error occurred";
    }
    return err instanceof Error ? err.message : "An unexpected error occurred";
  };

  /* ─── Data loading ─────────────────────────────────────────────────── */

  const loadPlans = React.useCallback(async () => {
    if (plansFetched) return;
    setPlansLoading(true);
    try {
      setPlans(await subscriptionService.getPlans());
      setPlansFetched(true);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setPlansLoading(false);
    }
  }, [plansFetched]);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await subscriptionService.getHistory());
    } catch {
      toast.error("Failed to load subscription history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadInvoices = React.useCallback(async () => {
    setInvoicesLoading(true);
    try {
      setInvoices(await subscriptionService.getInvoices());
    } catch {
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
      setInvoicesLoaded(true);
    }
  }, []);

  const loadAll = React.useCallback(async () => {
    const [currentRes, invoicesRes] = await Promise.allSettled([
      subscriptionService.getCurrent(),
      subscriptionService.getInvoices(),
    ]);
    if (currentRes.status === "fulfilled") setCurrent(currentRes.value);
    if (invoicesRes.status === "fulfilled") setInvoices(invoicesRes.value);
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const currentRes = await subscriptionService.getCurrent().catch(() => null);
      setCurrent(currentRes);
      if (isNeedsSubscription(currentRes)) await loadPlans();
      await loadInvoices();
      setLoading(false);
    })();
  }, [loadPlans, loadInvoices]);

  const toggleHistory = React.useCallback(() => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && !historyLoaded) {
      setHistoryLoaded(true);
      loadHistory();
    }
  }, [historyOpen, historyLoaded, loadHistory]);

  const openUpgradeModal = React.useCallback(() => {
    setUpgradeOpen(true);
    loadPlans();
  }, [loadPlans]);

  /* ─── Actions ──────────────────────────────────────────────────────── */

  const handleConfirm = async () => {
    const { type, planId } = confirmAction;
    const key = type + (planId ? `:${planId}` : "");
    setActionLoading(key);
    setConfirmAction((p) => ({ ...p, open: false }));
    try {
      switch (type) {
        case "activate":
          if (!planId) return;
          await subscriptionService.activate(planId);
          toast.success("Plan activated successfully");
          break;
        case "switch": {
          if (!planId) return;
          await subscriptionService.switchPlan(planId);
          toast.success("Plan switched successfully");
          break;
        }
        case "razorpay-setup": {
          if (!planId) return;
          const { razorpaySubscriptionId } = await subscriptionService.setupRazorpaySubscription(planId);
          try {
            await paymentService.openRazorpaySubscriptionCheckout(
              razorpaySubscriptionId,
              {
                name: "1Grow",
                description: `Set up AutoPay for ${confirmAction.planName ?? "your plan"}`,
                themeColor: primaryColor ?? "#6366f1",
              },
            );
            toast.success("AutoPay mandate authorized! Your subscription is being activated...");
            setTimeout(async () => {
              try {
                await subscriptionService.syncStatus();
                await refreshSubscription();
                toast.success("Subscription activated successfully!");
              } catch {
                // silent - store updated via webhook eventually
              }
            }, 3000);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "AutoPay setup was cancelled";
            toast.error(message);
            return;
          }
          break;
        }
        case "cancel":
          await subscriptionService.cancel();
          toast.success("Subscription cancelled");
          break;
        case "pause":
          await subscriptionService.pause();
          toast.success("Subscription paused");
          break;
        case "resume":
          await subscriptionService.resume();
          toast.success("Subscription resumed");
          break;
        case "sync":
          await subscriptionService.syncStatus();
          toast.success("Subscription status synced");
          break;
      }
      setUpgradeOpen(false);
      await loadAll();
    } catch (err: unknown) {
      const message = extractError(err);
      if (message.toLowerCase().includes("already exists")) {
        toast.info("An active payment link already exists. Redirecting to payment...");
      } else if (message.toLowerCase().includes("already subscribed")) {
        toast.info("You are already subscribed to this plan.");
      } else if (message.toLowerCase().includes("already")) {
        toast.info(message);
      } else {
        toast.error(message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const openSwitch = React.useCallback((plan: Plan) => {
    setConfirmAction({
      open: true,
      type: "switch",
      planId: plan.id,
      planName: plan.name,
      currentPlanName: current?.plan.name,
    });
  }, [current]);

  const openAutoPay = React.useCallback((plan: Plan) => {
    setConfirmAction({
      open: true,
      type: "razorpay-setup",
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      planInterval: plan.interval,
    });
  }, []);

  const openActivate = React.useCallback((plan: Plan) => {
    setConfirmAction({ open: true, type: "activate", planId: plan.id, planName: plan.name });
  }, []);

  const handleDownloadInvoice = React.useCallback((invoice: SubscriptionInvoice) => {
    if (!current) return;
    downloadSubscriptionInvoicePdf(
      {
        invoice,
        planName: current.plan.name,
        tenantName: user?.tenantName ?? "1Grow",
        tenantEmail: user?.email,
        tenantPhone: user?.phone,
      },
      `invoice-${invoice.invoiceNumber}.pdf`,
    );
    toast.success("Invoice downloaded");
  }, [current, user]);

  /* ─── Columns ──────────────────────────────────────────────────────── */

  const historyColumns: Column<SubscriptionHistory>[] = [
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 capitalize">
          <span className="text-primary">{historyIcons[r.action] ?? <Clock size={14} />}</span>
          {r.action.replace(/_/g, " ").toLowerCase()}
        </span>
      ),
    },
    { key: "details", header: "Details", render: (r) => r.details ?? "—" },
    { key: "createdAt", header: "Date", render: (r) => formatDateTime(r.createdAt) },
  ];

  const invoiceColumns: Column<SubscriptionInvoice>[] = [
    { key: "invoiceNumber", header: "Invoice #", render: (r) => <span className="font-medium text-text-primary">{r.invoiceNumber}</span> },
    {
      key: "totalAmount",
      header: "Amount",
      render: (r) => (
        <span className="font-semibold text-text-primary tabular-nums">
          ₹{r.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={invoiceStatusVariant(r.status)} size="sm">{invoiceStatusLabel(r.status)}</Badge>,
    },
    { key: "paidAt", header: "Paid On", render: (r) => formatDate(r.paidAt) },
    { key: "createdAt", header: "Issued", render: (r) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" leftIcon={<Eye size={14} />} onClick={() => setViewInvoice(r)} title="View invoice">
            View
          </Button>
          <Button
            variant="ghost"
            size="xs"
            leftIcon={<Download size={14} />}
            onClick={() => handleDownloadInvoice(r)}
            title="Download PDF"
          >
            PDF
          </Button>
        </div>
      ),
    },
  ];

  const canCancel = current?.status === "ACTIVE" || current?.status === "PAST_DUE";

  const upgradePlans = React.useMemo(
    () =>
      plans
        .filter((p) => p.id !== current?.planId && p.price > (current?.plan.price ?? 0))
        .sort((a, b) => a.price - b.price),
    [plans, current],
  );

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <PageContainer
      title="Subscription"
      subtitle="Manage your plan, billing, and AutoPay"
      actions={
        current?.status === "PAST_DUE" ? (
          <Button
            variant="danger"
            leftIcon={<AlertTriangle size={16} />}
            onClick={() => setConfirmAction({ open: true, type: "sync" })}
            loading={actionLoading === "sync"}
          >
            Sync Status
          </Button>
        ) : needsSubscription ? undefined : current?.autoRenew ? (
          <Badge variant="success" size="md">
            <CheckCircle2 size={12} /> AutoPay Active
          </Badge>
        ) : (
          <Badge variant="warning" size="md">
            <AlertTriangle size={12} /> No AutoPay
          </Badge>
        )
      }
    >
      {loading ? (
        <div className="space-y-6">
          <SkeletonTable rows={1} />
          <SkeletonTable rows={4} />
        </div>
      ) : (
        <>
          {/* ─── Current Plan ─────────────────────────────────────────── */}
          {current && !needsSubscription ? (
            <Card className="mb-6 overflow-hidden">
              <div className="border-b border-border bg-primary/5 px-5 py-6 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-[var(--radius-lg)] bg-primary p-3 text-primary-foreground shadow-sm shadow-primary/20">
                      <Shield size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-text-primary">{current.plan.name}</h2>
                        <Badge variant={statusVariant[current.status]} size="sm">
                          {statusLabel[current.status]}
                        </Badge>
                        {current.autoRenew && (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 size={10} /> Auto-Renew
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {current.plan.interval === "MONTHLY" ? "Monthly" : "Yearly"} billing
                        &middot; ₹{current.plan.price.toLocaleString("en-IN")}/
                        {intervalLabel(current.plan.interval)}
                      </p>
                      {current.daysRemaining != null && (
                        <p className="mt-1 text-xs font-medium text-text-secondary">
                          {current.status === "TRIAL"
                            ? `Trial ends in ${current.daysRemaining} days`
                            : `${current.daysRemaining} days remaining`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      leftIcon={<Sparkles size={15} />}
                      onClick={openUpgradeModal}
                    >
                      Upgrade Plan
                    </Button>
                    {current.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<PauseCircle size={14} />}
                        onClick={() => setConfirmAction({ open: true, type: "pause" })}
                        loading={actionLoading === "pause"}
                      >
                        Pause
                      </Button>
                    )}
                    {current.status === "PAUSED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<PlayCircle size={14} />}
                        onClick={() => setConfirmAction({ open: true, type: "resume" })}
                        loading={actionLoading === "resume"}
                      >
                        Resume
                      </Button>
                    )}
                    {!current.autoRenew && (current.status === "ACTIVE" || current.status === "PAST_DUE") && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<CreditCard size={14} />}
                        onClick={() => setConfirmAction({
                          open: true,
                          type: "razorpay-setup",
                          planId: current.planId,
                          planName: current.plan.name,
                          planPrice: current.plan.price,
                          planInterval: current.plan.interval,
                        })}
                        loading={actionLoading === `razorpay-setup:${current.planId}`}
                      >
                        {current.status === "PAST_DUE" ? "Pay Now" : "Set Up AutoPay"}
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<XCircle size={14} />}
                        onClick={() => setConfirmAction({ open: true, type: "cancel" })}
                        loading={actionLoading === "cancel"}
                        className="text-danger"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <CardBody>
                {current.plan.features.length > 0 && (
                  <div className="border-b border-border pb-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Plan Features
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {current.plan.features.map((f) => (
                        <div key={f.id} className="flex items-center gap-2">
                          {f.isEnabled ? (
                            <CheckCircle2 size={14} className="shrink-0 text-success" />
                          ) : (
                            <XCircle size={14} className="shrink-0 text-text-disabled" />
                          )}
                          <span className="text-sm text-text-primary">{f.feature}</span>
                          {f.value && <span className="text-xs text-text-secondary">({f.value})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
                  {current.plan.maxUsers != null && (
                    <div className="rounded-[var(--radius-sm)] bg-surface-raised p-3 text-center">
                      <Users size={16} className="mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold text-text-primary tabular-nums">{current.plan.maxUsers}</p>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary">Max Users</p>
                    </div>
                  )}
                  {current.plan.maxBranches != null && (
                    <div className="rounded-[var(--radius-sm)] bg-surface-raised p-3 text-center">
                      <Building2 size={16} className="mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold text-text-primary tabular-nums">{current.plan.maxBranches}</p>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary">Max Branches</p>
                    </div>
                  )}
                  {current.plan.maxStudents != null && (
                    <div className="rounded-[var(--radius-sm)] bg-surface-raised p-3 text-center">
                      <GraduationCap size={16} className="mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold text-text-primary tabular-nums">{current.plan.maxStudents}</p>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary">Max Students</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            plans.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Choose a Plan</CardTitle>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {plans
                      .slice()
                      .sort((a, b) => a.price - b.price)
                      .map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          isCurrent={current?.planId === plan.id}
                          mode="activate"
                          actionLoading={actionLoading}
                          onPrimary={openActivate}
                        />
                      ))}
                  </div>
                </CardBody>
              </Card>
            )
          )}

          {/* ─── Subscription History ─────────────────────────────────── */}
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <History size={16} className="text-primary" /> Subscription History
                  </span>
                </CardTitle>
                {!historyOpen ? (
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ArrowRight size={14} />}
                    onClick={toggleHistory}
                  >
                    View History
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={toggleHistory}>
                    Hide
                  </Button>
                )}
              </CardHeader>

              {historyOpen && (
                <CardBody className="pt-0">
                  {historyLoading ? (
                    <SkeletonTable rows={4} />
                  ) : history.length === 0 ? (
                    <EmptyState title="No history available" description="Subscription events will appear here." />
                  ) : (
                    <>
                      <div className="hidden sm:block">
                        <Table columns={historyColumns} data={history} loading={false} />
                      </div>
                      <div className="space-y-3 sm:hidden">
                        {history.map((item) => (
                          <div key={item.id} className="rounded-[var(--radius-md)] border border-border p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-primary">{historyIcons[item.action] ?? <Clock size={14} />}</span>
                              <p className="text-sm font-semibold capitalize text-text-primary">
                                {item.action.replace(/_/g, " ").toLowerCase()}
                              </p>
                            </div>
                            {item.details && <p className="mt-1 text-sm text-text-secondary">{item.details}</p>}
                            <p className="mt-1 text-xs text-text-secondary">{formatDateTime(item.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardBody>
              )}
            </Card>
          </div>

          {/* ─── Billing Invoices ─────────────────────────────────────── */}
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <Receipt size={16} className="text-primary" /> Billing Invoices
                  </span>
                </CardTitle>
                <Badge variant={invoicesLoading ? "warning" : "secondary"} size="sm">
                  {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
                </Badge>
              </CardHeader>
              <CardBody className="pt-0">
                {invoicesLoading && !invoicesLoaded ? (
                  <SkeletonTable rows={3} />
                ) : invoices.length === 0 ? (
                  <EmptyState
                    icon={<ReceiptText size={44} className="text-text-disabled" />}
                    title="No invoices yet"
                    description="Your invoice will appear here once an AutoPay charge is completed."
                  />
                ) : (
                  <>
                    <div className="hidden sm:block">
                      <Table columns={invoiceColumns} data={invoices} loading={false} />
                    </div>
                    <div className="space-y-3 sm:hidden">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="rounded-[var(--radius-md)] border border-border p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-text-primary">{inv.invoiceNumber}</p>
                            <Badge variant={invoiceStatusVariant(inv.status)} size="sm">
                              {invoiceStatusLabel(inv.status)}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Amount</span>
                            <span className="font-bold text-text-primary tabular-nums">
                              ₹{inv.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
                            <span>Paid on {formatDate(inv.paidAt)}</span>
                            <span>Issued {formatDate(inv.createdAt)}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Eye size={14} />}
                              onClick={() => setViewInvoice(inv)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Download size={14} />}
                              onClick={() => handleDownloadInvoice(inv)}
                            >
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* ─── Upgrade Plan Modal ───────────────────────────────────────── */}
      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Upgrade Plan"
        description="Compare plans and upgrade to unlock more features and higher limits."
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
            Close
          </Button>
        }
      >
        {plansLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonTable rows={5} />
            <SkeletonTable rows={5} />
          </div>
        ) : upgradePlans.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={44} className="text-primary" />}
            title="You're on the best plan"
            description="No higher plan is available to upgrade to right now."
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-text-secondary">
              These plans give you more capacity and features than your current plan (
              <span className="font-semibold text-text-primary">{current?.plan.name}</span>).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {upgradePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  mode="upgrade"
                  actionLoading={actionLoading}
                  onPrimary={openSwitch}
                  onSecondary={openAutoPay}
                />
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* ─── Invoice Detail Modal ─────────────────────────────────────── */}
      <Modal
        open={viewInvoice != null}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice ${viewInvoice.invoiceNumber}` : "Invoice"}
        description={viewInvoice ? `Subscription invoice · ${formatDate(viewInvoice.createdAt)}` : undefined}
        size="lg"
        footer={
          viewInvoice && (
            <>
              <Button variant="outline" onClick={() => setViewInvoice(null)}>
                Close
              </Button>
              <Button
                leftIcon={<Download size={16} />}
                onClick={() => handleDownloadInvoice(viewInvoice)}
              >
                Download PDF
              </Button>
            </>
          )
        }
      >
        {viewInvoice && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Amount</p>
                <p className="mt-1 text-2xl font-bold text-text-primary tabular-nums">
                  ₹{viewInvoice.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>
              <Badge variant={invoiceStatusVariant(viewInvoice.status)} size="md">
                {invoiceStatusLabel(viewInvoice.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Plan", value: current?.plan.name ?? "—" },
                { label: "Issued", value: formatDate(viewInvoice.createdAt) },
                { label: "Due Date", value: formatDate(viewInvoice.dueDate) },
                { label: "Paid On", value: formatDate(viewInvoice.paidAt) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[var(--radius-md)] border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-text-primary">Description</p>
                <p className="text-sm font-medium text-text-primary">Amount</p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-text-primary">Subscription charge — {current?.plan.name ?? "Plan"}</p>
                <p className="text-sm text-text-primary tabular-nums">₹{viewInvoice.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="ml-auto w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-text-primary tabular-nums">₹{viewInvoice.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tax</span>
                <span className="text-text-primary tabular-nums">₹{viewInvoice.tax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-primary/10 px-3 py-2">
                <span className="text-sm font-semibold text-text-primary">Total</span>
                <span className="text-sm font-bold text-text-primary tabular-nums">
                  ₹{viewInvoice.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {viewInvoice.payments.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Payment Details
                </h4>
                <div className="space-y-2">
                  {(viewInvoice.payments ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-surface-raised px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {p.gatewayRef ?? "Razorpay payment"}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {p.paidAt ? formatDateTime(p.paidAt) : "Pending"} &middot; {p.status}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-text-primary tabular-nums">
                        ₹{p.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Confirm Modal ────────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction((p) => ({ ...p, open: false }))}
        onConfirm={handleConfirm}
        title={
          confirmAction.type === "cancel" ? "Cancel Subscription" :
          confirmAction.type === "pause" ? "Pause Subscription" :
          confirmAction.type === "resume" ? "Resume Subscription" :
          confirmAction.type === "razorpay-setup" ? "Set Up AutoPay" :
          confirmAction.type === "sync" ? "Sync Subscription Status" :
          confirmAction.type === "switch" ? `Switch to ${confirmAction.planName ?? "New Plan"}` :
          "Activate Plan"
        }
        description={
          confirmAction.type === "cancel" ? "Your subscription will be cancelled at the end of the current billing period. You will lose access to premium features." :
          confirmAction.type === "pause" ? "Your subscription will be paused immediately. You can resume anytime." :
          confirmAction.type === "resume" ? "Your subscription will be reactivated." :
          confirmAction.type === "razorpay-setup" ? `A secure popup will open to set up AutoPay for ${confirmAction.planName ?? "your plan"} at ₹${(confirmAction.planPrice ?? 0).toLocaleString("en-IN")}/${confirmAction.planInterval === "YEARLY" ? "yr" : "mo"}. Your card or UPI details will be collected securely by Razorpay.` :
          confirmAction.type === "sync" ? "This will sync your subscription status with Razorpay. Any recent changes will be reflected." :
          confirmAction.type === "switch" ? `Switch from ${confirmAction.currentPlanName ?? "your current plan"} to ${confirmAction.planName ?? "the new plan"}. The new plan will be active immediately with adjusted billing.` :
          `Activate ${confirmAction.planName ?? "the selected plan"} for your business.`
        }
        intent={
          confirmAction.type === "cancel" ? "danger" :
          confirmAction.type === "pause" ? "warning" :
          "info"
        }
        confirmLabel={
          confirmAction.type === "cancel" ? "Cancel Subscription" :
          confirmAction.type === "pause" ? "Pause" :
          confirmAction.type === "resume" ? "Resume" :
          confirmAction.type === "razorpay-setup" ? "Set Up AutoPay" :
          confirmAction.type === "sync" ? "Sync Now" :
          confirmAction.type === "switch" ? "Switch Plan" :
          "Activate"
        }
        loading={actionLoading != null && actionLoading.startsWith(confirmAction.type)}
      />
    </PageContainer>
  );
}
