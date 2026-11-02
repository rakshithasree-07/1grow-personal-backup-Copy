"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Phone, Target, TrendingUp, UserPlus, Calendar, Clock,
  Activity, ArrowRight, Plus, Sparkles, GraduationCap, UserCheck,
  AlertCircle, PhoneCall, CalendarCheck, Star, XCircle
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Card, CardHeader, CardBody, StatCard, Badge, Skeleton, Avatar } from "@/components/ui";
import { getLeadStats, getLeads, type LeadStats, type Lead } from "@/services/leads";
import { getBranches, type Branch } from "@/services/branches";
import { useRouter } from "next/navigation";
import { useRolePath } from "@/hooks/useRolePrefix";
import { cn } from "@/lib/cn";

const statusConfig: Record<string, { label: string; variant: "info" | "brand" | "warning" | "success" | "danger" | "outline"; color: string }> = {
  NEW: { label: "New", variant: "info", color: "bg-info" },
  CONTACTED: { label: "Contacted", variant: "brand", color: "bg-primary" },
  FOLLOWUP: { label: "Follow Up", variant: "warning", color: "bg-warning" },
  INTERESTED: { label: "Interested", variant: "success", color: "bg-success" },
  DEMO_SCHEDULED: { label: "Demo", variant: "info", color: "bg-info" },
  CONVERTED: { label: "Converted", variant: "success", color: "bg-success" },
  LOST: { label: "Lost", variant: "danger", color: "bg-danger" },
};

