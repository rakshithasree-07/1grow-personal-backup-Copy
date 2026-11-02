"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Calendar,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
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
  getRentalBookings,
  getRentalBookingStats,
  createRentalBooking,
  updateRentalBooking,
  updateBookingStatus,
  getRentalItems,
  type RentalBooking,
  type RentalItem,
  type BookingStats,
  type PaginationQuery,
  type CreateRentalBookingPayload,
} from "@/services/rental";
import { toast } from "sonner";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline" | "brand"> = {
  ENQUIRY: "warning",
  QUOTATION_SENT: "info",
  QUOTATION_APPROVED: "info",
  CONFIRMED: "brand",
  ADVANCE_PAID: "brand",
  DISPATCHED: "info",
  DELIVERED: "info",
  IN_PROGRESS: "warning",
  RETURN_DUE: "warning",
  RETURNED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function RowMenu({
  row,
  onEdit,
  onStatusChange,
}: {
  row: RentalBooking;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
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

  const getNextStatuses = (current: string): string[] => {
    switch (current) {
      case "ENQUIRY": return ["QUOTATION_SENT", "CANCELLED"];
      case "QUOTATION_SENT": return ["QUOTATION_APPROVED", "CANCELLED"];
      case "QUOTATION_APPROVED": return ["CONFIRMED", "CANCELLED"];
      case "CONFIRMED": return ["ADVANCE_PAID", "CANCELLED"];
      case "ADVANCE_PAID": return ["DISPATCHED", "CANCELLED"];
      case "DISPATCHED": return ["DELIVERED"];
      case "DELIVERED": return ["IN_PROGRESS"];
      case "IN_PROGRESS": return ["RETURN_DUE"];
      case "RETURN_DUE": return ["RETURNED"];
      case "RETURNED": return ["COMPLETED"];
      default: return [];
    }
  };

  const nextStatuses = getNextStatuses(row.status);

  return (
    <div className="flex items-center justify-end gap-1" ref={(el) => { ref.current = el; }}>
      {open && (
        <>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          {nextStatuses.map((s) => (
            <Button
              key={s}
              size="xs"
              variant="ghost"
              title={`Mark as ${s}`}
              onClick={() => { setOpen(false); onStatusChange(s); }}
            >
              {s === "CONFIRMED" && <CheckCircle size={14} />}
              {s === "DISPATCHED" && <Truck size={14} />}
              {s === "RETURNED" && <RotateCcw size={14} />}
              {s === "COMPLETED" && <CheckCircle size={14} />}
              {s === "CANCELLED" && <XCircle size={14} />}
            </Button>
          ))}
        </>
      )}
      <Button size="xs" variant="ghost" title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}

export function BookingsPage() {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<RentalBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    startDate: "",
    endDate: "",
    venue: "",
    notes: "",
    depositAmount: "",
    discountAmount: "",
  });

  const [formItems, setFormItems] = useState<Array<{ itemId: string; quantity: string; unitPrice: string }>>([]);

  const pageSize = 10;

  const fetchBookings = useCallback(async () => {
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
      const res = await getRentalBookings(query);
      setBookings(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [statsRes, itemsRes] = await Promise.all([
        getRentalBookingStats(),
        getRentalItems({ pageSize: 200 }),
      ]);
      setStats(statsRes.data);
      setItems(itemsRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      customerName: "",
      phone: "",
      email: "",
      startDate: "",
      endDate: "",
      venue: "",
      notes: "",
      depositAmount: "",
      discountAmount: "",
    });
    setFormItems([]);
  };

  const openCreateModal = () => {
    setEditingBooking(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (booking: RentalBooking) => {
    setEditingBooking(booking);
    setForm({
      customerName: booking.customerName,
      phone: booking.phone,
      email: booking.email ?? "",
      startDate: booking.startDate.slice(0, 10),
      endDate: booking.endDate.slice(0, 10),
      venue: booking.venue ?? "",
      notes: booking.notes ?? "",
      depositAmount: String(booking.depositAmount),
      discountAmount: String(booking.discountAmount),
    });
    setFormItems(
      booking.items?.map((bi) => ({
        itemId: bi.itemId,
        quantity: String(bi.quantity),
        unitPrice: String(bi.unitPrice),
      })) ?? []
    );
    setModalOpen(true);
  };

  const addFormItem = () => {
    setFormItems((p) => [...p, { itemId: "", quantity: "1", unitPrice: "" }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems((p) => p.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: string, value: string) => {
    setFormItems((p) => p.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end dates are required");
      return;
    }

    setSubmitting(true);
    try {
      const items = formItems
        .filter((fi) => fi.itemId)
        .map((fi) => {
          const unitPrice = Number(fi.unitPrice) || 0;
          const quantity = Number(fi.quantity) || 1;
          return {
            itemId: fi.itemId,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
          };
        });
      const discountAmount = Number(form.discountAmount) || 0;
      const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);
      const totalAmount = Math.max(0, subtotal - discountAmount);

      const payload: CreateRentalBookingPayload = {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        venue: form.venue.trim() || null,
        notes: form.notes.trim() || null,
        totalAmount,
        depositAmount: Number(form.depositAmount) || 0,
        discountAmount,
        items,
      };

      if (editingBooking) {
        await updateRentalBooking(editingBooking.id, payload as Partial<RentalBooking>);
        toast.success("Booking updated successfully");
      } else {
        await createRentalBooking(payload);
        toast.success("Booking created successfully");
      }
      setModalOpen(false);
      setEditingBooking(null);
      resetForm();
      fetchBookings();
      fetchMeta();
    } catch {
      toast.error(editingBooking ? "Failed to update booking" : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (booking: RentalBooking, newStatus: string) => {
    try {
      await updateBookingStatus(booking.id, { status: newStatus });
      toast.success(`Booking marked as ${newStatus.toLowerCase()}`);
      fetchBookings();
      fetchMeta();
    } catch {
      toast.error("Failed to update booking status");
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filterDefs = [
    {
      key: "status", label: "Status", options: [
        { value: "ENQUIRY", label: "Enquiry" },
        { value: "QUOTATION_SENT", label: "Quotation Sent" },
        { value: "QUOTATION_APPROVED", label: "Quotation Approved" },
        { value: "CONFIRMED", label: "Confirmed" },
        { value: "ADVANCE_PAID", label: "Advance Paid" },
        { value: "DISPATCHED", label: "Dispatched" },
        { value: "DELIVERED", label: "Delivered" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "RETURN_DUE", label: "Return Due" },
        { value: "RETURNED", label: "Returned" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
  ];

  const columns = [
    {
      key: "bookingNumber", header: "Booking #", sortable: true, render: (row: RentalBooking) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <Calendar size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.bookingNumber}</p>
            <p className="text-xs text-text-secondary">{new Date(row.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ),
    },
    {
      key: "customerName", header: "Customer", sortable: true, render: (row: RentalBooking) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.customerName}</p>
          <p className="text-xs text-text-secondary">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "dates", header: "Dates", render: (row: RentalBooking) => (
        <span className="text-xs text-text-secondary">
          {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "totalAmount", header: "Amount", sortable: true, render: (row: RentalBooking) => (
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums text-text-primary">{formatINR(row.totalAmount)}</p>
          <p className="text-xs text-text-secondary">Paid: {formatINR(row.paidAmount)}</p>
        </div>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalBooking) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalBooking) => (
        <RowMenu
          row={row}
          onEdit={() => openEditModal(row)}
          onStatusChange={(s) => handleStatusChange(row, s)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Rental Bookings"
      subtitle="Manage rental bookings and orders"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Booking
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <StatCard title="Total" value={stats?.total ?? bookings.length} icon={<Calendar size={18} />} />
        <StatCard title="Enquiries" value={stats?.enquiry ?? 0} icon={<Clock size={18} />} />
        <StatCard title="Confirmed" value={stats?.confirmed ?? 0} icon={<CheckCircle size={18} />} />
        <StatCard title="Dispatched" value={stats?.dispatched ?? 0} icon={<Truck size={18} />} />
        <StatCard title="Completed" value={stats?.completed ?? 0} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search bookings..."
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
            data={bookings}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No bookings found"
            emptyDescription="Create your first rental booking"
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
          ) : bookings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No bookings found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first rental booking</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <Calendar size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{booking.bookingNumber}</p>
                      <p className="text-xs text-text-secondary truncate">{booking.customerName}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      row={booking}
                      onEdit={() => openEditModal(booking)}
                      onStatusChange={(s) => handleStatusChange(booking, s)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={statusVariant[booking.status] ?? "outline"}>{booking.status}</Badge>
                  <span className="text-text-secondary">
                    {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{booking.phone}</span>
                  <span className="font-medium text-text-primary">{formatINR(booking.totalAmount)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBooking(null); resetForm(); }}
        title={editingBooking ? "Edit Booking" : "New Booking"}
        size="lg"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Customer Name"
              required
              value={form.customerName}
              onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
              placeholder="Enter customer name"
            />
            <Input
              label="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Optional email"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <Input
            label="Venue"
            value={form.venue}
            onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
            placeholder="Optional venue"
          />

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Booking Items</label>
              <Button size="xs" variant="outline" onClick={addFormItem}>
                <Plus size={12} /> Add Item
              </Button>
            </div>
            {formItems.length === 0 ? (
              <p className="text-xs text-text-secondary py-3 text-center border border-dashed border-border rounded-[var(--radius-sm)]">
                No items added yet
              </p>
            ) : (
              <div className="space-y-2">
                {formItems.map((fi, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1">
                      <UiSelect
                        value={fi.itemId}
                        onChange={(val) => updateFormItem(idx, "itemId", val)}
                        placeholder="Select item"
                        options={items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku ?? "N/A"})` }))}
                      />
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={fi.quantity}
                      onChange={(e) => updateFormItem(idx, "quantity", e.target.value)}
                      className="w-20"
                      placeholder="Qty"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={fi.unitPrice}
                      onChange={(e) => updateFormItem(idx, "unitPrice", e.target.value)}
                      className="w-28"
                      placeholder="Price"
                    />
                    <Button size="xs" variant="ghost" onClick={() => removeFormItem(idx)}>
                      <XCircle size={14} className="text-danger" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Deposit Amount (INR)"
              type="number"
              min="0"
              value={form.depositAmount}
              onChange={(e) => setForm((p) => ({ ...p, depositAmount: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Discount Amount (INR)"
              type="number"
              min="0"
              value={form.discountAmount}
              onChange={(e) => setForm((p) => ({ ...p, discountAmount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Optional notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingBooking(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingBooking ? "Update Booking" : "Create Booking"}
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
