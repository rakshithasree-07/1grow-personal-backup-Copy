"use client";

import * as React from "react";
import {
  Eye,
  Download,
  CreditCard,
  Loader2,
  AlertTriangle,
  Receipt,
  Clock,
  CalendarClock,
  X,
  RefreshCw,
  SlidersHorizontal,
  Inbox,
  Search,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { getInvoices, type Invoice, type InvoiceStatus } from "@/services/finance";
import { paymentService } from "@/services/payment";
import { useAuthStore } from "@/store/auth.store";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { downloadInvoicePdf, type InvoicePdfData } from "@/utils/invoice-pdf";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysRemaining(dueDate: string): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getRecipientName(invoice: Invoice): string {
  return (
    invoice.student?.name ||
    invoice.studentName ||
    invoice.client?.name ||
    "Unknown Recipient"
  );
}

function getRecipientContact(invoice: Invoice): string | null {
  return (
    invoice.student?.email ||
    invoice.student?.phone ||
    invoice.client?.email ||
    invoice.client?.phone ||
    null
  );
}

function getRecipientType(invoice: Invoice): "Student" | "Client" {
  if (invoice.client || invoice.clientId) return "Client";
  return "Student";
}

function getServiceName(invoice: Invoice): string {
  return (
    invoice.courseName ||
    invoice.description ||
    invoice.feePlanName ||
    "General Billing"
  );
}

interface DueStatus {
  variant: "danger" | "warning" | "info" | "success";
  label: string;
  isOverdue: boolean;
  days: number;
}

function getDueStatus(status: string, dueDate: string, dueAmount: number): DueStatus {
  const normStatus = (status || "").toLowerCase();
  if (normStatus === "paid" || dueAmount <= 0) {
    return { variant: "success", label: "Paid", isOverdue: false, days: 0 };
  }
  const days = getDaysRemaining(dueDate);
  if (normStatus === "overdue" || days < 0) {
    return { variant: "danger", label: "Overdue", isOverdue: true, days };
  }
  if (days === 0) {
    return { variant: "warning", label: "Due Today", isOverdue: false, days: 0 };
  }
  if (days <= 3) {
    return { variant: "warning", label: "Due Soon", isOverdue: false, days };
  }
  if (normStatus === "partial" || normStatus === "partially_paid") {
    return { variant: "warning", label: "Partial Paid", isOverdue: false, days };
  }
  return { variant: "info", label: "Upcoming", isOverdue: false, days };
}

/* ─── Main Component ───────────────────────────────────────────────────────── */

export default function DueTrackingPage() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useBrandTheme();
  const role = user?.role ?? "";
  const userId = user?.id ?? "";

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isOwner = role === "OWNER";
  const isBranchManager = role === "BRANCH_MANAGER";
  const isStaff = role === "STAFF";
  const isStudent = role === "STUDENT";
  const isClient = role === "CLIENT";

  const canDownload = isSuperAdmin || isOwner || isBranchManager || isStaff || isStudent || isClient;

  // State
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [error, setError] = React.useState(false);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortKey, setSortKey] = React.useState("dueDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  // Interaction State
  const [viewInvoice, setViewInvoice] = React.useState<Invoice | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  // Active filters count
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [search, statusFilter, dateFrom, dateTo]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Data fetching effect
  React.useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError(false);

      try {
        const params: Record<string, unknown> = {
          page,
          pageSize,
          search: search.trim() || undefined,
          status: (statusFilter as InvoiceStatus) || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy: sortKey || undefined,
          sortDir: sortKey ? sortDir : undefined,
        };

        if (isClient) {
          params.clientId = userId;
        } else if (isStudent) {
          params.studentId = userId;
        }

        const res = await getInvoices(params);
        if (!ignore) {
          setInvoices(res.data.items ?? []);
          setTotal(res.data.total ?? 0);
        }
      } catch {
        if (!ignore) {
          setError(true);
          toast.error("Failed to load invoice records");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadData();

    return () => {
      ignore = true;
    };
  }, [page, pageSize, search, statusFilter, dateFrom, dateTo, sortKey, sortDir, userId, isStudent, isClient, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Summary Metrics
  const summaryCards = React.useMemo(() => {
    const totalDue = invoices.reduce((s, inv) => s + (inv.dueAmount || 0), 0);
    const dueCount = invoices.filter((i) => (i.dueAmount || 0) > 0).length;

    const overdueInvoices = invoices.filter(
      (i) => i.status === "overdue" || getDaysRemaining(i.dueDate) < 0
    );
    const overdueAmount = overdueInvoices.reduce((s, inv) => s + (inv.dueAmount || 0), 0);

    const dueTodayInvoices = invoices.filter(
      (i) => (i.dueAmount || 0) > 0 && getDaysRemaining(i.dueDate) === 0
    );
    const dueTodayAmount = dueTodayInvoices.reduce((s, inv) => s + (inv.dueAmount || 0), 0);

    const upcomingInvoices = invoices.filter((i) => {
      const days = getDaysRemaining(i.dueDate);
      return (i.dueAmount || 0) > 0 && days > 0 && i.status !== "overdue";
    });
    const upcomingAmount = upcomingInvoices.reduce((s, inv) => s + (inv.dueAmount || 0), 0);

    const overduePercentage = totalDue > 0 ? Math.round((overdueAmount / totalDue) * 100) : 0;

    return {
      totalDue,
      dueCount,
      overdueAmount,
      overdueCount: overdueInvoices.length,
      overduePercentage,
      dueTodayAmount,
      dueTodayCount: dueTodayInvoices.length,
      upcomingAmount,
      upcomingCount: upcomingInvoices.length,
    };
  }, [invoices]);

  // Online Payment Flow (Razorpay)
  const handlePayOnline = React.useCallback(async (invoice: Invoice) => {
    setPayingInvoiceId(invoice.id);
    try {
      const recipientName = getRecipientName(invoice);
      const serviceName = getServiceName(invoice);
      const isClientRole = isClient || !!invoice.clientId;

      const result = await paymentService.payWithRazorpay(
        {
          invoiceId: invoice.id,
          paymentType: isClientRole ? "CLIENT_PAYMENT" : "STUDENT_FEE",
          description: `Payment for ${invoice.invoiceNumber} - ${serviceName}`,
        },
        {
          name: user?.name ?? recipientName,
          description: `${invoice.invoiceNumber} - ${serviceName}`,
          prefill: {
            name: user?.name ?? recipientName,
            email: user?.email ?? invoice.student?.email ?? invoice.client?.email ?? undefined,
          },
          themeColor: primaryColor ?? "#3b5bdb",
        }
      );
      toast.success(`Payment successful! Reference: ${result.transaction.razorpayPaymentId}`);
      setViewInvoice(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Payment cancelled by user") {
        toast.info("Payment cancelled");
      } else {
        toast.error(err instanceof Error ? err.message : "Payment processing failed");
      }
    } finally {
      setPayingInvoiceId(null);
    }
  }, [isClient, user, primaryColor]);

  // PDF Download Flow
  const handleDownload = React.useCallback(async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const pdfData: InvoicePdfData = {
        invoiceNumber: invoice.invoiceNumber,
        studentName: getRecipientName(invoice),
        courseName: getServiceName(invoice),
        feePlanName: invoice.feePlanName || invoice.description || "General Fee",
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        dueAmount: invoice.dueAmount,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        notes: invoice.notes,
        payments: invoice.payments,
        studentEmail: invoice.student?.email ?? invoice.client?.email,
        studentPhone: invoice.student?.phone ?? invoice.client?.phone,
      };
      downloadInvoicePdf(pdfData, `invoice-${invoice.invoiceNumber}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch {
      toast.error("Failed to generate invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Desktop/Tablet Table Columns
  const columns: Column<Invoice>[] = React.useMemo(() => [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setViewInvoice(row)}
          className="group flex items-center gap-1.5 text-left font-semibold text-[#3b5bdb] hover:underline focus:outline-none"
          title="Click to view details"
        >
          <span>{row.invoiceNumber}</span>
        </button>
      ),
    },
    {
      key: "studentName",
      header: "Recipient",
      sortable: true,
      render: (row) => {
        const name = getRecipientName(row);
        const contact = getRecipientContact(row);
        const type = getRecipientType(row);
        return (
          <div className="min-w-[140px]">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{name}</p>
              <Badge variant={type === "Client" ? "secondary" : "outline"} size="sm">
                {type}
              </Badge>
            </div>
            {contact && (
              <p className="text-xs text-gray-500 truncate max-w-[180px]">{contact}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "courseName",
      header: "Course / Service",
      render: (row) => (
        <div className="min-w-[120px]">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[170px]">
            {getServiceName(row)}
          </p>
          {(row.batchName || row.feePlanName) && (
            <p className="text-xs text-gray-500 truncate max-w-[170px]">
              {row.batchName || row.feePlanName}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "issueDate",
      header: "Invoice Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatDate(row.issueDate)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (row) => {
        const { variant, days, isOverdue } = getDueStatus(row.status, row.dueDate, row.dueAmount);
        return (
          <div className="min-w-[110px] space-y-0.5">
            <p className="text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {formatDate(row.dueDate)}
            </p>
            {row.dueAmount > 0 ? (
              <div className="flex items-center gap-1">
                {isOverdue && <AlertTriangle size={11} className="text-rose-600 shrink-0" />}
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    variant === "danger" && "text-rose-600",
                    variant === "warning" && "text-amber-600",
                    variant === "info" && "text-gray-500"
                  )}
                >
                  {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-emerald-600 font-medium">Settled</span>
            )}
          </div>
        );
      },
    },
    {
      key: "totalAmount",
      header: "Total",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white tabular-nums font-medium whitespace-nowrap">
          {formatINR(row.totalAmount)}
        </span>
      ),
    },
    {
      key: "paidAmount",
      header: "Paid",
      render: (row) => {
        const paidPct = row.totalAmount > 0 ? Math.min(100, Math.round((row.paidAmount / row.totalAmount) * 100)) : 0;
        return (
          <div className="min-w-[90px]">
            <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
              {formatINR(row.paidAmount)}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${paidPct}%`,
                    backgroundColor: paidPct >= 100 ? "#10b981" : "#3b5bdb",
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-500 tabular-nums w-6 text-right">
                {paidPct}%
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "dueAmount",
      header: "Outstanding",
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            "text-sm font-bold tabular-nums whitespace-nowrap",
            row.dueAmount > 0 ? "text-rose-600" : "text-emerald-600"
          )}
        >
          {formatINR(row.dueAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const { variant, label } = getDueStatus(row.status, row.dueDate, row.dueAmount);
        return <Badge variant={variant} size="sm">{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.dueAmount > 0 && (isStudent || isClient) && (
            <Button
              variant="primary"
              size="xs"
              leftIcon={payingInvoiceId === row.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
              onClick={() => handlePayOnline(row)}
              disabled={payingInvoiceId === row.id}
              className="rounded-xl bg-[#3b5bdb]"
            >
              Pay
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setViewInvoice(row)}
            title="View Invoice Details"
            aria-label="View Invoice Details"
            className="rounded-xl"
          >
            <Eye size={14} />
          </Button>
          {canDownload && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDownload(row)}
              disabled={downloadingId === row.id}
              title="Download PDF"
              aria-label="Download PDF"
              className="rounded-xl"
            >
              {downloadingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </Button>
          )}
        </div>
      ),
    },
  ], [payingInvoiceId, downloadingId, isStudent, isClient, canDownload, handlePayOnline, handleDownload]);

  const modalDueStatus = viewInvoice
    ? getDueStatus(viewInvoice.status, viewInvoice.dueDate, viewInvoice.dueAmount)
    : null;

  return (
    <PageContainer
      title="Due Tracking"
      subtitle="Monitor outstanding receivables, overdue balances, and student/client payment collections."
      actions={
        <div className="flex items-center gap-2">
          {isStudent && <Badge variant="info" size="md">Student Portal</Badge>}
          {isClient && <Badge variant="info" size="md">Client Portal</Badge>}
          {!isStudent && !isClient && <Badge variant="outline" size="md">Organization View</Badge>}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />}
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="rounded-xl border-gray-300 dark:border-gray-700"
          >
            Refresh
          </Button>
        </div>
      }
    >
      {/* ─── Urgent Overdue Notice Banner ─────────────────────────────────── */}
      {summaryCards.overdueAmount > 0 && !loading && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-bold">
                {formatINR(summaryCards.overdueAmount)} Overdue across {summaryCards.overdueCount} invoice{summaryCards.overdueCount === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                Action required to recover overdue receivables and keep billing healthy.
              </p>
            </div>
          </div>
          {statusFilter !== "overdue" && (
            <Button
              variant="outline"
              size="xs"
              className="rounded-xl border-rose-300 text-rose-600 hover:bg-rose-100 self-start sm:self-auto"
              onClick={() => {
                setStatusFilter("overdue");
                setPage(1);
              }}
            >
              Filter Overdue Only
            </Button>
          )}
        </div>
      )}

      {/* ─── Clean Modern Summary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-900">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Total Due</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatINR(summaryCards.totalDue)}</p>
              <p className="text-xs text-gray-400 mt-1">{summaryCards.dueCount} invoices outstanding</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
              <Receipt size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-900">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Overdue</p>
              <p className="text-3xl font-bold text-rose-600 mt-1">{formatINR(summaryCards.overdueAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">{summaryCards.overduePercentage}% of total due</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600">
              <AlertTriangle size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-900">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Due Today</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{formatINR(summaryCards.dueTodayAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">{summaryCards.dueTodayCount} due today</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600">
              <Clock size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-900">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Upcoming</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatINR(summaryCards.upcomingAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">{summaryCards.upcomingCount} upcoming</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
              <CalendarClock size={20} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ─── Search and Filters Bar ────────────────────────────────────────── */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by invoice #, student or client..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#3b5bdb] transition-all shadow-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden shrink-0 rounded-xl"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              leftIcon={<SlidersHorizontal size={14} />}
            >
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="hidden sm:flex flex-wrap items-center gap-1.5">
            {[
              { id: "", label: "All" },
              { id: "overdue", label: "Overdue", count: summaryCards.overdueCount },
              { id: "pending", label: "Pending / Due Soon" },
              { id: "partial", label: "Partial" },
              { id: "paid", label: "Paid" },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shadow-xs",
                    active
                      ? "bg-[#3b5bdb] text-white shadow-sm"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count != null && tab.count > 0 && (
                    <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold bg-rose-600 text-white tabular-nums">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range & Secondary Filters */}
        <div
          className={cn(
            "flex-wrap items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm",
            showMobileFilters ? "flex" : "hidden md:flex"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Filter from date"
              className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#3b5bdb] transition-all shadow-xs"
            />
            <span className="text-xs font-medium text-gray-400 px-1">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="Filter to date"
              className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#3b5bdb] transition-all shadow-xs"
            />
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium text-gray-500">{activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearFilters}
                className="text-rose-600 hover:bg-rose-50 rounded-xl font-medium"
                leftIcon={<X size={12} />}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Content Area ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonTable rows={5} />
        </div>
      ) : error ? (
        <ErrorState
          code={500}
          title="Failed to Load Due Records"
          description="An error occurred while fetching invoice and due records. Please check your connection and try again."
          action={{ label: "Retry", onClick: handleRefresh }}
        />
      ) : invoices.length === 0 ? (
        <div className="py-20 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-3 shadow-sm">
            <Inbox size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No outstanding dues found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Great news! There are currently no due or overdue invoices to collect matching your criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-gray-900 p-0">
              <Table
                columns={columns}
                data={invoices}
                loading={false}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </Card>
          </div>

          <div className="sm:hidden space-y-3">
            {invoices.map((inv) => {
              const { variant, label, days, isOverdue } = getDueStatus(inv.status, inv.dueDate, inv.dueAmount);
              const recipient = getRecipientName(inv);
              const service = getServiceName(inv);

              return (
                <Card key={inv.id} className="p-4 space-y-3 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => setViewInvoice(inv)}
                        className="text-sm font-bold text-[#3b5bdb] hover:underline text-left"
                      >
                        {inv.invoiceNumber}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">{service}</p>
                    </div>
                    <Badge variant={variant} size="sm">{label}</Badge>
                  </div>

                  <div className="text-xs text-gray-900 dark:text-white">
                    <span className="text-gray-400">Recipient: </span>
                    <span className="font-semibold">{recipient}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-center border border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-semibold">Total</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">{formatINR(inv.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-semibold">Paid</p>
                      <p className="text-xs font-bold text-emerald-600 tabular-nums mt-0.5">{formatINR(inv.paidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-semibold">Due</p>
                      <p className={cn("text-xs font-extrabold tabular-nums mt-0.5", inv.dueAmount > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {formatINR(inv.dueAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Due: {formatDate(inv.dueDate)}</span>
                    <span className={cn("font-semibold", isOverdue && "text-rose-600", days === 0 && "text-amber-600", days > 0 && days <= 3 && "text-amber-600")}>
                      {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {inv.dueAmount > 0 && (isStudent || isClient) && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 rounded-xl bg-[#3b5bdb]"
                        leftIcon={payingInvoiceId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                        onClick={() => handlePayOnline(inv)}
                        disabled={payingInvoiceId === inv.id}
                      >
                        Pay {formatINR(inv.dueAmount)}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                      leftIcon={<Eye size={13} />}
                      onClick={() => setViewInvoice(inv)}
                    >
                      View
                    </Button>
                    {canDownload && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-3"
                        leftIcon={<Download size={13} />}
                        onClick={() => handleDownload(inv)}
                        disabled={downloadingId === inv.id}
                      >
                        PDF
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}

      {/* ─── Invoice Preview & Details Modal ──────────────────────────────── */}
      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice #${viewInvoice.invoiceNumber}` : ""}
        description={viewInvoice ? `Issued on ${formatDate(viewInvoice.issueDate)}` : ""}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setViewInvoice(null)} className="rounded-xl">
              Close
            </Button>
            {canDownload && viewInvoice && (
              <Button
                variant="outline"
                leftIcon={<Download size={14} />}
                onClick={() => handleDownload(viewInvoice)}
                disabled={downloadingId === viewInvoice.id}
                className="rounded-xl"
              >
                {downloadingId === viewInvoice.id ? "Preparing PDF..." : "Download PDF"}
              </Button>
            )}
            {viewInvoice && viewInvoice.dueAmount > 0 && (isStudent || isClient) && (
              <Button
                variant="primary"
                leftIcon={payingInvoiceId === viewInvoice.id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                onClick={() => handlePayOnline(viewInvoice)}
                disabled={payingInvoiceId === viewInvoice.id}
                className="rounded-xl bg-[#3b5bdb]"
              >
                {payingInvoiceId === viewInvoice.id ? "Processing..." : `Pay Now (${formatINR(viewInvoice.dueAmount)})`}
              </Button>
            )}
          </div>
        }
      >
        {viewInvoice && modalDueStatus && (
          <div className="space-y-5">
            {modalDueStatus.isOverdue && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-rose-800 dark:text-rose-200">
                <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                <p className="text-sm font-semibold">
                  {modalDueStatus.days === 0
                    ? "This invoice is due today. Please settle immediately to avoid late fees."
                    : `This invoice is ${Math.abs(modalDueStatus.days)} days overdue. Immediate payment required.`}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Recipient ({getRecipientType(viewInvoice)})</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{getRecipientName(viewInvoice)}</p>
                {getRecipientContact(viewInvoice) && <p className="text-xs text-gray-500">{getRecipientContact(viewInvoice)}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Course / Service</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{getServiceName(viewInvoice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Issue Date</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{formatDate(viewInvoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Due Date</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(viewInvoice.dueDate)}</span>
                  <Badge variant={modalDueStatus.variant} size="sm">{modalDueStatus.label}</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Payment Summary</span>
                <span className="text-xs text-gray-500 tabular-nums">{formatINR(viewInvoice.paidAmount)} of {formatINR(viewInvoice.totalAmount)}</span>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${viewInvoice.totalAmount > 0 ? Math.min(100, Math.round((viewInvoice.paidAmount / viewInvoice.totalAmount) * 100)) : 0}%`,
                    backgroundColor: viewInvoice.paidAmount >= viewInvoice.totalAmount ? "#10b981" : "#3b5bdb",
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 text-center border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">{formatINR(viewInvoice.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Paid</p>
                  <p className="text-sm font-bold text-emerald-600 tabular-nums mt-0.5">{formatINR(viewInvoice.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Outstanding</p>
                  <p className={cn("text-sm font-bold tabular-nums mt-0.5", viewInvoice.dueAmount > 0 ? "text-rose-600" : "text-emerald-600")}>
                    {formatINR(viewInvoice.dueAmount)}
                  </p>
                </div>
              </div>
            </div>

            {viewInvoice.notes && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3.5 text-xs border border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-700 dark:text-gray-300">Notes: </span>
                <span className="text-gray-600 dark:text-gray-400">{viewInvoice.notes}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}