const pipelineItems = [
  { key: "new", label: "New", icon: Sparkles, color: "text-info", bg: "bg-info/10" },
  { key: "contacted", label: "Contacted", icon: PhoneCall, color: "text-primary", bg: "bg-primary/10" },
  { key: "followup", label: "Follow Up", icon: CalendarCheck, color: "text-warning", bg: "bg-warning/10" },
  { key: "interested", label: "Interested", icon: Star, color: "text-success", bg: "bg-success/10" },
  { key: "demo", label: "Demo", icon: GraduationCap, color: "text-info", bg: "bg-info/10" },
  { key: "converted", label: "Converted", icon: UserCheck, color: "text-success", bg: "bg-success/10" },
  { key: "lost", label: "Lost", icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
];

export function FoundationDashboardPage() {
  const router = useRouter();
  const rolePath = useRolePath();
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [statsBranchId, setStatsBranchId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        getLeadStats(statsBranchId || undefined),
        getLeads({ page: 1, pageSize: 5, sortBy: "createdAt", sortDir: "desc", branchId: statsBranchId || undefined }),
      ]);
      setStats(statsRes.data);
      setRecentLeads(leadsRes.data ?? []);
    } catch {
      /* API fallback */
    } finally {
      setLoading(false);
    }
  }, [statsBranchId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    getBranches().then((res) => setBranches(res.data ?? [])).catch(() => {});
  }, []);

  const getPipelineValue = (key: string) => {
    switch (key) {
      case "new": return stats?.new ?? 0;
      case "contacted": return stats?.contacted ?? 0;
      case "followup": return stats?.followedUp ?? 0;
      case "interested": return stats?.interested ?? 0;
      case "demo": return stats?.demoScheduled ?? 0;
      case "converted": return stats?.converted ?? 0;
      case "lost": return stats?.lost ?? 0;
      default: return 0;
    }
  };

  return (
    <PageContainer
      title="Foundation Dashboard"
      subtitle="Lead management and admissions overview"
    >
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3 sm:hidden">
        <button
          onClick={() => router.push(rolePath("/leads/follow-ups"))}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised border border-border shadow-lg active:scale-95 transition-transform"
        >
          <Phone size={20} className="text-primary" />
        </button>
        <button
          onClick={() => router.push(rolePath("/leads/create"))}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Branch Filter */}
      {branches.length > 0 && (
        <div className="mb-4 overflow-x-auto pb-2 sm:overflow-visible">
          <div className="flex gap-2 sm:justify-end">
            <select
              value={statsBranchId}
              onChange={(e) => setStatsBranchId(e.target.value)}
              className="h-9 shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />)
        ) : (
          <>
            <StatCard
              title="Total Leads"
              value={stats?.total ?? 0}
              icon={<Target size={18} />}
            />
            <StatCard
              title="Today's Calls"
              value={stats?.todayFollowups ?? 0}
              icon={<Phone size={18} />}
              deltaType={stats?.todayFollowups ? "increase" : "neutral"}
            />
            <StatCard
              title="Conversion"
              value={stats ? `${stats.conversionRate}%` : "0"}
              icon={<TrendingUp size={18} />}
              deltaType={stats && stats.conversionRate > 0 ? "increase" : "neutral"}
            />
            <StatCard
              title="New Leads"
              value={stats?.new ?? 0}
              icon={<UserPlus size={18} />}
              deltaType="increase"
            />
          </>
        )}
      </div>

      {/* Lead Pipeline */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Lead Pipeline</h3>
          <Button variant="ghost" size="xs" onClick={() => router.push(rolePath("/leads"))}>
            View All <ArrowRight size={14} />
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[var(--radius-sm)]" />)}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible">
            {pipelineItems.map((item) => {
              const Icon = item.icon;
              const value = getPipelineValue(item.key);
              return (
                <button
                  key={item.key}
                  className="flex flex-col items-center justify-center p-3 rounded-[var(--radius-md)] bg-surface-raised border border-border hover:border-primary/30 hover:bg-surface-overlay transition-colors min-w-[72px] sm:min-w-0"
                >
                  <div className={cn("flex items-center justify-center w-8 h-8 rounded-full mb-1.5", item.bg)}>
                    <Icon size={16} className={item.color} />
                  </div>
                  <span className="text-lg font-bold text-text-primary tabular-nums">{value}</span>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wide text-center font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Leads */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Activity size={16} className="text-primary" /> <span className="font-semibold">Recent</span> Leads
              </h3>
              <Button variant="ghost" size="xs" onClick={() => router.push(rolePath("/leads"))}>View All</Button>
            </CardHeader>
            <CardBody className="pt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[60px] rounded-[var(--radius-sm)]" />)}
                </div>
              ) : recentLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                  <Target size={32} className="mb-3 text-text-disabled" />
                  <p className="text-sm font-medium">No leads yet</p>
                  <p className="text-xs mt-1 mb-4">Start by adding your first lead</p>
                  <Button size="sm" onClick={() => router.push(rolePath("/leads/create"))}>
                    <Plus size={16} /> Add Lead
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLeads.map((lead) => {
                    const cfg = statusConfig[lead.status];
                    return (
                      <button
                        key={lead.id}
                        onClick={() => router.push(rolePath(`/leads/${lead.id}`))}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-border p-3 hover:bg-surface-overlay transition-colors text-left active:scale-[0.98]"
                      >
                        <Avatar src={null} name={lead.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{lead.name}</p>
                          <p className="text-xs text-text-secondary">{lead.phone}{lead.course ? <><span className="text-text-disabled"> · </span><span className="font-medium">{lead.course}</span></> : ""}</p>
                        </div>
                        <Badge size="sm" variant={cfg?.variant ?? "outline"}>{cfg?.label ?? lead.status}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Today's Follow-ups */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Calendar size={16} className="text-primary" /> <span className="font-semibold">Today&apos;s</span> Follow-ups
              </h3>
            </CardHeader>
            <CardBody className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-[var(--radius-sm)]" />)}
                </div>
              ) : stats?.todayFollowups ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                    <Phone size={24} className="text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{stats.todayFollowups}</p>
                  <p className="text-xs text-text-secondary mb-3">
                    <span className="font-medium">follow-ups</span> scheduled today
                  </p>
                  <Button size="sm" onClick={() => router.push(rolePath("/leads/follow-ups"))} className="w-full">
                    View Schedule
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-text-secondary">
                  <Phone size={24} className="mb-2 text-text-disabled" />
                  <p className="text-sm font-medium">No follow-ups today</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Pending Follow-ups */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Clock size={16} className="text-warning" /> <span className="font-semibold">Pending</span> Follow-ups
              </h3>
            </CardHeader>
            <CardBody className="pt-0">
              {loading ? (
                <Skeleton className="h-16 rounded-[var(--radius-sm)]" />
              ) : (
                <div className="text-center py-4">
                  <p className="text-2xl font-bold text-text-primary">{stats?.pendingFollowups ?? 0}</p>
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium">leads</span> awaiting follow-up
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Actions - Desktop */}
          <Card className="hidden sm:block">
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
            </CardHeader>
            <CardBody className="pt-0 space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => router.push(rolePath("/leads/create"))}>
                <UserPlus size={14} /> Add <span className="font-medium">New</span> Lead
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => router.push(rolePath("/leads/follow-ups"))}>
                <Phone size={14} /> View Follow-ups
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => router.push(rolePath("/leads"))}>
                <Target size={14} /> All Leads
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
