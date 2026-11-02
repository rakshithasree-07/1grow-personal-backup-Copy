"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  FileText,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Calendar,
  Trash2,
  Send,
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
  ConfirmModal,
  Card,
  StatCard,
  Skeleton,
  Input,
  Select as UiSelect,
} from "@/components/ui";
import {
  getRentalBookings,
  getRentalEnquiries,
  getRentalItems,
  convertEnquiryToBooking,
  createRentalBooking,
  updateRentalBooking,
  updateBookingStatus,
  type RentalBooking,
  type RentalEnquiry,
  type RentalItem,
  type PaginationQuery,
  type CreateRentalBookingPayload,
} from "@/services/rental";
import { toast } from "sonner";

const QUOTATION_STATUSES = ["ENQUIRY", "QUOTATION_SENT", "QUOTATION_APPROVED"];

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
  QUOTATION_APPROVED: "success",
};

interface QuoteItemRow {
  itemId: string;
  quantity: string;
  unitPrice: string;
}

function RowMenu({
  row,
  onEdit,
  onApprove,
  onConfirm,
  onCancel,
}: {
  row: RentalBooking;
  onEdit: () => void;
  onApprove: () => void;
  onConfirm: () => void;
  onCancel: () => void;
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
          <Button size="xs" variant="ghost" title="Edit quotation" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          {row.status !== "QUOTATION_APPROVED" && row.status !== "CANCELLED" && (
            <Button size="xs" variant="ghost" title="Mark approved" onClick={() => { setOpen(false); onApprove(); }}>
              <CheckCircle size={14} />
            </Button>
          )}
          {row.status === "QUOTATION_APPROVED" && (
            <Button size="xs" variant="ghost" title="Confirm booking" onClick={() => { setOpen(false); onConfirm(); }}>
              <Calendar size={14} />
            </Button>
          )}
          {row.status !== "CANCELLED" && (
            <Button size="xs" variant="ghost" title="Cancel quotation" onClick={() => { setOpen(false); onCancel(); }}>
              <XCircle size={14} />
            </Button>
          )}
        </>
      )}
      <Button size="xs" variant="ghost" title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<RentalBooking[]>([]);
  const [enquiries, setEnquiries] = useState<RentalEnquiry[]>([]);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<RentalBooking | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<RentalBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    enquiryId: "",
    customerName: "",
    phone: "",
    email: "",
    startDate: "",
    endDate: "",
    venue: "",
    notes: "",
    depositAmount: "",
    discountAmount: "",
    taxAmount: "",
  });
  const [formItems, setFormItems] = useState<QuoteItemRow[]>([]);

  const pageSize = 10;

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const query: PaginationQuery = { page: 1, pageSize: 200, search, status: activeFilters.status };
      const res = await getRentalBookings(query);
      const filtered = (res.data ?? []).filter((b) => QUOTATION_STATUSES.includes(b.status));
      setQuotations(filtered);
      setTotal(filtered.length);
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeFilters.status]);

  const fetchMeta = useCallback(async () => {
    try {
      const [enqRes, itemsRes] = await Promise.all([
        getRentalEnquiries({ pageSize: 200 }),
        getRentalItems({ pageSize: 200 }),
      ]);
      setEnquiries((enqRes.data ?? []).filter((e) => !["CONVERTED", "LOST"].includes(e.status)));
      setItems(itemsRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      enquiryId: "",
      customerName: "",
      phone: "",
      email: "",
      startDate: "",
      endDate: "",
      venue: "",
      notes: "",
      depositAmount: "",
      discountAmount: "",
      taxAmount: "",
    });
    setFormItems([]);
  };

  const openCreateModal = () => {
    setEditingQuote(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (booking: RentalBooking) => {
    setEditingQuote(booking);
    setForm({
      enquiryId: "",
      customerName: booking.customerName,
      phone: booking.phone,
      email: booking.email ?? "",
      startDate: booking.startDate.slice(0, 10),
      endDate: booking.endDate.slice(0, 10),
      venue: booking.venue ?? "",
      notes: booking.notes ?? "",
      depositAmount: String(booking.depositAmount),
      discountAmount: String(booking.discountAmount),
      taxAmount: String(booking.taxAmount),
    });
    setFormItems(
      booking.items?.map((bi) => ({
        itemId: bi.itemId,
        quantity: String(bi.quantity),
        unitPrice: String(bi.unitPrice),
      })) ?? [],
    );
    setModalOpen(true);
  };

  const selectEnquiry = (enquiryId: string) => {
    const enquiry = enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) return;
    setForm((p) => ({
      ...p,
      enquiryId,
      customerName: enquiry.customerName,
      phone: enquiry.phone,
      email: enquiry.email ?? "",
      startDate: enquiry.eventDate ? enquiry.eventDate.slice(0, 10) : "",
      endDate: enquiry.eventEndDate ? enquiry.eventEndDate.slice(0, 10) : "",
      notes: enquiry.requirements ?? "",
    }));
    if (enquiry.itemId) {
      const item = items.find((i) => i.id === enquiry.itemId);
      if (item) {
        setFormItems([{ itemId: item.id, quantity: String(enquiry.quantity ?? 1), unitPrice: String(item.rentalPrice) }]);
      }
    }
  };

  const addFormItem = () => {
    setFormItems((p) => [...p, { itemId: "", quantity: "1", unitPrice: "" }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems((p) => p.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: string, value: string) => {
    if (field === "itemId") {
      const item = items.find((i) => i.id === value);
      setFormItems((p) =>
        p.map((row, i) =>
          i === index
            ? { ...row, itemId: value, unitPrice: item ? String(item.rentalPrice) : row.unitPrice }
            : row,
        ),
      );
    } else {
      setFormItems((p) => p.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    }
  };

  const computeTotals = () => {
    const itemsRows = formItems.filter((fi) => fi.itemId);
    const subtotal = itemsRows.reduce((s, fi) => s + (Number(fi.unitPrice) || 0) * (Number(fi.quantity) || 1), 0);
    const discount = Number(form.discountAmount) || 0;
    const tax = Number(form.taxAmount) || 0;
    const totalAmount = Math.max(0, subtotal - discount + tax);
    return { subtotal, totalAmount, discount, tax };
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error("Customer name and phone are required");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (formItems.filter((fi) => fi.itemId).length === 0) {
      toast.error("Add at least one item to the quotation");
      return;
    }

    setSubmitting(true);
    try {
      const { totalAmount } = computeTotals();
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
        discountAmount: Number(form.discountAmount) || 0,
        taxAmount: Number(form.taxAmount) || 0,
        items: formItems
          .filter((fi) => fi.itemId)
          .map((fi) => {
            const unitPrice = Number(fi.unitPrice) || 0;
            const quantity = Number(fi.quantity) || 1;
            return { itemId: fi.itemId, quantity, unitPrice, totalPrice: unitPrice * quantity };
          }),
      };

      if (editingQuote) {
        await updateRentalBooking(editingQuote.id, payload as Partial<RentalBooking>);
        if (editingQuote.status === "ENQUIRY") {
          await updateBookingStatus(editingQuote.id, { status: "QUOTATION_SENT" });
        }
        toast.success("Quotation updated successfully");
      } else if (form.enquiryId) {
        const res = await convertEnquiryToBooking(form.enquiryId);
        const bookingId = res.data.booking.id;
        await updateRentalBooking(bookingId, payload as Partial<RentalBooking>);
        await updateBookingStatus(bookingId, { status: "QUOTATION_SENT" });
        toast.success("Enquiry converted and quotation sent");
      } else {
        const res = await createRentalBooking(payload);
        await updateBookingStatus(res.data.id, { status: "QUOTATION_SENT" });
        toast.success("Quotation created successfully");
      }

      setModalOpen(false);
      setEditingQuote(null);
      resetForm();
      fetchQuotations();
      fetchMeta();
    } catch {
      toast.error(editingQuote ? "Failed to update quotation" : "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (booking: RentalBooking) => {
    try {
      await updateBookingStatus(booking.id, { status: "QUOTATION_APPROVED" });
      toast.success("Quotation approved");
      fetchQuotations();
    } catch {
      toast.error("Failed to approve quotation");
    }
  };

  const handleConfirm = async (booking: RentalBooking) => {
    try {
      await updateBookingStatus(booking.id, { status: "CONFIRMED" });
      toast.success("Booking confirmed");
      fetchQuotations();
    } catch {
      toast.error("Failed to confirm booking");
    }
  };

  const handleCancel = async (booking: RentalBooking) => {
    try {
      await updateBookingStatus(booking.id, { status: "CANCELLED" });
      toast.success("Quotation cancelled");
      setCancelConfirm(null);
      fetchQuotations();
    } catch {
      toast.error("Failed to cancel quotation");
    }
  };

  const filterDefs = [
    {
      key: "status", label: "Status", options: [
        { value: "ENQUIRY", label: "Enquiry" },
        { value: "QUOTATION_SENT", label: "Quotation Sent" },
        { value: "QUOTATION_APPROVED", label: "Approved" },
      ],
    },
  ];

  const counts = {
    enquiry: quotations.filter((q) => q.status === "ENQUIRY").length,
    sent: quotations.filter((q) => q.status === "QUOTATION_SENT").length,
    approved: quotations.filter((q) => q.status === "QUOTATION_APPROVED").length,
  };

  const columns = [
    {
      key: "bookingNumber", header: "Quote #", sortable: true, render: (row: RentalBooking) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <FileText size={14} className="text-primary" />
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
      key: "items", header: "Items", render: (row: RentalBooking) => (
        <span className="text-sm tabular-nums text-text-secondary">{row.items?.length ?? 0}</span>
      ),
    },
    {
      key: "totalAmount", header: "Total", sortable: true, render: (row: RentalBooking) => (
        <span className="text-sm font-medium tabular-nums text-text-primary">{formatINR(row.totalAmount)}</span>
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
          onApprove={() => handleApprove(row)}
          onConfirm={() => handleConfirm(row)}
          onCancel={() => setCancelConfirm(row)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Rental Quotations"
      subtitle="Build, send and approve rental quotations"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Quotation
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <StatCard title="Enquiries" value={counts.enquiry} icon={<FileText size={18} />} />
        <StatCard title="Quotations Sent" value={counts.sent} icon={<Send size={18} />} />
        <StatCard title="Approved" value={counts.approved} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search quotations..."
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

        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={quotations}
            loading={loading}
            emptyTitle="No quotations found"
            emptyDescription="Create your first rental quotation"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>

        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />
            ))
          ) : quotations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No quotations found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first rental quotation</p>
            </div>
          ) : (
            quotations.map((quote) => (
              <div
                key={quote.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <FileText size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{quote.bookingNumber}</p>
                      <p className="text-xs text-text-secondary truncate">{quote.customerName}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      row={quote}
                      onEdit={() => openEditModal(quote)}
                      onApprove={() => handleApprove(quote)}
                      onConfirm={() => handleConfirm(quote)}
                      onCancel={() => setCancelConfirm(quote)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={statusVariant[quote.status] ?? "outline"}>{quote.status}</Badge>
                  <span className="text-text-secondary">
                    {new Date(quote.startDate).toLocaleDateString()} - {new Date(quote.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{quote.items?.length ?? 0} item(s)</span>
                  <span className="font-medium text-text-primary">{formatINR(quote.totalAmount)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingQuote(null); resetForm(); }}
        title={editingQuote ? "Edit Quotation" : "New Quotation"}
        description="Quotations are converted into confirmed bookings once approved"
        size="lg"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          {!editingQuote && (
            <UiSelect
              label="Convert from Enquiry"
              value={form.enquiryId}
              onChange={selectEnquiry}
              placeholder="Optional: pick an enquiry to prefill"
              options={enquiries.map((e) => ({ value: e.id, label: `${e.customerName} - ${e.phone}` }))}
            />
          )}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Quotation Items</label>
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
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Deposit (INR)"
              type="number"
              min="0"
              value={form.depositAmount}
              onChange={(e) => setForm((p) => ({ ...p, depositAmount: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Discount (INR)"
              type="number"
              min="0"
              value={form.discountAmount}
              onChange={(e) => setForm((p) => ({ ...p, discountAmount: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Tax (INR)"
              type="number"
              min="0"
              value={form.taxAmount}
              onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div className="rounded-[var(--radius-sm)] border border-border-subtle bg-surface-overlay px-4 py-3 text-sm">
            <span className="text-text-secondary">Total: </span>
            <span className="font-semibold text-text-primary">{formatINR(computeTotals().totalAmount)}</span>
          </div>

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Terms and notes"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingQuote(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingQuote ? "Update Quotation" : "Send Quotation"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        onConfirm={async () => {
          if (cancelConfirm) await handleCancel(cancelConfirm);
        }}
        title="Cancel Quotation"
        description={`Cancel quotation "${cancelConfirm?.bookingNumber}"? This will also cancel the booking.`}
        confirmLabel="Cancel"
        intent="danger"
      />

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
