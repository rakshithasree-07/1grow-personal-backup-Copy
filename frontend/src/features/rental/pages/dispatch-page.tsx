"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Truck,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  Clock,
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
  getDispatchList,
  createDispatch,
  updateDispatch,
  getRentalBookings,
  type RentalDispatch,
  type RentalBooking,
  type PaginationQuery,
} from "@/services/rental";
import { toast } from "sonner";

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline"> = {
  PENDING: "warning",
  DISPATCHED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

function RowMenu({
  row,
  onEdit,
}: {
  row: RentalDispatch;
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

export function DispatchPage() {
  const [dispatches, setDispatches] = useState<RentalDispatch[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<RentalDispatch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    bookingId: "",
    dispatchDate: "",
    expectedReturn: "",
    receivedBy: "",
    condition: "GOOD",
    notes: "",
  });

  const pageSize = 10;

  const fetchDispatches = useCallback(async () => {
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
      const res = await getDispatchList(query);
      setDispatches(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setDispatches([]);
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

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      bookingId: "",
      dispatchDate: "",
      expectedReturn: "",
      receivedBy: "",
      condition: "GOOD",
      notes: "",
    });
  };

  const openCreateModal = () => {
    setEditingDispatch(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (dispatch: RentalDispatch) => {
    setEditingDispatch(dispatch);
    setForm({
      bookingId: dispatch.bookingId,
      dispatchDate: dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toISOString().slice(0, 16) : "",
      expectedReturn: dispatch.expectedReturn ? new Date(dispatch.expectedReturn).toISOString().slice(0, 16) : "",
      receivedBy: dispatch.receivedBy ?? "",
      condition: dispatch.condition ?? "GOOD",
      notes: dispatch.notes ?? "",
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
        dispatchDate: form.dispatchDate || new Date().toISOString().slice(0, 16),
        expectedReturn: form.expectedReturn || undefined,
        receivedBy: form.receivedBy.trim() || undefined,
        condition: form.condition,
        notes: form.notes.trim() || null,
      };

      if (editingDispatch) {
        await updateDispatch(editingDispatch.id, payload);
        toast.success("Dispatch updated successfully");
      } else {
        await createDispatch(payload);
        toast.success("Dispatch created successfully");
      }
      setModalOpen(false);
      setEditingDispatch(null);
      resetForm();
      fetchDispatches();
    } catch {
      toast.error(editingDispatch ? "Failed to update dispatch" : "Failed to create dispatch");
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
        { value: "DISPATCHED", label: "Dispatched" },
        { value: "DELIVERED", label: "Delivered" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
  ];

  const columns = [
    {
      key: "dispatchNumber", header: "Dispatch #", sortable: true, render: (row: RentalDispatch) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <Truck size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.dispatchNumber}</p>
            <p className="text-xs text-text-secondary">
              {row.dispatchDate ? new Date(row.dispatchDate).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "booking", header: "Booking", render: (row: RentalDispatch) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.booking?.bookingNumber ?? "-"}</p>
          <p className="text-xs text-text-secondary">{row.booking?.customerName ?? ""}</p>
        </div>
      ),
    },
    {
      key: "receivedBy", header: "Received By", render: (row: RentalDispatch) => (
        <span className="text-sm text-text-secondary">{row.receivedBy ?? "-"}</span>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalDispatch) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalDispatch) => (
        <RowMenu row={row} onEdit={() => openEditModal(row)} />
      ),
    },
  ];

  return (
    <PageContainer
      title="Dispatch"
      subtitle="Manage item dispatches"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Dispatch
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard title="Total" value={dispatches.length} icon={<Truck size={18} />} />
        <StatCard title="Pending" value={dispatches.filter((d) => d.status === "PENDING").length} icon={<Clock size={18} />} />
        <StatCard title="Dispatched" value={dispatches.filter((d) => d.status === "DISPATCHED").length} icon={<Package size={18} />} />
        <StatCard title="Delivered" value={dispatches.filter((d) => d.status === "DELIVERED").length} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search dispatches..."
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
            data={dispatches}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No dispatches found"
            emptyDescription="Create your first dispatch record"
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
          ) : dispatches.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No dispatches found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first dispatch record</p>
            </div>
          ) : (
            dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <Truck size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{dispatch.dispatchNumber}</p>
                      <p className="text-xs text-text-secondary truncate">{dispatch.booking?.bookingNumber ?? "-"}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu row={dispatch} onEdit={() => openEditModal(dispatch)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={statusVariant[dispatch.status] ?? "outline"}>{dispatch.status}</Badge>
                  {dispatch.receivedBy && <span className="text-text-secondary">By: {dispatch.receivedBy}</span>}
                </div>
                {dispatch.dispatchDate && (
                  <div className="text-xs text-text-secondary">
                    {new Date(dispatch.dispatchDate).toLocaleDateString()}
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
        onClose={() => { setModalOpen(false); setEditingDispatch(null); resetForm(); }}
        title={editingDispatch ? "Edit Dispatch" : "New Dispatch"}
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
              label="Dispatch Date"
              type="datetime-local"
              value={form.dispatchDate}
              onChange={(e) => setForm((p) => ({ ...p, dispatchDate: e.target.value }))}
            />
            <Input
              label="Expected Return"
              type="datetime-local"
              value={form.expectedReturn}
              onChange={(e) => setForm((p) => ({ ...p, expectedReturn: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Received By"
              value={form.receivedBy}
              onChange={(e) => setForm((p) => ({ ...p, receivedBy: e.target.value }))}
              placeholder="Person receiving items"
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
            placeholder="Optional notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingDispatch(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingDispatch ? "Update Dispatch" : "Create Dispatch"}
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
