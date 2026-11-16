"use client";

import * as React from "react";
import { 
  Download, RefreshCw, Clock, ChevronDown, ChevronUp, 
  ShieldCheck, Activity, Calendar, Search, Eye, ChevronLeft, ChevronRight, Check 
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { securityService, type AuditLogItem, type AuditLogStats, downloadBlob } from "@/services/security.service";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

const ACTION_COLORS: Record<string, "info" | "success" | "danger" | "warning" | "default"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "info",
  LOGOUT: "warning",
  SESSION_REVOKE: "danger",
  PASSWORD_CHANGE: "warning",
  ROLE_CHANGE: "warning",
  STATUS_CHANGE: "warning",
  PERMISSION_CHANGE: "info",
  SECURITY_EVENT: "danger",
  SETTINGS_CHANGE: "info",
  WEBHOOK_CHANGE: "warning",
  API_KEY_CHANGE: "warning",
  INVITATION: "info",
  SUBSCRIPTION_CHANGE: "info",
  BILLING_CHANGE: "warning",
  DATA_EXPORT: "warning",
  ACCOUNT_LOCK: "danger",
  ACCOUNT_UNLOCK: "success",
  EXPORT: "info",
  IMPORT: "info",
  TWO_FACTOR_ENABLE: "success",
  TWO_FACTOR_DISABLE: "danger",
};

const ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "SESSION_REVOKE", label: "Session Revoke" },
  { value: "PASSWORD_CHANGE", label: "Password Change" },
  { value: "ROLE_CHANGE", label: "Role Change" },
  { value: "STATUS_CHANGE", label: "Status Change" },
  { value: "PERMISSION_CHANGE", label: "Permission Change" },
  { value: "SETTINGS_CHANGE", label: "Settings Change" },
  { value: "API_KEY_CHANGE", label: "API Key Change" },
  { value: "SUBSCRIPTION_CHANGE", label: "Subscription Change" },
  { value: "BILLING_CHANGE", label: "Billing Change" },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─── Apple Glass Single-Calendar Range Picker Component ───────────────────── */

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (date: string) => void;
  onChangeTo: (date: string) => void;
}

