"use client";

import * as React from "react";
import { Download, RefreshCw, Clock } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { securityService, type ActivityLogItem, downloadBlob } from "@/services/security.service";
import { toast } from "sonner";

export default function ActivityLogsPage() {
  const [logs, setLogs] = React.useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await securityService.listActivityLogs({
        page, pageSize,
        search: search || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setLogs(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch { toast.error("Failed to load activity logs"); }
    finally { setLoading(false); }
  }, [page, pageSize, search, dateFrom, dateTo]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    try {
      const blob = await securityService.exportActivityLogsCsv({
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      downloadBlob(blob, `activity_logs_${Date.now()}.csv`);
      toast.success("Export downloaded");
    } catch { toast.error("Failed to export"); }
  };

  const columns: Column<ActivityLogItem>[] = [
    {
      key: "user",
      header: "User",
      render: (r) => r.user ? (
        <div>
          <p className="text-sm font-medium">{r.user.name}</p>
          <p className="text-xs text-text-secondary">{r.user.email}</p>
        </div>
      ) : <span className="text-text-secondary">System</span>,
    },
    {
      key: "activity",
      header: "Activity",
      render: (r) => (
        <span className="font-medium text-sm">{r.activity}</span>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (r) => r.details ? (
        <span className="text-xs text-text-secondary font-mono truncate max-w-48 block">
          {JSON.stringify(r.details)}
        </span>
      ) : "—",
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (r) => r.ipAddress ? <span className="font-mono text-xs">{r.ipAddress}</span> : "—",
    },
    {
      key: "createdAt",
      header: "Time",
      render: (r) => (
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <Clock size={12} />
          {new Date(r.createdAt).toLocaleString()}
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Activity Logs" subtitle="View all user actions and operations across the platform.">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activities</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleExport} leftIcon={<Download size={14} />}>Export CSV</Button>
              <Button variant="ghost" size="sm" onClick={fetchData} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <SearchBar value={search} onChange={setSearch} placeholder="Search activity, user…" className="max-w-sm" />
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-8 px-2 text-sm border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-8 px-2 text-sm border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary" />
          </div>
          <Table columns={columns} data={logs} loading={loading}
            emptyTitle="No activity logs"
            emptyDescription="Activity logs will appear here as users perform actions." />
          <div className="mt-4">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
