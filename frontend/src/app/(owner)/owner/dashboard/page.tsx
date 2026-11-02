"use client";

import * as React from "react";
import {
  Users, Building2, UserCheck, Clock, BarChart3,
  Target, AlertTriangle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/auth.store";
import { listAccessRequests, type AccessRequest } from "@/services/onboarding";
import {
  getDashboardMetrics, getDashboardAlerts,
  type DashboardMetrics, type DashboardAlerts,
} from "@/services/dashboard";
import { IndustryOverview, MetricCards } from "@/components/dashboard";
import { getBranches } from "@/services/branches";
import type { Branch } from "@/services/branches";
import { useRouter } from "next/navigation";

export default function OwnerDashboard() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = React.useState<AccessRequest[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = React.useState<DashboardAlerts | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchId, setBranchId] = React.useState("");

  React.useEffect(() => {
    getBranches().then((res) => setBranches(res.data ?? [])).catch(() => {});
  }, []);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = branchId ? { branchId } : undefined;
        const [metricsRes, alertsRes, requestsRes] = await Promise.allSettled([
          getDashboardMetrics(params),
          getDashboardAlerts(),
          listAccessRequests("PENDING"),
        ]);

        if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value.data);
        if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value.data);
        if (requestsRes.status === "fulfilled") {
          const data = requestsRes.value.data ?? [];
          setPendingRequests(data.slice(0, 5));
          setPendingCount(data.length);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [branchId]);

  const metricCards = React.useMemo(() => [
    ...(metrics?.metrics ?? []),
    { key: "pendingApprovals", label: "Pending Approvals", value: pendingCount, icon: "user-check" },
  ], [metrics, pendingCount]);

  if (!user) return null;

  return (
    <PageContainer>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Avatar src={null} name={user.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Welcome, {user.name.split(" ")[0]}!</h1>
            <p className="text-sm text-text-secondary mt-0.5">Owner &middot; Here&apos;s your business overview.</p>
          </div>
        </div>
      </div>

      {/* Branch Filter */}
      {branches.length > 0 && (
        <div className="mb-4 flex justify-end">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-9 shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Primary Metrics */}
      <div className="mb-6">
        <MetricCards metrics={metricCards} loading={loading} />
      </div>

      {/* Per-industry Overview */}
      <IndustryOverview basePath="/owner" />

      {/* Alerts Section */}
      {!loading && alerts && (
        (alerts.overdueInvoices.length > 0 || alerts.pendingFollowups.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {alerts.overdueInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle size={16} className="text-danger" />
                    Overdue Payments ({alerts.overdueInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-2">
                    {alerts.overdueInvoices.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{inv.student?.name ?? "Unknown"}</p>
                          <p className="text-xs text-text-secondary">{inv.invoiceNumber} · Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-danger">₹{Number(inv.totalAmount) - Number(inv.paidAmount)}</p>
                          <Badge variant="danger" size="sm">{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
            {alerts.pendingFollowups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-warning" />
                    Pending Follow-ups ({alerts.pendingFollowups.length})
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-2">
                    {alerts.pendingFollowups.slice(0, 5).map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-surface-raised/50 px-2 -mx-2 rounded"
                        onClick={() => router.push(`/owner/leads/${f.id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium">{f.name}</p>
                          <p className="text-xs text-text-secondary">{f.phone} · {f.course || "No course"}</p>
                        </div>
                        <Badge variant="warning" size="sm">{f.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )
      )}

      {/* Access Requests */}
      {pendingCount > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock size={16} className="text-warning" />
                Pending Access Requests ({pendingCount})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/owner/access-requests")}>View All</Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{req.user.name}</p>
                    <p className="text-xs text-text-secondary">{req.user.email} &middot; {req.role}</p>
                  </div>
                  <Badge variant="warning" size="sm">Pending</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Access Requests", icon: <UserCheck size={18} />, href: "/owner/access-requests" },
              { label: "Students", icon: <Users size={18} />, href: "/owner/students" },
              { label: "Leads", icon: <Target size={18} />, href: "/owner/leads" },
              { label: "Branches", icon: <Building2 size={18} />, href: "/owner/organisation" },
              { label: "Reports", icon: <BarChart3 size={18} />, href: "/owner/reports" },
              { label: "Audit Logs", icon: <Users size={18} />, href: "/owner/audit-logs" },
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