function DateRangePicker({ dateFrom, dateTo, onChangeFrom, onChangeTo }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const parsedFrom = dateFrom ? new Date(dateFrom) : new Date();
  const [viewYear, setViewYear] = React.useState(parsedFrom.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(parsedFrom.getMonth());

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const formatted = `${viewYear}-${mm}-${dd}`;

    if (!dateFrom || (dateFrom && dateTo)) {
      onChangeFrom(formatted);
      onChangeTo("");
    } else if (dateFrom && !dateTo) {
      if (new Date(formatted) < new Date(dateFrom)) {
        onChangeFrom(formatted);
      } else {
        onChangeTo(formatted);
        setIsOpen(false);
      }
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const displayText = dateFrom || dateTo 
    ? `${dateFrom ? formatDate(dateFrom) : "Start"} — ${dateTo ? formatDate(dateTo) : "End"}`
    : "Select date range";

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3.5 text-xs bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-white/20 dark:border-gray-700/60 rounded-2xl text-gray-900 dark:text-white flex items-center gap-2 hover:bg-white/90 dark:hover:bg-gray-900/90 hover:border-[#3b5bdb]/60 focus:outline-none focus:border-[#3b5bdb] focus:ring-2 focus:ring-[#3b5bdb]/20 transition-all shadow-sm cursor-pointer w-full min-w-[200px]"
      >
        <Calendar size={14} className="text-[#3b5bdb] shrink-0" />
        <span className={cn("truncate font-medium", (!dateFrom && !dateTo) && "text-gray-400")}>
          {displayText}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 rounded-3xl border border-white/20 dark:border-gray-700/80 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl shadow-2xl p-4 z-50 w-72">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-600 dark:text-gray-300 transition-all cursor-pointer shadow-xs border border-white/20 dark:border-gray-700/50"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-600 dark:text-gray-300 transition-all cursor-pointer shadow-xs border border-white/20 dark:border-gray-700/50"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 w-full text-center mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-gray-400 uppercase">
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 w-full gap-y-1 text-center">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(dayNum).padStart(2, "0");
              const fullDateStr = `${viewYear}-${mm}-${dd}`;
              
              const isSelectedFrom = dateFrom === fullDateStr;
              const isSelectedTo = dateTo === fullDateStr;
              const isInRange = dateFrom && dateTo && fullDateStr > dateFrom && fullDateStr < dateTo;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  className={cn(
                    "h-8 w-8 mx-auto rounded-xl text-xs font-medium flex items-center justify-center transition-all cursor-pointer shadow-xs",
                    (isSelectedFrom || isSelectedTo)
                      ? "bg-[#3b5bdb] text-white shadow-md font-bold ring-2 ring-[#3b5bdb]/30"
                      : isInRange
                      ? "bg-[#3b5bdb]/15 dark:bg-[#3b5bdb]/25 text-[#3b5bdb] rounded-none"
                      : "text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:backdrop-blur-md"
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {(dateFrom || dateTo) && (
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-1">
              <span className="text-[11px] text-gray-500 font-medium">
                {dateFrom} {dateTo ? `to ${dateTo}` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  onChangeFrom("");
                  onChangeTo("");
                }}
                className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Clear Dates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeDiff({ oldValues, newValues }: { oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!oldValues && !newValues) return <span className="text-gray-400">—</span>;

  const oldKeys = oldValues ? Object.keys(oldValues) : [];
  const newKeys = newValues ? Object.keys(newValues) : [];
  const allKeys = [...new Set([...oldKeys, ...newKeys])];

  return (
    <div className="min-w-[130px]">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center gap-1.5 text-xs font-medium text-[#3b5bdb] hover:underline focus:outline-none whitespace-nowrap cursor-pointer"
      >
        <span>{allKeys.length} field(s) changed</span>
        {expanded ? <ChevronUp size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}
      </button>
      {expanded && (
        <div className="mt-2 p-2.5 rounded-2xl bg-white/80 dark:bg-gray-900/85 backdrop-blur-xl text-xs space-y-1 max-h-40 overflow-y-auto border border-white/20 dark:border-gray-700/80 shadow-xl">
          {allKeys.map((key) => {
            const old = oldValues?.[key];
            const newVal = newValues?.[key];
            return (
              <div key={key} className="flex gap-2 items-center">
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 min-w-[70px]">{key}:</span>
                {old !== undefined && <span className="text-rose-600 line-through bg-rose-50/80 dark:bg-rose-950/40 px-1 rounded">{String(old).slice(0, 25)}</span>}
                {old !== undefined && newVal !== undefined && <span className="text-gray-400">→</span>}
                {newVal !== undefined && <span className="text-emerald-600 font-medium bg-emerald-50/80 dark:bg-emerald-950/40 px-1 rounded">{String(newVal).slice(0, 25)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [stats, setStats] = React.useState<AuditLogStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(null);

  const [actionDropdownOpen, setActionDropdownOpen] = React.useState(false);
  const actionDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(e.target as Node)) {
        setActionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        securityService.listAuditLogs({
          page, pageSize,
          search: search || undefined,
          action: actionFilter || undefined,
          entity: entityFilter || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        }),
        securityService.getAuditLogStats(),
      ]);
      setLogs(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setStats(s);
    } catch { toast.error("Failed to load audit logs"); }
    finally { setLoading(false); }
  }, [page, pageSize, search, actionFilter, entityFilter, dateFrom, dateTo]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    try {
      const blob = await securityService.exportAuditLogsCsv({
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      downloadBlob(blob, `audit_logs_${Date.now()}.csv`);
      toast.success("Export downloaded successfully");
    } catch { toast.error("Failed to export audit logs"); }
  };

  const columns: Column<AuditLogItem>[] = [
    {
      key: "user",
      header: "Actor",
      render: (r) => r.user ? (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs shrink-0 border border-white/20 dark:border-gray-700 shadow-xs">
            {r.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{r.user.name}</p>
            <p className="text-xs text-gray-500">{r.user.role}</p>
          </div>
        </div>
      ) : <span className="text-gray-400 italic">System Automation</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (r) => <Badge variant={ACTION_COLORS[r.action] ?? "default"} className="px-2.5 py-1 font-medium">{r.action.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "entity",
      header: "Entity",
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-900 dark:text-white">{r.entity}</span>
          {r.entityId && <p className="text-xs font-mono text-gray-400 truncate max-w-[120px]" title={r.entityId}>{r.entityId}</p>}
        </div>
      ),
    },
    {
      key: "changes",
      header: "Changes",
      render: (r) => <ChangeDiff oldValues={r.oldValues} newValues={r.newValues} />,
    },
    {
      key: "location",
      header: "IP & Browser",
      render: (r) => (
        <div>
          {r.ipAddress && <p className="font-mono text-xs font-medium text-gray-800 dark:text-gray-200">{r.ipAddress}</p>}
          {r.browser && <p className="text-xs text-gray-400 truncate max-w-[140px]" title={r.browser}>{r.browser}</p>}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
          <Clock size={13} className="text-gray-400" />
          {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (r) => (
        <button
          onClick={() => setSelectedLog(r)}
          className="p-2 text-gray-500 hover:text-[#3b5bdb] bg-white/40 dark:bg-gray-800/40 backdrop-blur-md hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-2xl transition-all cursor-pointer shadow-xs border border-white/20 dark:border-gray-700/50"
          title="View Audit Details"
          aria-label="View Audit Details"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <PageContainer title="Audit Logs" subtitle="Track all administrative actions, security events, and entity changes across the platform.">
      
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border border-white/20 dark:border-gray-800/80 shadow-md rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:border-[#3b5bdb]/40 hover:shadow-lg transition-all">
            <CardBody className="py-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Total Logs</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{stats.totalLogs.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/60 backdrop-blur-md rounded-2xl text-blue-600 shadow-xs border border-blue-100 dark:border-blue-900/50">
                <Activity size={20} />
              </div>
            </CardBody>
          </Card>

          <Card className="border border-white/20 dark:border-gray-800/80 shadow-md rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:border-blue-500/40 hover:shadow-lg transition-all">
            <CardBody className="py-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Last 24 Hours</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">{stats.logsLast24h}</p>
              </div>
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/60 backdrop-blur-md rounded-2xl text-blue-600 shadow-xs border border-blue-100 dark:border-blue-900/50">
                <Clock size={20} />
              </div>
            </CardBody>
          </Card>

          <Card className="border border-white/20 dark:border-gray-800/80 shadow-md rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-lg transition-all">
            <CardBody className="py-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Last 7 Days</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.logsLast7d}</p>
              </div>
              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/60 backdrop-blur-md rounded-2xl text-emerald-600 shadow-xs border border-emerald-100 dark:border-emerald-900/50">
                <Calendar size={20} />
              </div>
            </CardBody>
          </Card>

          <Card className="border border-white/20 dark:border-gray-800/80 shadow-md rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:border-purple-500/40 hover:shadow-lg transition-all">
            <CardBody className="py-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Entity Types</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{Object.keys(stats.topEntities).length}</p>
              </div>
              <div className="p-3 bg-purple-50/80 dark:bg-purple-950/60 backdrop-blur-md rounded-2xl text-purple-600 shadow-xs border border-purple-100 dark:border-purple-900/50">
                <ShieldCheck size={20} />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Expanded Width Audit Trail Card Container */}
      <Card className="border border-white/20 dark:border-gray-800/80 shadow-xl rounded-3xl overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl w-full">
        <CardHeader className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border-b border-white/20 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3b5bdb]" />
              Audit Trail
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport} 
                leftIcon={<Download size={14} />} 
                className="rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/30 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-800 hover:border-[#3b5bdb] transition-all shadow-xs"
              >
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData} 
                leftIcon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} 
                className="rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/30 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-800 hover:border-[#3b5bdb] transition-all shadow-xs"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-6">
          {/* Evenly Spaced Apple Glass Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 items-center">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search user, entity…"
                className="w-full h-10 pl-10 pr-4 text-sm bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-white/20 dark:border-gray-700/80 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#3b5bdb] focus:ring-2 focus:ring-[#3b5bdb]/20 transition-all shadow-xs"
              />
            </div>

            <div className="relative w-full" ref={actionDropdownRef}>
              <button
                type="button"
                onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                className="h-10 w-full px-3.5 text-sm bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-white/20 dark:border-gray-700/80 rounded-2xl text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:border-[#3b5bdb] focus:ring-2 focus:ring-[#3b5bdb]/20 transition-all shadow-xs cursor-pointer"
              >
                <span className="truncate">
                  {ACTIONS.find((a) => a.value === actionFilter)?.label || "All Actions"}
                </span>
                <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200 shrink-0 ml-2", actionDropdownOpen && "rotate-180")} />
              </button>

              {actionDropdownOpen && (
                <div className="absolute left-0 mt-2 w-full rounded-3xl border border-white/20 dark:border-gray-700/80 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl shadow-2xl py-1.5 z-50 max-h-60 overflow-y-auto">
                  {ACTIONS.map((option) => {
                    const isSelected = actionFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActionFilter(option.value);
                          setPage(1);
                          setActionDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-xs font-semibold text-left flex items-center justify-between transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[#3b5bdb]/15 text-[#3b5bdb] dark:bg-[#3b5bdb]/30 dark:text-blue-300 font-bold"
                            : "text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/70 backdrop-blur-md"
                        )}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check size={14} className="text-[#3b5bdb]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-full">
              <input 
                type="text" 
                value={entityFilter} 
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                placeholder="Filter by entity…" 
                className="w-full h-10 px-3.5 text-sm border border-white/20 dark:border-gray-700/80 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md text-gray-900 dark:text-white focus:outline-none focus:border-[#3b5bdb] focus:ring-2 focus:ring-[#3b5bdb]/20 shadow-xs" 
              />
            </div>

            <div className="w-full">
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChangeFrom={(d) => { setDateFrom(d); setPage(1); }}
                onChangeTo={(d) => { setDateTo(d); setPage(1); }}
              />
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/20 dark:border-gray-800 shadow-xs backdrop-blur-md bg-white/40 dark:bg-gray-900/40 w-full">
            <Table 
              columns={columns} 
              data={logs} 
              loading={loading}
              emptyTitle="No audit logs"
              emptyDescription="Audit logs will appear here as actions are performed across the platform." 
            />
          </div>

          <div className="mt-6">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </CardBody>
      </Card>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setSelectedLog(null)} className="rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/30 dark:border-gray-700">
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 rounded-3xl border border-white/20 dark:border-gray-800 bg-white/60 dark:bg-gray-800/40 backdrop-blur-xl p-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Actor / User</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{selectedLog.user?.name ?? "System Automation"}</p>
                <p className="text-xs text-gray-500">{selectedLog.user?.role ?? "System"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Action Performed</p>
                <div className="mt-1"><Badge variant={ACTION_COLORS[selectedLog.action] ?? "default"}>{selectedLog.action}</Badge></div>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Entity & ID</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{selectedLog.entity}</p>
                <p className="text-xs text-gray-500 font-mono">{selectedLog.entityId ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Timestamp</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{new Date(selectedLog.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 dark:border-gray-800 bg-white/60 dark:bg-gray-900/70 backdrop-blur-xl p-4 space-y-3 shadow-xs">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Network & Client Metadata</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">IP Address:</span> <span className="font-mono font-medium text-gray-900 dark:text-white">{selectedLog.ipAddress ?? "—"}</span></div>
                <div><span className="text-gray-500">Correlation ID:</span> <span className="font-mono font-medium text-gray-900 dark:text-white">{selectedLog.correlationId ?? "—"}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Browser / User Agent:</span> <span className="text-gray-900 dark:text-white">{selectedLog.browser ?? "—"}</span></div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 dark:border-gray-800 bg-white/60 dark:bg-gray-900/70 backdrop-blur-xl p-4 space-y-2 shadow-xs">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">State Changes</p>
              <ChangeDiff oldValues={selectedLog.oldValues} newValues={selectedLog.newValues} />
            </div>
          </div>
        )}
      </Modal>

    </PageContainer>
  );
}