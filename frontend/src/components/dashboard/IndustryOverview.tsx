"use client";

import * as React from "react";
import { GraduationCap, Package, CalendarDays, Target } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui";
import {
  getDashboardIndustry,
  type DashboardIndustry,
} from "@/services/dashboard";
import { INDUSTRY_LABELS } from "@/lib/industries";
import { useRouter } from "next/navigation";

function formatCurrency(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-surface-raised px-3 py-2">
      <p className="text-base font-bold text-text-primary leading-tight">{value}</p>
      <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

export function IndustryOverview({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<DashboardIndustry | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getDashboardIndustry()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const industries = data?.industries ?? [];
  const perIndustry = data?.byIndustry ?? {};
  const leads = data?.leads;
  const hasData = Object.keys(perIndustry).length > 0;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-text-primary">Business Overview</h2>
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {industries.map((ind) => (
              <Badge key={ind} variant="brand" size="sm">
                {INDUSTRY_LABELS[ind as keyof typeof INDUSTRY_LABELS] ?? ind}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[var(--radius-md)]" />)}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {perIndustry.TRAINING && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GraduationCap size={16} className="text-primary" />
                  Training
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Students" value={perIndustry.TRAINING.students ?? 0} />
                  <MiniStat label="Active Batches" value={perIndustry.TRAINING.activeBatches ?? 0} />
                  <MiniStat label="Enrollments" value={perIndustry.TRAINING.totalEnrollments ?? 0} />
                  <MiniStat label="New This Month" value={perIndustry.TRAINING.newStudentsThisMonth ?? 0} />
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => router.push(`${basePath}/training/programs`)}>
                  View Training
                </Button>
              </CardBody>
            </Card>
          )}

          {perIndustry.RENTAL && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package size={16} className="text-info" />
                  Rental
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Total Bookings" value={perIndustry.RENTAL.totalBookings ?? 0} />
                  <MiniStat label="Active Bookings" value={perIndustry.RENTAL.activeBookings ?? 0} />
                  <MiniStat label="Inventory Items" value={perIndustry.RENTAL.totalItems ?? 0} />
                  <MiniStat label="Pending Returns" value={perIndustry.RENTAL.pendingReturns ?? 0} />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2">
                  <span className="text-xs text-text-secondary">Revenue (MTD)</span>
                  <span className="text-sm font-bold text-text-primary">{formatCurrency(perIndustry.RENTAL.revenueMTD ?? 0)}</span>
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => router.push(`${basePath}/rental/bookings`)}>
                  View Rental
                </Button>
              </CardBody>
            </Card>
          )}

          {perIndustry.EVENT && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays size={16} className="text-warning" />
                  Events
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Total Events" value={perIndustry.EVENT.totalEvents ?? 0} />
                  <MiniStat label="Upcoming" value={perIndustry.EVENT.upcomingEvents ?? 0} />
                  <MiniStat label="Revenue (MTD)" value={formatCurrency(perIndustry.EVENT.revenueMTD ?? 0)} />
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => router.push(`${basePath}/events`)}>
                  View Events
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      ) : null}

      {data && leads && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target size={16} className="text-info" />
              Leads & Sales
            </CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat label="Total Leads" value={leads.totalLeads ?? 0} />
              <MiniStat label="Converted" value={leads.convertedLeads ?? 0} />
              <MiniStat label="New This Month" value={leads.newLeadsThisMonth ?? 0} />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
