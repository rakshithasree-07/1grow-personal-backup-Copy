"use client";

import * as React from "react";
import {
  Download, CreditCard, Loader2, AlertTriangle, FileText, DollarSign, Wallet,
  Clock, CalendarClock, Ban, BookOpen,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/ui/Card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InvoiceStatusBadge, PaymentStatusBadge } from "@/features/finance/components/StatusBadge";
import { getInvoices, type Invoice } from "@/services/finance";
import { getPayments, type Payment } from "@/services/finance";
import { getEnrollments, type Enrollment } from "@/services/enrollments";
import { paymentService } from "@/services/payment";
import { useAuthStore } from "@/store/auth.store";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { downloadInvoicePdf, type InvoicePdfData } from "@/utils/invoice-pdf";

function getDaysRemaining(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getOverdueStatus(
  dueDate: string, status: string,
): "overdue" | "due-soon" | "upcoming" | "paid" | null {
  if (status === "paid" || status === "PAID") return "paid";
  const days = getDaysRemaining(dueDate);
  if (days < 0) return "overdue";
  if (days <= 3) return "due-soon";
  if (days <= 7) return "upcoming";
  return null;
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudentFeesPage() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useBrandTheme();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const [payingEnrollmentId, setPayingEnrollmentId] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [invRes, payRes, enrRes] = await Promise.all([
        getInvoices({ studentId: user.id, pageSize: 50 }),
        getPayments({ studentId: user.id, pageSize: 50 }),
        getEnrollments({ studentId: user.id, status: "active", pageSize: 50 }),
      ]);
      setInvoices(invRes.data.items ?? []);
      setPayments(payRes.data.items ?? []);
      setEnrollments(enrRes.data.items ?? []);
    } catch {
      toast.error("Failed to load fee data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handlePayOnline = async (invoice: Invoice) => {
    setPayingId(invoice.id);
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
      toast.success(`Payment successful! Transaction: ${result.transaction.razorpayPaymentId}`);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Payment cancelled by user") {
        toast.info("Payment cancelled");
      } else {
        toast.error(err instanceof Error ? err.message : "Payment failed");
      }
    } finally {
      setPayingId(null);
    }
  };

  const handlePayEnrollmentFee = async (enrollment: Enrollment) => {
    setPayingEnrollmentId(enrollment.id);
    try {
      const result = await paymentService.payWithRazorpay(
        {
          enrollmentId: enrollment.id,
          paymentType: "STUDENT_FEE",
          description: `Fee for ${enrollment.courseName} - ${enrollment.batchName}`,
        },
        {
          name: user?.name ?? "Student",
          description: `${enrollment.courseName} - ${enrollment.batchName}`,
          prefill: {
            name: user?.name,
            email: user?.email ?? undefined,
          },
          themeColor: primaryColor ?? "#6366f1",
        },
      );
      toast.success(`Payment successful! Transaction: ${result.transaction.razorpayPaymentId}`);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Payment cancelled by user") {
        toast.info("Payment cancelled");
      } else {
        toast.error(err instanceof Error ? err.message : "Payment failed");
      }
    } finally {
      setPayingEnrollmentId(null);
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
      };
      downloadInvoicePdf(pdfData, `invoice-${invoice.invoiceNumber}.pdf`);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  // Show all active enrollments with fee plans
  const enrollmentsNeedingPayment = enrollments.filter(
    (e) => (e.feePlanAmount ?? 0) > 0,
  );

  const totalDueEnrollments = enrollmentsNeedingPayment.reduce((s, e) => s + (e.feePlanAmount ?? 0), 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.dueAmount, 0) + totalDueEnrollments;
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const overdueCount = invoices.filter(
    (i) => getOverdueStatus(i.dueDate, i.status) === "overdue",
  ).length;
  const dueSoonCount = invoices.filter(
    (i) => getOverdueStatus(i.dueDate, i.status) === "due-soon",
  ).length;
  const overdueAmount = invoices
    .filter((i) => getOverdueStatus(i.dueDate, i.status) === "overdue")
    .reduce((s, i) => s + i.dueAmount, 0);

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (row) => (
        <span className="font-medium">{row.invoiceNumber}</span>
      ),
    },
    { key: "courseName", header: "Course" },
    {
      key: "dueDate",
      header: "Due Date",
      render: (row) => {
        const alert = getOverdueStatus(row.dueDate, row.status);
        const days = getDaysRemaining(row.dueDate);
        return (
          <div className="flex flex-col">
            <span className={cn(
              "text-sm",
              alert === "overdue" ? "text-danger" : alert === "due-soon" ? "text-warning" : "text-text-primary",
            )}>
              {formatDueDate(row.dueDate)}
            </span>
            {row.dueAmount > 0 && alert !== "paid" && (
              <span className={cn(
                "text-xs",
                alert === "overdue" ? "text-danger" : alert === "due-soon" ? "text-warning" : "text-text-secondary",
              )}>
                {alert === "overdue" ? `${Math.abs(days)} days overdue` : `${days} days left`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (row) => (
        <span className="font-medium tabular-nums">₹{row.totalAmount.toLocaleString()}</span>
      ),
    },
    {
      key: "dueAmount",
      header: "Due",
      render: (row) => {
        const alert = getOverdueStatus(row.dueDate, row.status);
        return (
          <div className="flex items-center gap-1.5">
            {alert === "overdue" && <AlertTriangle size={12} className="text-danger shrink-0" />}
            {alert === "due-soon" && <AlertTriangle size={12} className="text-warning shrink-0" />}
            <span className={cn(
              "font-medium tabular-nums",
              alert === "overdue" ? "text-danger" : alert === "due-soon" ? "text-warning" : row.dueAmount > 0 ? "text-text-primary" : "text-success",
            )}>
              ₹{row.dueAmount.toLocaleString()}
            </span>
          </div>
        );
      },
    },
    {
      key: "overdue",
      header: "Status",
      render: (row) => {
        const alert = getOverdueStatus(row.dueDate, row.status);
        if (alert === "overdue") return <Badge variant="danger" size="sm">Overdue</Badge>;
        if (alert === "due-soon") return <Badge variant="warning" size="sm">Due Soon</Badge>;
        if (alert === "upcoming") return <Badge variant="info" size="sm">Upcoming</Badge>;
        if (row.status === "partial") return <Badge variant="warning" size="sm">Partial</Badge>;
        if (row.status === "paid") return <Badge variant="success" size="sm">Paid</Badge>;
        return <Badge variant="info" size="sm">Pending</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => {
        const alert = getOverdueStatus(row.dueDate, row.status);
        return (
          <div className="flex items-center gap-1">
            {row.dueAmount > 0 && (
              <Button
                variant={alert === "overdue" ? "danger" : "primary"}
                size="xs"
                className={alert === "due-soon" ? "bg-warning text-white hover:bg-warning/90" : ""}
                leftIcon={payingId === row.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                onClick={() => handlePayOnline(row)}
                disabled={payingId === row.id}
              >
                {payingId === row.id ? "Processing..." : "Pay Now"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDownload(row)}
              disabled={downloadingId === row.id}
              title="Download Invoice"
            >
              {downloadingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </Button>
          </div>
        );
      },
    },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "receiptNumber", header: "Receipt #" },
    { key: "invoiceNumber", header: "Invoice" },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className="font-medium tabular-nums">₹{row.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row) => {
        const labels: Record<string, string> = {
          cash: "Cash", card: "Card",
          bank_transfer: "Bank Transfer", cheque: "Cheque", online: "Online",
        };
        return labels[row.paymentMethod] ?? row.paymentMethod;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <PaymentStatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"),
    },
  ];

  return (
    <PageContainer title="Fees" subtitle="Your fee schedule, dues, and payment history">
      {/* Overdue warning banner */}
      {overdueCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <AlertTriangle size={16} className="text-danger" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">
              {overdueCount} invoice{overdueCount > 1 ? "s" : ""} overdue
            </p>
            <p className="mt-0.5 text-xs text-danger/80">
              ${overdueAmount.toLocaleString()} outstanding — pay immediately to avoid late fees and service disruption.
            </p>
          </div>
          <Button
            variant="danger"
            size="xs"
            onClick={() => {
              const overdue = invoices.filter(
                (i) => getOverdueStatus(i.dueDate, i.status) === "overdue",
              );
              if (overdue.length > 0) handlePayOnline(overdue[0]);
            }}
          >
            Pay Overdue
          </Button>
        </div>
      )}

      {/* Due-soon warning banner */}
      {overdueCount === 0 && dueSoonCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <Clock size={16} className="text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning">
              {dueSoonCount} invoice{dueSoonCount > 1 ? "s" : ""} due soon
            </p>
            <p className="mt-0.5 text-xs text-warning/80">
              Payment deadline is approaching. Pay now to avoid overdue status.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Paid"
          value={`₹${totalPaid.toLocaleString()}`}
          icon={<Wallet size={20} />}
          deltaType="increase"
        />
        <StatCard
          title="Total Due"
          value={`₹${totalDue.toLocaleString()}`}
          icon={<FileText size={20} />}
          deltaType={totalDue > 0 ? "decrease" : "increase"}
          className={totalDue > 0 ? "border-warning/30" : ""}
        />
        <StatCard
          title="Active Enrollments"
          value={enrollments.length}
          icon={<BookOpen size={20} />}
        />
      </div>

      {/* Enrollment Fee Cards — pay full fee before invoice exists */}
      {enrollmentsNeedingPayment.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen size={16} />
                Program Fees
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="hidden sm:block">
                <Table
                  columns={[
                    { key: "courseName", header: "Course", render: (row: Enrollment) => <span className="font-medium">{row.courseName}</span> },
                    { key: "batchName", header: "Batch", render: (row: Enrollment) => <span className="text-text-secondary">{row.batchName}</span> },
                    { key: "feePlanName", header: "Plan", render: (row: Enrollment) => row.feePlanName ?? "—" },
                    { key: "feePlanAmount", header: "Total Fee", render: (row: Enrollment) => <span className="font-medium tabular-nums">₹{(row.feePlanAmount ?? 0).toLocaleString()}</span> },
                    {
                      key: "actions", header: "", className: "text-right",
                      render: (row: Enrollment) => (
                        <Button
                          variant="primary"
                          size="xs"
                          leftIcon={payingEnrollmentId === row.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                          onClick={() => handlePayEnrollmentFee(row)}
                          disabled={payingEnrollmentId === row.id}
                        >
                          {payingEnrollmentId === row.id ? "Processing..." : "Pay Full Fee"}
                        </Button>
                      ),
                    },
                  ] as Column<Enrollment>[]
                }
                  data={enrollmentsNeedingPayment}
                  loading={false}
                />
              </div>
              <div className="space-y-3 sm:hidden">
                {enrollmentsNeedingPayment.map((enr) => (
                  <div key={enr.id} className="rounded-[var(--radius-md)] border border-border p-4">
                    <div className="mb-2">
                      <p className="font-semibold">{enr.courseName}</p>
                      <p className="text-xs text-text-secondary">{enr.batchName}{enr.feePlanName ? ` · ${enr.feePlanName}` : ""}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold tabular-nums">₹{(enr.feePlanAmount ?? 0).toLocaleString()}</span>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={payingEnrollmentId === enr.id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        onClick={() => handlePayEnrollmentFee(enr)}
                        disabled={payingEnrollmentId === enr.id}
                      >
                        Pay
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Invoices Section */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {loading ? (
              <SkeletonTable rows={3} />
            ) : invoices.length === 0 ? (
              <EmptyState title="No invoices" description="You don't have any invoices yet." />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table columns={invoiceColumns} data={invoices} loading={false} />
                </div>
                <div className="space-y-3 sm:hidden">
                  {invoices.map((inv) => {
                    const alert = getOverdueStatus(inv.dueDate, inv.status);
                    return (
                      <div
                        key={inv.id}
                        className={cn(
                          "rounded-[var(--radius-md)] border p-4",
                          alert === "overdue" ? "border-danger/20 bg-danger/[0.02]" :
                          alert === "due-soon" ? "border-warning/20 bg-warning/[0.02]" :
                          "border-border",
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold">{inv.invoiceNumber}</span>
                          {alert === "overdue" && <Badge variant="danger" size="sm">Overdue</Badge>}
                          {alert === "due-soon" && <Badge variant="warning" size="sm">Due Soon</Badge>}
                          {inv.status === "paid" && <Badge variant="success" size="sm">Paid</Badge>}
                        </div>
                        <p className="text-xs text-text-secondary">{inv.courseName}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold tabular-nums">₹{inv.dueAmount.toLocaleString()}</p>
                            <p className={cn(
                              "text-xs",
                              alert === "overdue" ? "text-danger" :
                              alert === "due-soon" ? "text-warning" : "text-text-secondary",
                            )}>
                              {alert === "overdue"
                                ? `${Math.abs(getDaysRemaining(inv.dueDate))} days overdue`
                                : `Due ${formatDueDate(inv.dueDate)}`}
                            </p>
                          </div>
                          {inv.dueAmount > 0 && (
                            <Button
                              variant={alert === "overdue" ? "danger" : "primary"}
                              size="sm"
                              leftIcon={payingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                              onClick={() => handlePayOnline(inv)}
                              disabled={payingId === inv.id}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Payment History Section */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {loading ? (
              <SkeletonTable rows={3} />
            ) : payments.length === 0 ? (
              <EmptyState title="No payments" description="You haven't made any payments yet." />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table columns={paymentColumns} data={payments} loading={false} />
                </div>
                <div className="space-y-3 sm:hidden">
                  {payments.map((pmt) => (
                    <div key={pmt.id} className="rounded-[var(--radius-md)] border border-border p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold">{pmt.receiptNumber}</span>
                        <PaymentStatusBadge status={pmt.status} />
                      </div>
                      <p className="text-xs text-text-secondary">{pmt.invoiceNumber}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold tabular-nums">${pmt.amount.toLocaleString()}</span>
                        <span className="text-xs text-text-secondary">
                          {new Date(pmt.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
