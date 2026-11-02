"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Phone, Target, Download, Upload, SlidersHorizontal, Eye } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Pagination, SearchBar, FilterBar, Modal, Card, StatCard, Skeleton, EmptyState, Avatar } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { getLeads, getLeadStats, bulkAssignLeads, type Lead, type LeadStats, type LeadQuery } from "@/services/leads";
import { useRolePath } from "@/hooks/useRolePrefix";
import { getBranches, type Branch } from "@/services/branches";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/api-client";
import { cn } from "@/lib/cn";

const statusConfig: Record<string, { label: string; variant: "info" | "brand" | "warning" | "success" | "danger" | "outline" }> = {
  NEW: { label: "New", variant: "info" },
  CONTACTED: { label: "Contacted", variant: "brand" },
  FOLLOWUP: { label: "Follow Up", variant: "warning" },
  INTERESTED: { label: "Interested", variant: "success" },
  DEMO_SCHEDULED: { label: "Demo Scheduled", variant: "info" },
  CONVERTED: { label: "Converted", variant: "success" },
  LOST: { label: "Lost", variant: "danger" },
};

export function LeadsPage() {
  const router = useRouter();
  const rolePath = useRolePath();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignModal, setBulkAssignModal] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [statsBranchId, setStatsBranchId] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const buildQuery = useCallback((): LeadQuery => ({
    page,
    pageSize,
    search: search || undefined,
    sortBy: sortKey,
    sortDir,
    ...activeFilters,
    branchId: activeFilters.branchId || statsBranchId || undefined,
  }), [page, search, sortKey, sortDir, activeFilters, statsBranchId]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads(buildQuery());
      setLeads(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch {
      toast.error("Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getLeadStats(statsBranchId || undefined);
      setStats(res.data);
    } catch { /* ignore */ }
  }, [statsBranchId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    let cancelled = false;
    getBranches().then((res) => { if (!cancelled) setBranches(res.data ?? []); }).catch(() => { if (!cancelled) toast.error("Failed to load branches"); });
    return () => { cancelled = true; };
  }, []);

  const handleBulkAssign = async () => {
    if (!bulkAssignTo.trim()) { toast.error("Assigned user ID is required"); return; }
    setBulkAssignLoading(true);
    try {
      await bulkAssignLeads(Array.from(selectedIds), bulkAssignTo.trim());
      toast.success(`Assigned ${selectedIds.size} leads`);
      setSelectedIds(new Set());
      setBulkAssignModal(false);
      setBulkAssignTo("");
      fetchLeads();
    } catch { toast.error("Failed to assign leads"); }
    finally { setBulkAssignLoading(false); }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const columns = [
    { key: "name", header: "Lead", sortable: true, render: (row: Lead) => (
      <button onClick={() => router.push(rolePath(`/leads/${row.id}`))} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Avatar src={null} name={row.name} size="sm" />
        <div className="text-left min-w-0">
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-xs text-text-secondary">{row.phone}</p>
        </div>
      </button>
    )},
    { key: "course", header: "Course", render: (row: Lead) => (
      <span className="text-sm text-text-secondary">{row.course || "-"}</span>
    )},
    { key: "source", header: "Source", render: (row: Lead) => (
      <Badge size="sm" variant={row.source === "PUBLIC_INQUIRY" ? "success" : "outline"}>{row.source.replace(/_/g, " ")}</Badge>
    )},
    { key: "status", header: "Status", sortable: true, render: (row: Lead) => {
      const cfg = statusConfig[row.status] || { label: row.status, variant: "outline" as const };
      return <Badge size="sm" variant={cfg.variant}>{cfg.label}</Badge>;
    }},
    { key: "createdAt", header: "Created", sortable: true, render: (row: Lead) => (
      <span className="text-sm text-text-secondary">{new Date(row.createdAt).toLocaleDateString()}</span>
    )},
    { key: "actions", header: "", className: "w-32", render: (row: Lead) => (
      <div className="flex items-center gap-1">
        <Button size="xs" variant="ghost" onClick={() => router.push(rolePath(`/leads/${row.id}`))} title="View">
          <Eye size={14} />
        </Button>
        <Button size="xs" variant="ghost" onClick={() => router.push(rolePath(`/leads/${row.id}/edit`))} title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </Button>
      </div>
    )},
  ];

  const filterDefs = [
    { key: "status", label: "Status", options: [
      { value: "NEW", label: "New" },
      { value: "CONTACTED", label: "Contacted" },
      { value: "FOLLOWUP", label: "Follow Up" },
      { value: "INTERESTED", label: "Interested" },
      { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
      { value: "CONVERTED", label: "Converted" },
      { value: "LOST", label: "Lost" },
    ]},
    { key: "source", label: "Source", options: [
      { value: "WALK_IN", label: "Walk In" },
      { value: "PHONE", label: "Phone" },
      { value: "WEBSITE", label: "Website" },
      { value: "SOCIAL_MEDIA", label: "Social Media" },
      { value: "REFERRAL", label: "Referral" },
      { value: "ADVERTISEMENT", label: "Advertisement" },
      { value: "PUBLIC_INQUIRY", label: "Public Inquiry" },
      { value: "OTHER", label: "Other" },
    ]},
  ];

  return (
    <PageContainer
      title="Leads"
      subtitle="Manage your leads and inquiries"
    >
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={() => router.push(rolePath("/leads/create"))}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Stats Cards - Mobile First */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4 sm:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)
        ) : (
          <>
            <StatCard title="Total" value={stats?.total ?? leads.length} icon={<Target size={18} />} />
            <StatCard title="New" value={stats?.new ?? leads.filter(l => l.status === "NEW").length} icon={<Target size={18} />} deltaType="increase" />
            <StatCard title="Converted" value={stats?.converted ?? leads.filter(l => l.status === "CONVERTED").length} icon={<Target size={18} />} deltaType={stats && stats.conversionRate > 0 ? "increase" : "neutral"} />
            <StatCard title="Lost" value={stats?.lost ?? leads.filter(l => l.status === "LOST").length} icon={<Target size={18} />} deltaType="decrease" />
          </>
        )}
      </div>

      {/* Branch Filter */}
      {branches.length > 0 && (
        <div className="mb-4">
          <select
            value={statsBranchId}
            onChange={(e) => { setStatsBranchId(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary sm:w-auto"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="mb-4">
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, phone..." />
            </div>
            <Button
              variant={showFilters ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 && (
                <span className="ml-1 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Mobile Filter Drawer */}
          {showFilters && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">Filters</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setActiveFilters({}); setPage(1); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <FilterBar
                filters={filterDefs}
                active={activeFilters}
                onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }}
                onClear={() => { setActiveFilters({}); setPage(1); }}
              />
            </div>
          )}

          {/* Desktop Filters - Always visible */}
          <div className="hidden sm:block">
            <FilterBar
              filters={filterDefs}
              active={activeFilters}
              onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }}
              onClear={() => { setActiveFilters({}); setPage(1); }}
            />
          </div>
        </div>
      </Card>

      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{total} leads</p>
        <div className="flex gap-2">
          <input
            ref={fileInputRef as any}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const lines = text.split("\n").filter(Boolean);
                if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }
                const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
                const results = { success: 0, failed: 0 };
                for (let i = 1; i < lines.length; i++) {
                  const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
                  const row: Record<string, string> = {};
                  headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
                  try {
                    await apiClient.post("/leads", {
                      name: row.name || row.lead,
                      phone: row.phone,
                      email: row.email || undefined,
                      course: row.course || undefined,
                      source: (row.source || "WALK_IN").toUpperCase().replace(/ /g, "_"),
                    });
                    results.success++;
                  } catch {
                    results.failed++;
                  }
                }
                toast.success(`Imported ${results.success} leads${results.failed > 0 ? `, ${results.failed} failed` : ""}`);
                fetchLeads();
                fetchStats();
              } catch {
                toast.error("Failed to import CSV");
              }
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import
          </Button>
          <Button size="sm" onClick={() => router.push(rolePath("/leads/create"))}>
            <Plus size={16} /> New Lead
          </Button>
        </div>
      </div>

      {/* Leads Table - Desktop */}
      <Card className="hidden sm:block">
        <Table
          columns={columns}
          data={leads}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectAll={(checked) => {
            if (checked) setSelectedIds(new Set(leads.map(l => l.id)));
            else setSelectedIds(new Set());
          }}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              checked ? next.add(String(id)) : next.delete(String(id));
              return next;
            });
          }}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          emptyTitle="No leads found"
          emptyDescription="Create your first lead to get started"
        />
        <div className="px-4 py-3">
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      </Card>

      {/* Mobile Lead Cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />)
        ) : leads.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Target size={32} className="mb-3 text-text-disabled" />
              <p className="text-sm font-medium">No leads found</p>
              <p className="text-xs mt-1 mb-4">Create your first lead to get started</p>
              <Button size="sm" onClick={() => router.push(rolePath("/leads/create"))}>
                <Plus size={16} /> Add Lead
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {leads.map((lead) => {
              const cfg = statusConfig[lead.status] || { label: lead.status, variant: "outline" as const };
              return (
                <button
                  key={lead.id}
                  onClick={() => router.push(rolePath(`/leads/${lead.id}`))}
                  className="flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-border p-4 bg-surface hover:bg-surface-overlay transition-colors text-left active:scale-[0.98]"
                >
                  <Avatar src={null} name={lead.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-text-primary truncate">{lead.name}</p>
                      <Badge size="sm" variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                      <Phone size={12} />
                      <span>{lead.phone}</span>
                      {lead.course && (
                        <>
                          <span className="text-text-disabled">·</span>
                          <span>{lead.course}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge size="sm" variant="outline">{lead.source.replace(/_/g, " ")}</Badge>
                      <span className="text-[10px] text-text-disabled">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="pt-2">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full bg-surface px-6 py-3 shadow-xl border border-border">
          <span className="text-sm font-medium text-text-primary">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => setBulkAssignModal(true)}>
            Assign
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
            const headers = ["Name", "Phone", "Email", "Course", "Source", "Status", "Created At"];
            const rows = selectedLeads.map((l) => [
              `"${l.name}"`,
              l.phone,
              l.email ?? "",
              l.course ?? "",
              l.source,
              l.status,
              l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "",
            ].join(","));
            const csv = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "leads-export.csv";
            a.click();
            URL.revokeObjectURL(url);
            setSelectedIds(new Set());
          }}>
            <Download size={14} className="mr-1" /> Export
          </Button>
        </div>
      )}

      {/* Bulk Assign Modal */}
      <Modal open={bulkAssignModal} onClose={() => setBulkAssignModal(false)} title="Bulk Assign Leads" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Assign {selectedIds.size} selected leads to a user.
          </p>
          <Input
            label="User ID"
            value={bulkAssignTo}
            onChange={(e) => setBulkAssignTo(e.target.value)}
            placeholder="Enter user UUID"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setBulkAssignModal(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} loading={bulkAssignLoading}>Assign</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
