"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Wrench,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertTriangle,
  IndianRupee,
  SlidersHorizontal,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Table,
  Badge,
  Pagination,
  SearchBar,
  FilterBar,
  Modal,
  Card,
  StatCard,
  Skeleton,
  Input,
  Select as UiSelect,
} from "@/components/ui";
import {
  getMaintenanceList,
  createMaintenance,
  updateMaintenance,
  getRentalItems,
  type RentalMaintenance,
  type RentalItem,
  type PaginationQuery,
} from "@/services/rental";
import { toast } from "sonner";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline"> = {
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function RowMenu({
  row,
  onEdit,
}: {
  row: RentalMaintenance;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useState(() => ({ current: null as HTMLDivElement | null }))[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, ref]);

  return (
    <div className="flex items-center justify-end gap-1" ref={(el) => { ref.current = el; }}>
      {open && (
        <>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
        </>
      )}
      <Button size="xs" variant="ghost" title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}

export function MaintenancePage() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<RentalMaintenance[]>([]);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RentalMaintenance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    itemId: "",
    type: "PREVENTIVE",
    description: "",
    scheduledDate: "",
    completedDate: "",
    cost: "",
    status: "SCHEDULED",
    notes: "",
  });

  const pageSize = 10;

  const fetchMaintenance = useCallback(async () => {
    setLoading(true);
    try {
      const query: PaginationQuery = {
        page,
        pageSize,
        search,
        status: activeFilters.status,
        sortBy: sortKey || undefined,
        sortDir: sortDir || undefined,
      };
      const res = await getMaintenanceList(query);
      setMaintenanceRecords(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setMaintenanceRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const itemsRes = await getRentalItems({ pageSize: 200 });
      setItems(itemsRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchMaintenance(); }, [fetchMaintenance]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      itemId: "",
      type: "PREVENTIVE",
      description: "",
      scheduledDate: "",
      completedDate: "",
      cost: "",
      status: "SCHEDULED",
      notes: "",
    });
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (record: RentalMaintenance) => {
    setEditingRecord(record);
    setForm({
      itemId: record.itemId,
      type: record.type,
      description: record.description ?? "",
      scheduledDate: record.scheduledDate?.slice(0, 10) ?? "",
      completedDate: record.completedDate?.slice(0, 10) ?? "",
      cost: String(record.cost),
      status: record.status,
      notes: record.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.itemId) {
      toast.error("Item is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        itemId: form.itemId,
        type: form.type,
        description: form.description.trim() || null,
        scheduledDate: form.scheduledDate || null,
        completedDate: form.completedDate || null,
        cost: Number(form.cost) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (editingRecord) {
        await updateMaintenance(editingRecord.id, payload);
        toast.success("Maintenance record updated");
      } else {
        await createMaintenance(payload);
        toast.success("Maintenance record created");
      }
      setModalOpen(false);
      setEditingRecord(null);
      resetForm();
      fetchMaintenance();
    } catch {
      toast.error(editingRecord ? "Failed to update record" : "Failed to create record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filterDefs = [
    {
      key: "status", label: "Status", options: [
        { value: "SCHEDULED", label: "Scheduled" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
  ];

  const columns = [
    {
      key: "item", header: "Item", sortable: true, render: (row: RentalMaintenance) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-warning/10">
            <Wrench size={14} className="text-warning" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.item?.name ?? "-"}</p>
            <p className="text-xs text-text-secondary">{row.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description", header: "Description", render: (row: RentalMaintenance) => (
        <span className="text-sm text-text-secondary truncate max-w-[200px] block">
          {row.description ?? "-"}
        </span>
      ),
    },
    {
      key: "scheduledDate", header: "Scheduled", sortable: true, render: (row: RentalMaintenance) => (
        <span className="text-xs text-text-secondary">
          {row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "cost", header: "Cost", sortable: true, render: (row: RentalMaintenance) => (
        <span className="text-sm tabular-nums text-text-primary">{formatINR(row.cost)}</span>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalMaintenance) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalMaintenance) => (
        <RowMenu row={row} onEdit={() => openEditModal(row)} />
      ),
    },
  ];

  return (
    <PageContainer
      title="Maintenance"
      subtitle="Track item maintenance and repairs"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Record
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard title="Total" value={maintenanceRecords.length} icon={<Wrench size={18} />} />
        <StatCard title="Scheduled" value={maintenanceRecords.filter((r) => r.status === "SCHEDULED").length} icon={<Clock size={18} />} />
        <StatCard title="In Progress" value={maintenanceRecords.filter((r) => r.status === "IN_PROGRESS").length} icon={<AlertTriangle size={18} />} />
        <StatCard title="Completed" value={maintenanceRecords.filter((r) => r.status === "COMPLETED").length} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search maintenance..."
              />
            </div>
            <Button
              variant={showFilters ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="shrink-0"
            >
              <SlidersHorizontal size={16} />
            </Button>
          </div>
          <FilterBar
            filters={filterDefs}
            active={activeFilters}
            onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }}
            onClear={() => { setActiveFilters({}); setPage(1); }}
          />
        </div>

        {/* Desktop: Table */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={maintenanceRecords}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No maintenance records"
            emptyDescription="Create your first maintenance record"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>

        {/* Mobile: Cards */}
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />
            ))
          ) : maintenanceRecords.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No maintenance records</p>
              <p className="text-xs text-text-secondary mt-1">Create your first maintenance record</p>
            </div>
          ) : (
            maintenanceRecords.map((record) => (
              <div
                key={record.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-warning/10 shrink-0">
                      <Wrench size={14} className="text-warning" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{record.item?.name ?? "-"}</p>
                      <p className="text-xs text-text-secondary truncate">{record.type}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu row={record} onEdit={() => openEditModal(record)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={statusVariant[record.status] ?? "outline"}>{record.status}</Badge>
                  <span className="text-text-secondary">{formatINR(record.cost)}</span>
                </div>
                {record.scheduledDate && (
                  <div className="text-xs text-text-secondary">
                    Scheduled: {new Date(record.scheduledDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRecord(null); resetForm(); }}
        title={editingRecord ? "Edit Maintenance" : "New Maintenance Record"}
        size="md"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <UiSelect
            label="Item"
            required
            value={form.itemId}
            onChange={(val) => setForm((p) => ({ ...p, itemId: val }))}
            placeholder="Select item"
            options={items.map((i) => ({ value: i.id, label: i.name }))}
          />
          <UiSelect
            label="Type"
            value={form.type}
            onChange={(val) => setForm((p) => ({ ...p, type: val }))}
            options={[
              { value: "PREVENTIVE", label: "Preventive" },
              { value: "REPAIR", label: "Repair" },
              { value: "CLEANING", label: "Cleaning" },
              { value: "OVERHAUL", label: "Overhaul" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe the maintenance needed"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Scheduled Date"
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
            />
            <Input
              label="Completed Date"
              type="date"
              value={form.completedDate}
              onChange={(e) => setForm((p) => ({ ...p, completedDate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost (INR)"
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
              placeholder="0"
            />
            <UiSelect
              label="Status"
              value={form.status}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              options={[
                { value: "SCHEDULED", label: "Scheduled" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
            />
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Additional notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingRecord(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingRecord ? "Update Record" : "Create Record"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={openCreateModal}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>
    </PageContainer>
  );
}
