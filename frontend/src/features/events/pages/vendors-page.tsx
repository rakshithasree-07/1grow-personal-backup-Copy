"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Truck, Edit3 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Modal, Card, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventVendors, addEventVendor, updateEventVendor, getEvents, type EventVendor, type Event } from "@/services/events";
import { toast } from "sonner";

export function VendorsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<EventVendor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formVendorName, setFormVendorName] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formService, setFormService] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      const list = res.data ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
    } catch { /* ignore */ }
  }, []);

  const fetchVendors = useCallback(async () => {
    if (!selectedEventId) { setVendors([]); return; }
    setLoading(true);
    try {
      const res = await getEventVendors(selectedEventId);
      setVendors(res.data ?? []);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const resetForm = () => { setFormVendorName(""); setFormContactName(""); setFormPhone(""); setFormService(""); setFormAmount(""); setFormNotes(""); };

  const openCreateModal = () => { setEditingVendor(null); resetForm(); setModalOpen(true); };

  const openEditModal = (vendor: EventVendor) => {
    setEditingVendor(vendor);
    setFormVendorName(vendor.vendorName);
    setFormContactName(vendor.contactName ?? "");
    setFormPhone(vendor.phone ?? "");
    setFormService(vendor.service);
    setFormAmount(vendor.amount?.toString() ?? "");
    setFormNotes(vendor.notes ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formVendorName.trim()) { toast.error("Vendor name is required"); return; }
    if (!formService.trim()) { toast.error("Service is required"); return; }
    const payload = {
      vendorName: formVendorName.trim(),
      contactName: formContactName.trim() || null,
      phone: formPhone.trim() || null,
      service: formService.trim(),
      amount: formAmount ? Number(formAmount) : null,
      notes: formNotes.trim() || null,
    };
    setSubmitting(true);
    try {
      if (editingVendor) {
        await updateEventVendor(selectedEventId, editingVendor.id, payload);
        toast.success("Vendor updated");
      } else {
        await addEventVendor(selectedEventId, payload);
        toast.success("Vendor added");
      }
      setModalOpen(false);
      setEditingVendor(null);
      resetForm();
      fetchVendors();
    } catch {
      toast.error("Failed to save vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | null) =>
    amount !== null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount) : "-";

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    PENDING: "warning", CONFIRMED: "info", COMPLETED: "success", CANCELLED: "danger",
  };

  const columns = [
    {
      key: "vendorName",
      header: "Vendor",
      render: (row: EventVendor) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10"><Truck size={14} className="text-primary" /></div>
          <div>
            <p className="font-medium text-text-primary">{row.vendorName}</p>
            {row.contactName && <p className="text-xs text-text-secondary">{row.contactName}</p>}
          </div>
        </div>
      ),
    },
    { key: "service", header: "Service", render: (row: EventVendor) => <span className="text-sm text-text-secondary">{row.service}</span> },
    { key: "amount", header: "Amount", render: (row: EventVendor) => <span className="text-sm font-medium text-text-primary">{formatCurrency(row.amount)}</span> },
    { key: "status", header: "Status", render: (row: EventVendor) => <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>{row.status}</Badge> },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row: EventVendor) => (
        <div className="flex items-center justify-end">
          <Button size="xs" variant="ghost" title="Edit" onClick={() => openEditModal(row)}><Edit3 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Vendors" subtitle="Manage event vendors" actions={<Button size="sm" onClick={openCreateModal}><Plus size={16} /> Add Vendor</Button>}>
      <Card>
        <div className="p-4 border-b border-border">
          <UiSelect label="Select Event" placeholder="Choose an event" value={selectedEventId} onChange={setSelectedEventId} options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))} />
        </div>
        <div className="hidden sm:block">
          <Table columns={columns} data={vendors} loading={loading} emptyTitle="No vendors" emptyDescription="Add vendors for this event" />
        </div>
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)
          ) : vendors.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm text-text-secondary">No vendors</p></div>
          ) : (
            vendors.map((vendor) => (
              <div key={vendor.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{vendor.vendorName}</p>
                    <p className="text-xs text-text-secondary">{vendor.service}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge size="sm" variant={statusVariant[vendor.status] ?? "outline"}>{vendor.status}</Badge>
                    <Button size="xs" variant="ghost" onClick={() => openEditModal(vendor)}><Edit3 size={14} /></Button>
                  </div>
                </div>
                <p className="text-xs text-text-primary font-medium">{formatCurrency(vendor.amount)}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingVendor(null); resetForm(); }} title={editingVendor ? "Edit Vendor" : "Add Vendor"} size="md" className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end">
        <div className="space-y-4">
          <Input label="Vendor Name" required value={formVendorName} onChange={(e) => setFormVendorName(e.target.value)} placeholder="Vendor name" />
          <Input label="Contact Name" value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="Contact person" />
          <Input label="Phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone number" />
          <Input label="Service" required value={formService} onChange={(e) => setFormService(e.target.value)} placeholder="Service provided" />
          <Input label="Amount (INR)" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" />
          <Input label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingVendor(null); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>{editingVendor ? "Update" : "Add"}</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
