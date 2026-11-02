"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  Edit3,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
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
  getRentalEnquiries,
  getRentalEnquiryStats,
  createRentalEnquiry,
  updateRentalEnquiry,
  convertEnquiryToBooking,
  getRentalItems,
  type RentalEnquiry,
  type RentalItem,
  type EnquiryStats,
  type PaginationQuery,
} from "@/services/rental";
import { toast } from "sonner";

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline" | "brand"> = {
  NEW: "info",
  CONTACTED: "warning",
  QUOTATION_SENT: "brand",
  CONVERTED: "success",
  LOST: "danger",
};

function RowMenu({
  row,
  onEdit,
  onConvert,
}: {
  row: RentalEnquiry;
  onEdit: () => void;
  onConvert: () => void;
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
          {row.status !== "CONVERTED" && row.status !== "LOST" && (
            <Button size="xs" variant="ghost" title="Convert to Booking" onClick={() => { setOpen(false); onConvert(); }}>
              <ArrowRight size={14} />
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

export function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<RentalEnquiry[]>([]);
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<RentalEnquiry | null>(null);
  const [convertModal, setConvertModal] = useState<RentalEnquiry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    itemId: "",
    requirements: "",
    eventDate: "",
    quantity: "",
    source: "WALK_IN",
    status: "NEW",
    assignedTo: "",
  });

  const [convertForm, setConvertForm] = useState({
    startDate: "",
    endDate: "",
  });

  const pageSize = 10;

  const fetchEnquiries = useCallback(async () => {
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
      const res = await getRentalEnquiries(query);
      setEnquiries(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [statsRes, itemsRes] = await Promise.all([
        getRentalEnquiryStats(),
        getRentalItems({ pageSize: 200 }),
      ]);
      setStats(statsRes.data);
      setItems(itemsRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      customerName: "",
      phone: "",
      email: "",
      itemId: "",
      requirements: "",
      eventDate: "",
      quantity: "",
      source: "WALK_IN",
      status: "NEW",
      assignedTo: "",
    });
  };

  const openCreateModal = () => {
    setEditingEnquiry(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (enquiry: RentalEnquiry) => {
    setEditingEnquiry(enquiry);
    setForm({
      customerName: enquiry.customerName,
      phone: enquiry.phone,
      email: enquiry.email ?? "",
      itemId: enquiry.itemId ?? "",
      requirements: enquiry.requirements ?? "",
      eventDate: enquiry.eventDate?.slice(0, 10) ?? "",
      quantity: enquiry.quantity ? String(enquiry.quantity) : "",
      source: enquiry.source,
      status: enquiry.status,
      assignedTo: enquiry.assignedTo ?? "",
    });
    setModalOpen(true);
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

    setSubmitting(true);
    try {
      const payload = {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        itemId: form.itemId || null,
        requirements: form.requirements.trim() || null,
        eventDate: form.eventDate || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        source: form.source,
        status: form.status,
        assignedTo: form.assignedTo.trim() || null,
      };

      if (editingEnquiry) {
        await updateRentalEnquiry(editingEnquiry.id, payload);
        toast.success("Enquiry updated successfully");
      } else {
        await createRentalEnquiry(payload);
        toast.success("Enquiry created successfully");
      }
      setModalOpen(false);
      setEditingEnquiry(null);
      resetForm();
      fetchEnquiries();
      fetchMeta();
    } catch {
      toast.error(editingEnquiry ? "Failed to update enquiry" : "Failed to create enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (!convertModal) return;
    if (!convertForm.startDate || !convertForm.endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    try {
      await convertEnquiryToBooking(convertModal.id, {
        startDate: convertForm.startDate,
        endDate: convertForm.endDate,
      });
      toast.success("Enquiry converted to booking");
      setConvertModal(null);
      setConvertForm({ startDate: "", endDate: "" });
      fetchEnquiries();
      fetchMeta();
    } catch {
      toast.error("Failed to convert enquiry");
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filterDefs = [
    {
      key: "status", label: "Status", options: [
        { value: "NEW", label: "New" },
        { value: "CONTACTED", label: "Contacted" },
        { value: "QUOTATION_SENT", label: "Quotation Sent" },
        { value: "CONVERTED", label: "Converted" },
        { value: "LOST", label: "Lost" },
      ],
    },
  ];

  const columns = [
    {
      key: "customerName", header: "Customer", sortable: true, render: (row: RentalEnquiry) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <MessageSquare size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.customerName}</p>
            <p className="text-xs text-text-secondary">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "item", header: "Item", render: (row: RentalEnquiry) => (
        <span className="text-sm text-text-secondary">{row.item?.name ?? "-"}</span>
      ),
    },
    {
      key: "eventDate", header: "Event Date", sortable: true, render: (row: RentalEnquiry) => (
        <span className="text-xs text-text-secondary">
          {row.eventDate ? new Date(row.eventDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "source", header: "Source", render: (row: RentalEnquiry) => (
        <Badge size="sm" variant="outline">{row.source}</Badge>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalEnquiry) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalEnquiry) => (
        <RowMenu
          row={row}
          onEdit={() => openEditModal(row)}
          onConvert={() => {
            setConvertModal(row);
            setConvertForm({ startDate: "", endDate: "" });
          }}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Rental Enquiries"
      subtitle="Track and manage rental enquiries"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Enquiry
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard title="Total" value={stats?.total ?? enquiries.length} icon={<MessageSquare size={18} />} />
        <StatCard title="New" value={stats?.new_ ?? 0} icon={<MessageSquare size={18} />} />
        <StatCard title="Contacted" value={stats?.contacted ?? 0} icon={<Phone size={18} />} />
        <StatCard title="Converted" value={stats?.converted ?? 0} icon={<ArrowRight size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search enquiries..."
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
            data={enquiries}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No enquiries found"
            emptyDescription="Create your first enquiry to get started"
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
          ) : enquiries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No enquiries found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first enquiry to get started</p>
            </div>
          ) : (
            enquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <MessageSquare size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{enquiry.customerName}</p>
                      <p className="text-xs text-text-secondary truncate">{enquiry.phone}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      row={enquiry}
                      onEdit={() => openEditModal(enquiry)}
                      onConvert={() => {
                        setConvertModal(enquiry);
                        setConvertForm({ startDate: "", endDate: "" });
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge size="sm" variant={statusVariant[enquiry.status] ?? "outline"}>{enquiry.status}</Badge>
                  <Badge size="sm" variant="outline">{enquiry.source}</Badge>
                  {enquiry.item && <span className="text-text-secondary">{enquiry.item.name}</span>}
                </div>
                {enquiry.eventDate && (
                  <div className="text-xs text-text-secondary">
                    Event: {new Date(enquiry.eventDate).toLocaleDateString()}
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
        onClose={() => { setModalOpen(false); setEditingEnquiry(null); resetForm(); }}
        title={editingEnquiry ? "Edit Enquiry" : "New Enquiry"}
        size="md"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <Input
            label="Customer Name"
            required
            value={form.customerName}
            onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
            placeholder="Enter customer name"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Optional email"
            />
          </div>
          <UiSelect
            label="Item"
            value={form.itemId}
            onChange={(val) => setForm((p) => ({ ...p, itemId: val }))}
            placeholder="Select item (optional)"
            options={items.map((i) => ({ value: i.id, label: i.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Event Date"
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="1"
            />
          </div>
          <Input
            label="Requirements"
            value={form.requirements}
            onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
            placeholder="Additional requirements"
          />
          <div className="grid grid-cols-2 gap-3">
            <UiSelect
              label="Source"
              value={form.source}
              onChange={(val) => setForm((p) => ({ ...p, source: val }))}
              options={[
                { value: "WALK_IN", label: "Walk-in" },
                { value: "PHONE", label: "Phone" },
                { value: "WEBSITE", label: "Website" },
                { value: "REFERRAL", label: "Referral" },
                { value: "SOCIAL_MEDIA", label: "Social Media" },
              ]}
            />
            <UiSelect
              label="Status"
              value={form.status}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              options={[
                { value: "NEW", label: "New" },
                { value: "CONTACTED", label: "Contacted" },
                { value: "QUOTATION_SENT", label: "Quotation Sent" },
                { value: "CONVERTED", label: "Converted" },
                { value: "LOST", label: "Lost" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingEnquiry(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingEnquiry ? "Update Enquiry" : "Create Enquiry"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert to Booking Modal */}
      <Modal
        open={!!convertModal}
        onClose={() => { setConvertModal(null); setConvertForm({ startDate: "", endDate: "" }); }}
        title="Convert to Booking"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Convert enquiry from <strong>{convertModal?.customerName}</strong> to a booking.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={convertForm.startDate}
              onChange={(e) => setConvertForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={convertForm.endDate}
              onChange={(e) => setConvertForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setConvertModal(null); setConvertForm({ startDate: "", endDate: "" }); }}>
              Cancel
            </Button>
            <Button onClick={handleConvert}>
              <ArrowRight size={14} /> Convert to Booking
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
