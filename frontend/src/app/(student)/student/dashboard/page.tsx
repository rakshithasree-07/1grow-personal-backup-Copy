"use client";

import * as React from "react";
import { BookOpen, Calendar, Award, CreditCard, AlertTriangle, DollarSign, ExternalLink, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/ui/Card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui";
import { useAuthStore } from "@/store/auth.store";
import { AccessStatusBanner } from "@/components/shared/AccessStatusBanner";
import { useRouter } from "next/navigation";
import { getStudentDashboard, type StudentDashboardData } from "@/services/dashboard";
import { paymentService } from "@/services/payment";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { toast } from "sonner";

import { AccessRestrictedDashboard } from "@/components/shared/AccessRestrictedDashboard";
import { isAccessRestricted } from "@/lib/access-restriction";

function StudentDashboardContent() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useBrandTheme();
  const router = useRouter();
  const [data, setData] = React.useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = React.useState<string | null>(null);
  const [payingEnrollmentId, setPayingEnrollmentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    setLoading(true);
    getStudentDashboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handlePayOnline = async (invoiceId: string, invoiceNumber: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      await paymentService.payWithRazorpay(
        {
          invoiceId,
          paymentType: "STUDENT_FEE",
          description: `Payment for ${invoiceNumber}`,
        },
        {
          name: user?.name ?? "Student",
          description: `${invoiceNumber}`,
          prefill: { name: user?.name, email: user?.email ?? undefined },
          themeColor: primaryColor ?? "#6366f1",
        },
      );
      toast.success("Payment successful!");
      const res = await getStudentDashboard();
      setData(res.data);
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

  const handlePayEnrollmentFee = async (enrollmentId: string, courseName: string, batchName: string) => {
    setPayingEnrollmentId(enrollmentId);
    try {
      await paymentService.payWithRazorpay(
        {
          enrollmentId,
          paymentType: "STUDENT_FEE",
          description: `Fee for ${courseName} - ${batchName}`,
        },
        {
          name: user?.name ?? "Student",
          description: `${courseName} - ${batchName}`,
          prefill: { name: user?.name, email: user?.email ?? undefined },
          themeColor: primaryColor ?? "#6366f1",
        },
      );
      toast.success("Payment successful!");
      const res = await getStudentDashboard();
      setData(res.data);
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

  if (!user) return null;

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const totalDue = (data?.upcomingBills ?? []).reduce((s, b) => s + b.dueAmount, 0)
    + (data?.overdueBills ?? []).reduce((s, b) => s + b.dueAmount, 0);
  const totalPaid = (data?.paidBills ?? []).reduce((s, b) => s + b.paidAmount, 0);

  return (
    <PageContainer>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">{initials}</span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Welcome, {user.name.split(" ")[0]}!</h1>
            <p className="text-sm text-text-secondary mt-0.5">Student &middot; Here&apos;s your learning and billing overview.</p>
          </div>
        </div>
      </div>

      <AccessStatusBanner />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Enrolled Courses" value={data?.enrolledCourses ?? 0} icon={<BookOpen size={20} />} />
            <StatCard title="Invoices" value={data?.totalInvoices ?? 0} icon={<DollarSign size={20} />} />
            <StatCard
              title="Total Paid"
              value={`₹${totalPaid.toLocaleString()}`}
              icon={<CreditCard size={20} />}
              deltaType="increase"
            />
            <StatCard
              title="Due Amount"
              value={`₹${totalDue.toLocaleString()}`}
              icon={<AlertTriangle size={20} />}
              deltaType={totalDue > 0 ? "decrease" : "increase"}
            />
          </div>

          {/* Overdue Warning */}
          {data && data.overdueBills.length > 0 && (
            <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/20 bg-danger/5 px-4 py-3">
              <AlertTriangle size={18} className="text-danger shrink-0" />
              <p className="text-sm font-medium text-danger">
                {data.overdueBills.length} overdue bill{data.overdueBills.length > 1 ? "s" : ""} —
                ₹${data.overdueBills.reduce((s, b) => s + b.dueAmount, 0).toLocaleString()} outstanding.
                {" "}Pay now to avoid late fees.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Upcoming Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={16} />
                  Upcoming Bills
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                {data && data.upcomingBills.length > 0 ? (
                  <div className="space-y-3">
                    {data.upcomingBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border p-3">
                        <div>
                          <p className="text-sm font-medium">{bill.invoiceNumber}</p>
                          <p className="text-xs text-text-secondary">Due: {new Date(bill.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">₹${bill.dueAmount.toLocaleString()}</p>
                          <Button
                            size="xs"
                            variant="primary"
                            leftIcon={payingInvoiceId === bill.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                            onClick={() => handlePayOnline(bill.id, bill.invoiceNumber)}
                            disabled={payingInvoiceId === bill.id}
                          >
                            {payingInvoiceId === bill.id ? "..." : "Pay"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-text-secondary text-center">No upcoming bills</p>
                )}
                {data && data.totalInvoices > 0 && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => router.push("/student/fees")}>
                    <ExternalLink size={14} /> View All Invoices
                  </Button>
                )}
              </CardBody>
            </Card>

            {/* Overdue Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-danger" />
                  Overdue Bills
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                {data && data.overdueBills.length > 0 ? (
                  <div className="space-y-3">
                    {data.overdueBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-danger/20 bg-danger/5 p-3">
                        <div>
                          <p className="text-sm font-medium text-danger">{bill.invoiceNumber}</p>
                          <p className="text-xs text-danger/80">
                            {Math.ceil((new Date().getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24))}d overdue
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-danger">₹${bill.dueAmount.toLocaleString()}</p>
                          <Button
                            size="xs"
                            variant="danger"
                            leftIcon={payingInvoiceId === bill.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                            onClick={() => handlePayOnline(bill.id, bill.invoiceNumber)}
                            disabled={payingInvoiceId === bill.id}
                          >
                            {payingInvoiceId === bill.id ? "..." : "Pay Now"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-text-secondary text-center">No overdue bills</p>
                )}
                {data && data.totalInvoices > 0 && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => router.push("/student/fees")}>
                    <ExternalLink size={14} /> Manage Fees
                  </Button>
                )}
              </CardBody>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={16} className="text-success" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                {data && data.recentPayments.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{p.invoiceNumber || "Payment"}</p>
                          <p className="text-xs text-text-secondary">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="success" size="sm">₹${p.amount.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-text-secondary text-center">No payments yet</p>
                )}
              </CardBody>
            </Card>

            {/* My Enrollments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={16} />
                  My Enrollments
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                {data && data.enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {data.enrollments.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.courseName}</p>
                          <p className="text-xs text-text-secondary">{e.batchName}{e.feePlanName ? ` · ${e.feePlanName}` : ""}</p>
                        </div>
                        {(e.feePlanAmount ?? 0) > 0 && (
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-sm font-semibold text-text-primary">
                              ₹{e.feePlanAmount!.toLocaleString()}
                            </span>
                            <Button size="xs" variant="outline" onClick={() => handlePayEnrollmentFee(e.id, e.courseName, e.batchName)} disabled={payingEnrollmentId === e.id}>
                              {payingEnrollmentId === e.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                              {payingEnrollmentId === e.id ? "..." : "Pay"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-text-secondary text-center">Not enrolled in any courses</p>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "My Courses", icon: <BookOpen size={18} />, href: "/student/my-courses" },
              { label: "Fees", icon: <CreditCard size={18} />, href: "/student/fees" },
              { label: "Schedule", icon: <Calendar size={18} />, href: "/student/attendance" },
              { label: "Progress", icon: <Award size={18} />, href: "/student/progress" },
            ].map((a) => (
              <Button key={a.label} variant="outline" className="justify-start gap-2.5 h-auto py-3 px-3" onClick={() => router.push(a.href)}>
                <span className="shrink-0">{a.icon}</span>
                {a.label}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  if (isAccessRestricted(user)) {
    return <AccessRestrictedDashboard />;
  }
  return <StudentDashboardContent />;
}
