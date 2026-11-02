"use client";

import * as React from "react";
import { Eye, Download, Printer, Bell, CreditCard, Loader2, AlertTriangle, FileText, DollarSign, Clock, ChevronDown, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/ui/Card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterBar, type FilterDef } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { getInvoices, type Invoice, type InvoiceStatus } from "@/services/finance";
import { getCourses, type Course } from "@/services/courses";
import { paymentService } from "@/services/payment";
import { useAuthStore } from "@/store/auth.store";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { downloadInvoicePdf, generateInvoicePdf, type InvoicePdfData } from "@/utils/invoice-pdf";

const statusFilters: FilterDef[] = [
  {
    key: "status",
    label: "All Statuses",
    options: [
      { value: "paid", label: "Paid" },
      { value: "partial", label: "Partial" },
      { value: "overdue", label: "Overdue" },
      { value: "pending", label: "Pending" },
    ],
  },
];

function getDaysRemaining(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getPriorityBadge(status: string, dueDate: string): { variant: "danger" | "warning" | "info" | "success"; label: string } {
  if (status === "overdue") return { variant: "danger", label: "Overdue" };
  if (status === "partial") return { variant: "warning", label: "Partial Paid" };
  if (status === "paid") return { variant: "success", label: "Paid" };
  const days = getDaysRemaining(dueDate);
  if (days <= 0) return { variant: "danger", label: "Overdue" };
  if (days <= 3) return { variant: "danger", label: "Due Soon" };
  if (days <= 7) return { variant: "warning", label: "Upcoming" };
  return { variant: "info", label: "On Track" };
}

export default function DueTrackingPage() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useBrandTheme();
  const role = user?.role ?? "";
  const userId = user?.id ?? "";

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isOwner = role === "OWNER";
  const isBranchManager = role === "BRANCH_MANAGER";
  const isStudent = role === "STUDENT";
  const isClient = role === "CLIENT";

  const canManage = isSuperAdmin || isOwner || isBranchManager;
  const canDownload = isSuperAdmin || isOwner || isBranchManager || isStudent || isClient;
  const canRemind = isSuperAdmin || isOwner;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortKey, setSortKey] = React.useState("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [viewInvoice, setViewInvoice] = React.useState<Invoice | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  const [courseOptions, setCourseOptions] = React.useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => {
    getCourses().then((res) => {
      setCourseOptions(
        res.data.items.map((c: Course) => ({ value: c.id, label: c.name })),
      );
    }).catch(() => {});
  }, []);

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
        search: search || undefined,
        status: (statusFilter as InvoiceStatus) || undefined,
        courseId: courseFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: sortKey || undefined,
        sortDir: sortKey ? sortDir : undefined,
      };
      if (isStudent || isClient) {
        params.studentId = userId;
      }
      const res = await getInvoices(params);
      setInvoices(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, courseFilter, dateFrom, dateTo, sortKey, sortDir, userId, isStudent, isClient]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const summaryCards = React.useMemo(() => {
    const totalDue = invoices.reduce((s, inv) => s + inv.dueAmount, 0);
    const overdue = invoices.filter((i) => i.status === "overdue");
    const dueToday = invoices.filter((i) => getDaysRemaining(i.dueDate) === 0);
    const upcoming = invoices.filter((i) => {
      const days = getDaysRemaining(i.dueDate);
      return days > 0 && i.status !== "paid";
    });
    return {
      totalDue,
      overdueAmount: overdue.reduce((s, inv) => s + inv.dueAmount, 0),
      dueTodayAmount: dueToday.reduce((s, inv) => s + inv.dueAmount, 0),
      upcomingAmount: upcoming.reduce((s, inv) => s + inv.dueAmount, 0),
    };
  }, [invoices]);

  const handlePayOnline = async (invoice: Invoice) => {
    setPayingInvoiceId(invoice.id);
    try {
      const result = await paymentService.payWithRazorpay(
        {
          invoiceId: invoice.id,
          paymentType: "STUDENT_FEE",
          description: `Payment for ${invoice.invoiceNumber} - ${invoice.courseName}`,
        },
        {
          name: user?.name ?? "Student",
          description: `${invoice.invoiceNumber} - ${invoice.courseName}`,
          prefill: {
            name: user?.name,
            email: user?.email ?? undefined,
          },
          themeColor: primaryColor ?? "#6366f1",
        },
      );
      toast.success(`Payment successful! Ref: ${result.transaction.razorpayPaymentId}`);
      setViewInvoice(null);
      await fetchInvoices();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Payment cancelled by user") {
        toast.info("Payment cancelled");
      } else {
        toast.error(err instanceof Error ? err.message : "Payment failed");
      }
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const pdfData: InvoicePdfData = {
        invoiceNumber: invoice.invoiceNumber,
        studentName: invoice.studentName,
        courseName: invoice.courseName,
        feePlanName: invoice.feePlanName,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        dueAmount: invoice.dueAmount,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        notes: invoice.notes,
      };
      downloadInvoicePdf(pdfData, `invoice-${invoice.invoiceNumber}.pdf`);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewPdf = async (invoice: Invoice) => {
    setViewInvoice(invoice);
    toast.info("Opening invoice preview...");
  };

  const columns: Column<Invoice>[] = React.useMemo(() => [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-text-primary">{row.invoiceNumber}</span>
      ),
    },
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.studentName}</p>
          <p className="text-xs text-text-secondary">{row.courseName}</p>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-text-secondary tabular-nums">${row.totalAmount.toLocaleString()}</span>
      ),
    },
    {
      key: "dueAmount",
      header: "Outstanding",
      sortable: true,
      render: (row) => (
        <span className={cn(
          "text-base font-bold tabular-nums",
          row.dueAmount > 0 ? "text-danger" : "text-success",
        )}>
          ${row.dueAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (row) => {
        const paidPct = row.totalAmount > 0 ? Math.round((row.paidAmount / row.totalAmount) * 100) : 0;
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${paidPct}%`,
                  backgroundColor: paidPct >= 100 ? "var(--color-success)" : paidPct > 0 ? "var(--color-primary)" : "var(--color-surface-overlay)",
                }}
              />
            </div>
            <span className="text-xs text-text-secondary tabular-nums w-8 text-right">{paidPct}%</span>
          </div>
        );
      },
    },
    {
      key: "dueDate",
      header: "Days Left",
      render: (row) => {
        const days = getDaysRemaining(row.dueDate);
        const isOverdue = row.status === "overdue" || days < 0;
        const isDueToday = days === 0;
        const isSoon = days > 0 && days <= 3;
        return (
          <div className="flex items-center gap-1.5">
            {(isOverdue || isDueToday || isSoon) && (
              <AlertTriangle size={12} className={cn(isOverdue ? "text-danger" : "text-warning")} />
            )}
            <span className={cn(
              "font-semibold tabular-nums",
              isOverdue && "text-danger",
              isDueToday && "text-warning",
              isSoon && "text-warning",
              !isOverdue && !isDueToday && !isSoon && "text-text-secondary",
            )}>
              {isOverdue ? `${Math.abs(days)}d overdue` : isDueToday ? "Due today" : `${days}d left`}
            </span>
          </div>
        );
      },
    },
    {
      key: "priority",
      header: "",
      render: (row) => {
        const { variant, label } = getPriorityBadge(row.status, row.dueDate);
        return <Badge variant={variant} size="sm">{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.dueAmount > 0 && isStudent && (
            <Button
              variant="primary"
              size="xs"
              leftIcon={payingInvoiceId === row.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
              onClick={() => handlePayOnline(row)}
              disabled={payingInvoiceId === row.id}
            >
              Pay
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={() => handleViewPdf(row)} title="View Invoice">
            <Eye size={14} />
          </Button>
          {canDownload && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDownload(row)}
              disabled={downloadingId === row.id}
              title="Download Invoice"
            >
              {downloadingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </Button>
          )}
          {canRemind && (
            <Button variant="ghost" size="xs" onClick={() => toast.success("Reminder sent to student")} title="Send Reminder">
              <Bell size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ], [canDownload, canRemind, payingInvoiceId, downloadingId, isStudent, user?.name, user?.email]);

  const daysRemaining = viewInvoice ? getDaysRemaining(viewInvoice.dueDate) : 0;
  const isOverdue = viewInvoice?.status === "overdue" || daysRemaining < 0;

  return (
    <PageContainer
      title="Due Tracking"
      subtitle="Collection & Outstanding Dues Workspace"
    >
      {summaryCards.overdueAmount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/20 bg-danger/5 px-4 py-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-sm font-medium text-danger">
            {summaryCards.overdueAmount > 0
              ? `₹${summaryCards.overdueAmount.toLocaleString()} overdue across multiple invoices — please collect payments soon.`
              : "No overdue payments"}
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Due"
          value={`₹${summaryCards.totalDue.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          deltaType={summaryCards.totalDue > 0 ? "decrease" : "increase"}
        />
        <StatCard
          title="Overdue"
          value={`₹${summaryCards.overdueAmount.toLocaleString()}`}
          icon={<AlertTriangle size={20} />}
          deltaType="decrease"
          className={summaryCards.overdueAmount > 0 ? "border-danger/30" : ""}
        />
        <StatCard
          title="Due Today"
          value={`₹${summaryCards.dueTodayAmount.toLocaleString()}`}
          icon={<Clock size={20} />}
          deltaType={summaryCards.dueTodayAmount > 0 ? "decrease" : "neutral"}
        />
        <StatCard
          title="Upcoming"
          value={`₹${summaryCards.upcomingAmount.toLocaleString()}`}
          icon={<FileText size={20} />}
          deltaType="neutral"
        />
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by student or invoice #..."
          className="w-full sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            leftIcon={showMobileFilters ? <X size={14} /> : <ChevronDown size={14} />}
          >
            Filters
          </Button>
        </div>
        <div className={`flex-wrap items-center gap-2 ${showMobileFilters ? "flex" : "hidden"} sm:flex`}>
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-32"
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-32"
          />
          <Select
            options={[{ value: "", label: "All Courses" }, ...courseOptions]}
            value={courseFilter}
            onChange={(val) => { setCourseFilter(val); setPage(1); }}
            className="w-40"
            aria-label="Filter by course"
          />
          <FilterBar
            filters={statusFilters}
            active={{ status: statusFilter }}
            onChange={(key, value) => { setStatusFilter(value); setPage(1); }}
            onClear={() => {
              setStatusFilter("");
              setCourseFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : error || invoices.length === 0 ? (
        <EmptyState
          title="No due records found"
          description={search || statusFilter || courseFilter ? "Try adjusting your search or filters" : "Outstanding dues will appear here once invoices are generated."}
        />
      ) : (
        <>
          <div className="hidden sm:block">
            <Table
              columns={columns}
              data={invoices}
              loading={false}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </div>
          <div className="sm:hidden space-y-3">
            {invoices.map((inv) => {
              const { variant, label } = getPriorityBadge(inv.status, inv.dueDate);
              const days = getDaysRemaining(inv.dueDate);
              return (
                <div key={inv.id} className="rounded-[var(--radius-md)] border border-border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{inv.invoiceNumber}</p>
                      <p className="text-xs text-text-secondary">{inv.studentName}</p>
                    </div>
                    <Badge variant={variant} size="sm">{label}</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-secondary">Outstanding</span>
                    <span className={cn("text-base font-bold", inv.dueAmount > 0 ? "text-danger" : "text-success")}>
                      ${inv.dueAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${inv.totalAmount > 0 ? Math.round((inv.paidAmount / inv.totalAmount) * 100) : 0}%`,
                          backgroundColor: "#6366f1",
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary tabular-nums">
                      {inv.totalAmount > 0 ? Math.round((inv.paidAmount / inv.totalAmount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs",
                      days < 0 ? "text-danger font-medium" : days <= 3 ? "text-warning font-medium" : "text-text-secondary",
                    )}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                    </span>
                    <div className="flex items-center gap-1">
                      {inv.dueAmount > 0 && isStudent && (
                        <Button
                          variant="primary"
                          size="xs"
                          leftIcon={payingInvoiceId === inv.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                          onClick={() => handlePayOnline(inv)}
                          disabled={payingInvoiceId === inv.id}
                        >
                          Pay
                        </Button>
                      )}
                      <Button variant="ghost" size="xs" onClick={() => handleDownload(inv)}>
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice #${viewInvoice.invoiceNumber}` : ""}
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setViewInvoice(null)}>
              Close
            </Button>
            {canDownload && viewInvoice && (
              <Button variant="outline" leftIcon={<Download size={14} />} onClick={() => handleDownload(viewInvoice)}>
                Download PDF
              </Button>
            )}
            {viewInvoice && viewInvoice.dueAmount > 0 && isStudent && (
              <Button
                variant="primary"
                leftIcon={payingInvoiceId === viewInvoice.id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                onClick={() => handlePayOnline(viewInvoice)}
                disabled={payingInvoiceId === viewInvoice.id}
              >
                {payingInvoiceId === viewInvoice.id ? "Processing..." : "Pay Online"}
              </Button>
            )}
          </div>
        }
      >
        {viewInvoice && (
          <div className="space-y-6">
            {isOverdue && (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/20 bg-danger/5 px-3 py-2">
                <AlertTriangle size={16} className="text-danger shrink-0" />
                <p className="text-sm font-medium text-danger">
                  {daysRemaining === 0
                    ? "This invoice is due today — pay now to avoid late fees."
                    : `This invoice is ${Math.abs(daysRemaining)} days overdue — please pay immediately.`}
                </p>
              </div>
            )}

            {!isOverdue && daysRemaining > 0 && daysRemaining <= 3 && (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 px-3 py-2">
                <AlertTriangle size={16} className="text-warning shrink-0" />
                <p className="text-sm font-medium text-warning">
                  Due in {daysRemaining} day{daysRemaining > 1 ? "s" : ""} — pay soon to avoid late fees.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-text-secondary">Invoice #</p>
                <p className="text-sm font-semibold text-text-primary">{viewInvoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Status</p>
                <div className="mt-0.5">
                  <Badge variant={getPriorityBadge(viewInvoice.status, viewInvoice.dueDate).variant} size="sm">
                    {getPriorityBadge(viewInvoice.status, viewInvoice.dueDate).label}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Student</p>
                <p className="text-sm text-text-primary">{viewInvoice.studentName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Course</p>
                <p className="text-sm text-text-primary">{viewInvoice.courseName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Fee Plan</p>
                <p className="text-sm text-text-primary">{viewInvoice.feePlanName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Due Date</p>
                <p className="text-sm font-semibold text-text-primary">
                  {new Date(viewInvoice.dueDate).toLocaleDateString()}
                  <span className={cn(
                    "ml-2 text-xs",
                    isOverdue ? "text-danger" : "text-text-secondary",
                  )}>
                    ({isOverdue
                      ? `${Math.abs(daysRemaining)} days overdue`
                      : daysRemaining === 0
                        ? "Due today"
                        : `${daysRemaining} days remaining`})
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] bg-surface-raised p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-text-primary">Payment Progress</span>
                <span className="text-xs text-text-secondary tabular-nums">
                  ${viewInvoice.paidAmount.toLocaleString()} / ${viewInvoice.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-overlay rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${viewInvoice.totalAmount > 0 ? Math.round((viewInvoice.paidAmount / viewInvoice.totalAmount) * 100) : 0}%`,
                    backgroundColor: viewInvoice.paidAmount >= viewInvoice.totalAmount ? "var(--color-success)" : "var(--color-primary)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-secondary">
                <span className="text-success font-medium">Paid: ${viewInvoice.paidAmount.toLocaleString()}</span>
                <span className="text-danger font-medium">Due: ${viewInvoice.dueAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-text-secondary">Total Amount</p>
                <p className="text-sm font-semibold text-text-primary">${viewInvoice.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">Issue Date</p>
                <p className="text-sm text-text-primary">{new Date(viewInvoice.issueDate).toLocaleDateString()}</p>
              </div>
            </div>

            {viewInvoice.notes && (
              <div>
                <p className="text-xs font-medium text-text-secondary">Notes</p>
                <p className="text-sm text-text-primary">{viewInvoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
