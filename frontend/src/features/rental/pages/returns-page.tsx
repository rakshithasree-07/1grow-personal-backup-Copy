"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RotateCcw,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
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
  getReturnList,
  createReturn,
  updateReturn,
  getRentalBookings,
  type RentalReturn,
  type RentalBooking,
  type PaginationQuery,
} from "@/services/rental";
import { toast } from "sonner";

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline"> = {
  PENDING: "warning",
  RECEIVED: "info",
  INSPECTED: "info",
  COMPLETED: "success",
  DISPUTED: "danger",
};

function RowMenu({
  row,
  onEdit,
}: {
  row: RentalReturn;
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

export function ReturnsPage() {
  const [returns, setReturns] = useState<RentalReturn[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<RentalReturn | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    bookingId: "",
    returnDate: "",
    condition: "GOOD",
    notes: "",
  });

  const pageSize = 10;

  const fetchReturns = useCallback(async () => {
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
      const res = await getReturnList(query);
      setReturns(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const bookingsRes = await getRentalBookings({ pageSize: 200 });
      setBookings(bookingsRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      bookingId: "",
      returnDate: "",
      condition: "GOOD",
      notes: "",
    });
  };

  const openCreateModal = () => {
    setEditingReturn(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (returnItem: RentalReturn) => {
    setEditingReturn(returnItem);
    setForm({
      bookingId: returnItem.bookingId,
      returnDate: returnItem.returnDate ? new Date(returnItem.returnDate).toISOString().slice(0, 16) : "",
      condition: returnItem.condition ?? "GOOD",
      notes: returnItem.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.bookingId) {
      toast.error("Booking is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bookingId: form.bookingId,
        returnDate: form.returnDate || new Date().toISOString().slice(0, 16),
        condition: form.condition,
        notes: form.notes.trim() || null,
      };

      if (editingReturn) {
        await updateReturn(editingReturn.id, payload);
        toast.success("Return updated successfully");
      } else {
        await createReturn(payload);
        toast.success("Return created successfully");
      }
      setModalOpen(false);
      setEditingReturn(null);
      resetForm();
      fetchReturns();
    } catch {
      toast.error(editingReturn ? "Failed to update return" : "Failed to create return");
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
        { value: "PENDING", label: "Pending" },
        { value: "RECEIVED", label: "Received" },
        { value: "INSPECTED", label: "Inspected" },
        { value: "COMPLETED", label: "Completed" },
        { value: "DISPUTED", label: "Disputed" },
      ],
    },
  ];

  const columns = [
    {
      key: "returnNumber", header: "Return #", sortable: true, render: (row: RentalReturn) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <RotateCcw size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.returnNumber}</p>
            <p className="text-xs text-text-secondary">
              {row.returnDate ? new Date(row.returnDate).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "booking", header: "Booking", render: (row: RentalReturn) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.booking?.bookingNumber ?? "-"}</p>
          <p className="text-xs text-text-secondary">{row.booking?.customerName ?? ""}</p>
        </div>
      ),
    },
    {
      key: "condition", header: "Condition", render: (row: RentalReturn) => (
        <Badge size="sm" variant={
          row.condition === "GOOD" || row.condition === "EXCELLENT" ? "success" :
          row.condition === "FAIR" ? "warning" :
          row.condition === "POOR" || row.condition === "DAMAGED" ? "danger" : "outline"
        }>
          {row.condition ?? "-"}
        </Badge>
      ),
    },
    {
      key: "condition", header: "Condition", render: (row: RentalReturn) => (
        <span className="text-sm text-text-secondary">{row.condition ?? "-"}</span>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalReturn) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalReturn) => (
        <RowMenu row={row} onEdit={() => openEditModal(row)} />
      ),
    },
  ];

  return (
    <PageContainer
      title="Returns"
      subtitle="Process and track item returns"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Return
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard title="Total" value={returns.length} icon={<RotateCcw size={18} />} />
        <StatCard title="Pending" value={returns.filter((r) => r.status === "PENDING").length} icon={<Clock size={18} />} />
        <StatCard title="Inspected" value={returns.filter((r) => r.status === "INSPECTED").length} icon={<Package size={18} />} />
        <StatCard title="Completed" value={returns.filter((r) => r.status === "COMPLETED").length} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search returns..."
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
            data={returns}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No returns found"
            emptyDescription="Process your first return"
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
          ) : returns.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No returns found</p>
              <p className="text-xs text-text-secondary mt-1">Process your first return</p>
            </div>
          ) : (
            returns.map((returnItem) => (
              <div
                key={returnItem.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <RotateCcw size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{returnItem.returnNumber}</p>
                      <p className="text-xs text-text-secondary truncate">{returnItem.booking?.bookingNumber ?? "-"}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu row={returnItem} onEdit={() => openEditModal(returnItem)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={statusVariant[returnItem.status] ?? "outline"}>{returnItem.status}</Badge>
                  {returnItem.condition && (
                    <Badge size="sm" variant={
                      returnItem.condition === "GOOD" || returnItem.condition === "EXCELLENT" ? "success" :
                      returnItem.condition === "FAIR" ? "warning" : "danger"
                    }>
                      {returnItem.condition}
                    </Badge>
                  )}
                </div>
                {returnItem.condition && (
                  <div className="text-xs text-text-secondary">Condition: {returnItem.condition}</div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingReturn(null); resetForm(); }}
        title={editingReturn ? "Edit Return" : "New Return"}
        size="md"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <UiSelect
            label="Booking"
            required
            value={form.bookingId}
            onChange={(val) => setForm((p) => ({ ...p, bookingId: val }))}
            placeholder="Select booking"
            options={bookings.map((b) => ({ value: b.id, label: `${b.bookingNumber} - ${b.customerName}` }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Return Date & Time"
              type="datetime-local"
              value={form.returnDate}
              onChange={(e) => setForm((p) => ({ ...p, returnDate: e.target.value }))}
            />
            <UiSelect
              label="Condition"
              value={form.condition}
              onChange={(val) => setForm((p) => ({ ...p, condition: val }))}
              options={[
                { value: "NEW", label: "New" },
                { value: "GOOD", label: "Good" },
                { value: "FAIR", label: "Fair" },
                { value: "POOR", label: "Poor" },
                { value: "DAMAGED", label: "Damaged" },
              ]}
            />
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Inspection notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingReturn(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingReturn ? "Update Return" : "Create Return"}
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
