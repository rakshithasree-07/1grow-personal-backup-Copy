"use client";

import * as React from "react";
import { Users, Calendar, BarChart3, UserCheck, Clock } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/auth.store";
import { listAccessRequests, type AccessRequest } from "@/services/onboarding";
import { getDashboardMetrics, type DashboardMetrics } from "@/services/dashboard";
import { IndustryOverview, MetricCards } from "@/components/dashboard";
import { useRouter } from "next/navigation";
import { AccessRestrictedDashboard } from "@/components/shared/AccessRestrictedDashboard";
import { isAccessRestricted } from "@/lib/access-restriction";

function BranchManagerDashboardContent() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = React.useState<AccessRequest[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listAccessRequests("PENDING")
      .then((res) => {
        const data = res.data ?? [];
        setPendingRequests(data.slice(0, 5));
        setPendingCount(data.length);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    getDashboardMetrics()
      .then((res) => setMetrics(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metricCards = React.useMemo(() => [
    ...(metrics?.metrics ?? []),
    { key: "pendingApprovals", label: "Pending Approvals", value: pendingCount, icon: "user-check" },
  ], [metrics, pendingCount]);

  if (!user) return null;

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <PageContainer>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">{initials}</span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Welcome, {user.name.split(" ")[0]}!</h1>
            <p className="text-sm text-text-secondary mt-0.5">Branch Manager &middot; Here&apos;s your branch overview.</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <MetricCards metrics={metricCards} loading={loading} />
      </div>

      <IndustryOverview basePath="/branch-manager" />

      {pendingCount > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Clock size={16} className="text-warning" />Pending Access Requests ({pendingCount})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/branch-manager/access-requests")}>View All</Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{req.user.name}</p>
                    <p className="text-xs text-text-secondary">{req.user.email} · {req.role}</p>
                  </div>
                  <Badge variant="warning" size="sm">Pending</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "Access Requests", icon: <UserCheck size={18} />, href: "/branch-manager/access-requests" },
              { label: "Students", icon: <Users size={18} />, href: "/branch-manager/students" },
              { label: "Schedule", icon: <Calendar size={18} />, href: "/branch-manager/schedules" },
              { label: "Reports", icon: <BarChart3 size={18} />, href: "/branch-manager/reports" },
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

export default function BranchManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  if (isAccessRestricted(user)) {
    return <AccessRestrictedDashboard />;
  }
  return <BranchManagerDashboardContent />;
}
