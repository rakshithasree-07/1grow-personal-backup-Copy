"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, type Column } from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useReport } from "@/hooks/useReports";
import { DateRangePicker, useDefaultDateRange } from "./DateRangePicker";
import { ChartTableToggle } from "./ChartTableToggle";
import { ExportDialog } from "./ExportDialog";
import { REPORT_CATALOG, type ReportType, type ReportViewMode } from "@/types/reports";

interface ReportViewProps {
  basePath: string;
  reportType: ReportType;
}
const COLORS = [
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
  "#8b5cf6",
  "#06b6d4",
];

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-medium text-text-secondary">{label}</p>}
      {payload.map((entry: any) => (
        <p key={entry.name ?? entry.dataKey} className="text-sm font-semibold text-text-primary">
          {entry.name}: <span className="tabular-nums">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
      />
      <CardBody className="relative p-6">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {label}
          </p>
          <div className="rounded-lg bg-surface-overlay p-2 text-text-secondary transition-colors duration-200 group-hover:text-primary">
            {icon}
          </div>
        </div>
        <p className="mt-3 text-4xl font-bold tabular-nums text-text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-secondary">{helper}</p>
      </CardBody>
    </Card>
  );
}

export function ReportView({ basePath, reportType }: ReportViewProps) {
  const router = useRouter();
  const [range, setRange] = useDefaultDateRange();
  const [appliedRange, setAppliedRange] = React.useState(range);
  const [viewMode, setViewMode] = React.useState<ReportViewMode>("table");
  const [exportOpen, setExportOpen] = React.useState(false);

  const meta = REPORT_CATALOG.find((r) => r.type === reportType);
  const { data, loading, error, refetch } = useReport(reportType, appliedRange);

  const columns: Column<any>[] =
    data?.columns?.map((col) => ({
      key: col.key,
      header: col.label,
      render: (row: any) => {
        if (col.key === "status") {
          return (
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                row.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {row.status}
            </span>
          );
        }
        return String(row[col.key] ?? "—");
      },
    })) ?? [];

  const applyRange = () => setAppliedRange(range);

  if (!meta) {
    return (
      <PageContainer title="Report" back={() => router.push(basePath)}>
        <ErrorState code={404} title="Report not found" />
      </PageContainer>
    );
  }

  

        const totalEnrollments = Number(data?.summary?.totalEnrollments ?? 0);

    const activeCount = Number(
      data?.rows?.find((r) => r.status === "ACTIVE")?.count ?? 0
    );

    const cancelledCount = Number(
      data?.rows?.find((r) => r.status === "CANCELLED")?.count ?? 0
    );

    const activeRate =
      totalEnrollments > 0
        ? (activeCount / totalEnrollments) * 100
        : 0;
      const trendData = data?.chart ?? [];

     const pieData = (data?.chart ?? [])
  .map((item: any) => ({
    name: item.label,
    value: Number(item.value) || 0,
  }))
  .filter((item) => item.value > 0);
  return (
    <PageContainer
      title={meta.label}
      subtitle={meta.description}
      back={() => router.push(basePath)}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Button size="sm" leftIcon={<Download size={14} />} onClick={() => setExportOpen(true)}>
            Export
          </Button>
        </div>
      }
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Date range</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4 pt-0">
          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
          <Button size="sm" onClick={applyRange}>
            Apply
          </Button>
        </CardBody>
      </Card>

      {error && !loading && !data ? (
        <ErrorState
          code={500}
          title="Unable to load report"
          description={error}
          action={{ label: "Retry", onClick: refetch }}
        />
      ) : loading ? (
        <Card>
          <CardBody className="pt-5">
            <SkeletonTable rows={8} />
          </CardBody>
        </Card>
      
          ) : (
            <>
              {/* KPI Cards */}
              {data?.summary && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(data.summary).map(([key, value]) => (
                    <KpiCard
                      key={key}
                      label={key.replace(/([A-Z])/g, " $1").trim()}
                      value={String(value)}
                      helper=""
                      icon={<TrendingUp size={18} />}
                      accent="from-primary/10 to-transparent"
                    />
                  ))}
                </div>
              )}

          {/* Analytics section */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{meta.label}</CardTitle>
              </CardHeader>
              <CardBody>
                {trendData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-text-secondary">
                    No trend data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={288}>
                    <BarChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.25)" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        className="text-text-secondary"
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        className="text-text-secondary"
                        width={60}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "rgba(148,163,184,0.12)" }}
                      />
                      <Bar
                      dataKey="value"
                      name="Value"
                      fill="currentColor"
                      className="text-primary"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={56}
                    />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{meta.label} Distribution</CardTitle>
              </CardHeader>
              <CardBody>
                {pieData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-text-secondary">
                    No {meta.label.toLowerCase()} data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={288}>
                    <PieChart>
                    <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={2}
                          label={false}
                          labelLine={false}
                        >
                       {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        formatter={(value: string) => (
                          <span className="text-sm text-text-secondary">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Detailed breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{meta.label} Breakdown</CardTitle>
            </CardHeader>
            <CardBody>
              <Table
                columns={[
                  ...columns.filter((col) => col.key !== "percentage"),
                  {
                    key: "percentage",
                    header: "Percentage",
                    render: (row: any) =>
                      totalEnrollments > 0
                        ? `${((Number(row.count) / totalEnrollments) * 100).toFixed(1)}%`
                        : "—",
                  },
                ]}
                data={(data?.rows ?? []).map((row, i) => ({ ...row, id: i }))}
                loading={loading}
                emptyTitle="No data for this period"
                emptyDescription="Try adjusting the date range."
              />
            </CardBody>
                   </Card>
          </>
        )}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        reportType={reportType}
        queryParams={appliedRange}
      />
    </PageContainer>
  );
}
