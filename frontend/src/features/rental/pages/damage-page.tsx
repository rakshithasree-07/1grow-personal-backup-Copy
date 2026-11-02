"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  AlertTriangle,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  Clock,
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
  getDamageList,
  createDamage,
  updateDamage,
  getRentalItems,
  getRentalBookings,
  type RentalDamage,
  type RentalItem,
  type RentalBooking,
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

const severityVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  MINOR: "success",
  MODERATE: "warning",
  MAJOR: "danger",
  TOTAL_LOSS: "danger",
};

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline"> = {
  PENDING_ASSESSMENT: "warning",
  ASSESSED: "info",
  PENALTY_APPLIED: "danger",
  DISPUTED: "warning",
  RESOLVED: "success",
};

function RowMenu({
  row,
  onEdit,
}: {
  row: RentalDamage;
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

export function DamagePage() {
  const [damages, setDamages] = useState<RentalDamage[]>([]);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDamage, setEditingDamage] = useState<RentalDamage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    itemId: "",
    bookingId: "",
    severity: "MINOR",
    description: "",
    penaltyAmount: "",
    status: "PENDING_ASSESSMENT",
    notes: "",
  });

  const pageSize = 10;

  const fetchDamages = useCallback(async () => {
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
      const res = await getDamageList(query);
      setDamages(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setDamages([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [itemsRes, bookingsRes] = await Promise.all([
        getRentalItems({ pageSize: 200 }),
        getRentalBookings({ pageSize: 200 }),
      ]);
      setItems(itemsRes.data ?? []);
      setBookings(bookingsRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchDamages(); }, [fetchDamages]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      itemId: "",
      bookingId: "",
      severity: "MINOR",
      description: "",
      penaltyAmount: "",
      status: "PENDING_ASSESSMENT",
      notes: "",
    });
  };

  const openCreateModal = () => {
    setEditingDamage(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (damage: RentalDamage) => {
    setEditingDamage(damage);
    setForm({
      itemId: damage.itemId,
      bookingId: damage.bookingId ?? "",
      severity: damage.severity,
      description: damage.description ?? "",
      penaltyAmount: String(damage.penaltyAmount),
      status: damage.status,
      notes: damage.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.itemId) {
      toast.error("Item is required");
      return;
    }
    if (!form.bookingId) {
      toast.error("Booking is required");
      return;
    }

    setSubmitting(true);
    try {
      const basePayload = {
        itemId: form.itemId,
        bookingId: form.bookingId,
        severity: form.severity,
        description: form.description.trim() || null,
        penaltyAmount: Number(form.penaltyAmount) || 0,
        notes: form.notes.trim() || null,
      };

      if (editingDamage) {
        await updateDamage(editingDamage.id, { ...basePayload, status: form.status });
        toast.success("Damage record updated");
      } else {
        await createDamage(basePayload);
        toast.success("Damage record created");
      }
      setModalOpen(false);
      setEditingDamage(null);
      resetForm();
      fetchDamages();
    } catch {
      toast.error(editingDamage ? "Failed to update record" : "Failed to create record");
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
        { value: "PENDING_ASSESSMENT", label: "Pending Assessment" },
        { value: "ASSESSED", label: "Assessed" },
        { value: "PENALTY_APPLIED", label: "Penalty Applied" },
        { value: "DISPUTED", label: "Disputed" },
        { value: "RESOLVED", label: "Resolved" },
      ],
    },
  ];

  const columns = [
    {
      key: "item", header: "Item", sortable: true, render: (row: RentalDamage) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-danger/10">
            <AlertTriangle size={14} className="text-danger" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.item?.name ?? "-"}</p>
            <p className="text-xs text-text-secondary">{row.booking?.bookingNumber ?? "No booking"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "severity", header: "Severity", sortable: true, render: (row: RentalDamage) => (
        <Badge size="sm" variant={severityVariant[row.severity] ?? "outline"}>
          {row.severity}
        </Badge>
      ),
    },
    {
      key: "description", header: "Description", render: (row: RentalDamage) => (
        <span className="text-sm text-text-secondary truncate max-w-[200px] block">
          {row.description ?? "-"}
        </span>
      ),
    },
    {
      key: "penaltyAmount", header: "Penalty", sortable: true, render: (row: RentalDamage) => (
        <span className="text-sm tabular-nums text-text-primary">{formatINR(row.penaltyAmount)}</span>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalDamage) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalDamage) => (
        <RowMenu row={row} onEdit={() => openEditModal(row)} />
      ),
    },
  ];

  return (
    <PageContainer
      title="Damage & Penalties"
      subtitle="Track item damage and penalty assessments"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Assessment
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard title="Total" value={damages.length} icon={<AlertTriangle size={18} />} />
        <StatCard title="Reported" value={damages.filter((d) => d.status === "REPORTED").length} icon={<Clock size={18} />} />
        <StatCard title="Charged" value={damages.filter((d) => d.status === "CHARGED").length} icon={<IndianRupee size={18} />} />
        <StatCard title="Resolved" value={damages.filter((d) => d.status === "RESOLVED").length} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search damage records..."
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
            data={damages}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No damage records"
            emptyDescription="Create your first damage assessment"
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
          ) : damages.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No damage records</p>
              <p className="text-xs text-text-secondary mt-1">Create your first damage assessment</p>
            </div>
          ) : (
            damages.map((damage) => (
              <div
                key={damage.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-danger/10 shrink-0">
                      <AlertTriangle size={14} className="text-danger" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{damage.item?.name ?? "-"}</p>
                      <p className="text-xs text-text-secondary truncate">{damage.booking?.bookingNumber ?? "No booking"}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu row={damage} onEdit={() => openEditModal(damage)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={severityVariant[damage.severity] ?? "outline"}>{damage.severity}</Badge>
                  <Badge size="sm" variant={statusVariant[damage.status] ?? "outline"}>{damage.status}</Badge>
                  <span className="font-medium text-text-primary">{formatINR(damage.penaltyAmount)}</span>
                </div>
                {damage.description && (
                  <p className="text-xs text-text-secondary truncate">{damage.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingDamage(null); resetForm(); }}
        title={editingDamage ? "Edit Damage Record" : "New Damage Assessment"}
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
            label="Booking"
            required
            value={form.bookingId}
            onChange={(val) => setForm((p) => ({ ...p, bookingId: val }))}
            placeholder="Select booking"
            options={bookings.map((b) => ({ value: b.id, label: `${b.bookingNumber} - ${b.customerName}` }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <UiSelect
              label="Severity"
              value={form.severity}
              onChange={(val) => setForm((p) => ({ ...p, severity: val }))}
              options={[
                { value: "MINOR", label: "Minor" },
                { value: "MODERATE", label: "Moderate" },
                { value: "MAJOR", label: "Major" },
                { value: "TOTAL_LOSS", label: "Total Loss" },
              ]}
            />
            <UiSelect
              label="Status"
              value={form.status}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              options={[
                { value: "PENDING_ASSESSMENT", label: "Pending Assessment" },
                { value: "ASSESSED", label: "Assessed" },
                { value: "PENALTY_APPLIED", label: "Penalty Applied" },
                { value: "DISPUTED", label: "Disputed" },
                { value: "RESOLVED", label: "Resolved" },
              ]}
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe the damage"
          />
          <Input
            label="Penalty Amount (INR)"
            type="number"
            min="0"
            value={form.penaltyAmount}
            onChange={(e) => setForm((p) => ({ ...p, penaltyAmount: e.target.value }))}
            placeholder="0"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Additional notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingDamage(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingDamage ? "Update Record" : "Create Assessment"}
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
