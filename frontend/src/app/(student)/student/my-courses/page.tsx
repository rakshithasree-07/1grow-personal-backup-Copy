"use client";

import * as React from "react";
import {
  BookOpen, Calendar, Clock, CreditCard, Loader2, MapPin, FileText, DollarSign,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMyCourses, type MyCourseEnrollment, type MyCourseInvoice } from "@/services/students";
import { paymentService } from "@/services/payment";
import { useAuthStore } from "@/store/auth.store";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getDaysRemaining(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MyCoursesPage() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useBrandTheme();
  const [enrollments, setEnrollments] = React.useState<MyCourseEnrollment[]>([]);
  const [invoices, setInvoices] = React.useState<MyCourseInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await getMyCourses();
      setEnrollments(res.data.enrollments);
      setInvoices(res.data.invoices);
    } catch {
      setError("Failed to load courses");
      toast.error("Failed to load course data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handlePayInvoice = async (invoice: MyCourseInvoice) => {
    if (!user) return;
    setPayingInvoiceId(invoice.id);
    try {
      const result = await paymentService.payWithRazorpay(
        {
          invoiceId: invoice.id,
          paymentType: "STUDENT_FEE",
          description: `Payment for ${invoice.invoiceNumber}`,
        },
        {
          name: user.name ?? "Student",
          description: `${invoice.invoiceNumber}`,
          prefill: { name: user.name, email: user.email ?? undefined },
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
      setPayingInvoiceId(null);
    }
  };

  const dueAmount = invoices.reduce((s, inv) => s + inv.dueAmount, 0);
  const overdueCount = invoices.filter((inv) => inv.isOverdue).length;

  if (error) {
    return (
      <PageContainer title="My Courses" subtitle="Your enrolled courses">
        <EmptyState
          variant="no-data"
          title="Failed to load courses"
          description={error}
          action={{ label: "Retry", onClick: fetchData }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Courses" subtitle="Your enrolled courses and batches" className="max-w-3xl">
      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <DollarSign size={16} className="text-danger" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">
              {overdueCount} invoice{overdueCount > 1 ? "s" : ""} overdue
            </p>
            <p className="mt-0.5 text-xs text-danger/80">
              ₹${dueAmount.toLocaleString()} outstanding — pay immediately to avoid late fees.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton className="mb-3 h-5 w-48" />
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <EmptyState
          variant="no-data"
          title="No courses yet"
          description="You are not enrolled in any courses."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {enrollments.map((enr) => {
            const relatedInvoices = invoices.filter(
              (inv) => inv.invoiceNumber.toLowerCase().includes(enr.courseName.toLowerCase().slice(0, 8)),
            );
            const courseInvoices = relatedInvoices.length > 0 ? relatedInvoices : [];
            const courseDue = courseInvoices.reduce((s, i) => s + i.dueAmount, 0);
            const coursePaid = courseInvoices.reduce((s, i) => s + i.paidAmount, 0);
            const courseOverdue = courseInvoices.some((i) => i.isOverdue);
            const upcomings = enr.upcomingSessions;

            return (
              <Card key={enr.id} variant="elevated" className="flex flex-col">
                <CardBody className="flex flex-1 flex-col gap-4">
                  {/* Course header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
                        <BookOpen size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-text-primary truncate">{enr.courseName}</h3>
                        <p className="text-sm text-text-secondary truncate">{enr.batchName}</p>
                        {enr.courseCode && (
                          <p className="text-xs text-text-disabled">{enr.courseCode}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="success" size="sm" className="shrink-0">Active</Badge>
                  </div>

                  {/* Fee */}
                  {enr.feePlanId && (
                    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-surface-raised px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{enr.feePlanName}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-text-secondary">₹${enr.feePlanAmount.toLocaleString()}</span>
                          {coursePaid > 0 && <span className="text-success">₹${coursePaid.toLocaleString()} paid</span>}
                          {courseDue > 0 && (
                            <span className={cn(courseOverdue ? "text-danger" : "text-warning")}>
                              ₹${courseDue.toLocaleString()} due
                            </span>
                          )}
                        </div>
                      </div>
                      {courseInvoices.some((i) => i.dueAmount > 0) && (
                        <Button
                          variant={courseOverdue ? "danger" : "primary"}
                          size="xs"
                          leftIcon={payingInvoiceId === courseInvoices.find((i) => i.dueAmount > 0)?.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                          onClick={() => {
                            const inv = courseInvoices.find((i) => i.dueAmount > 0);
                            if (inv) handlePayInvoice(inv);
                          }}
                          disabled={payingInvoiceId === courseInvoices.find((i) => i.dueAmount > 0)?.id}
                          className="shrink-0"
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Upcoming sessions */}
                  {upcomings.length > 0 && (
                    <div className="flex-1">
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        <Calendar size={14} />
                        Upcoming Sessions
                      </h4>
                      <div className="space-y-1.5">
                        {upcomings.slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border-subtle px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Clock size={13} className="text-text-secondary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-text-primary">{formatDate(s.date)}</p>
                                <p className="text-xs text-text-secondary">
                                  {formatTime(s.startTime)} - {formatTime(s.endTime)}
                                </p>
                              </div>
                            </div>
                            {s.topic && <Badge variant="info" size="sm" className="shrink-0">{s.topic}</Badge>}
                          </div>
                        ))}
                        {upcomings.length > 3 && (
                          <p className="text-xs text-text-secondary text-center pt-1">+{upcomings.length - 3} more session(s)</p>
                        )}
                      </div>
                    </div>
                  )}

                  {upcomings.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-text-disabled">
                      <Calendar size={14} />
                      No upcoming sessions
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
