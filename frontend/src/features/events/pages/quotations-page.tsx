"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, Edit3, MoreHorizontal, Eye, Send, CheckCircle2, XCircle } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Pagination, SearchBar, Modal, Card, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventQuotations, createEventQuotation, updateQuotationStatus, getEvents, type EventQuotation, type Event } from "@/services/events";
import { toast } from "sonner";

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<EventQuotation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [formSubtotal, setFormSubtotal] = useState("");
  const [formTax, setFormTax] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const pageSize = 10;

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEventQuotations({ page, pageSize, search });
      setQuotations(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      setEvents(res.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    const subtotal = Number(formSubtotal) || 0;
    const tax = Number(formTax) || 0;
    const discount = Number(formDiscount) || 0;
    setSubmitting(true);
    try {
      await createEventQuotation({
        title: formTitle.trim(),
        eventId: formEventId || null,
        subtotal,
        taxAmount: tax,
        discountAmount: discount,
        totalAmount: subtotal + tax - discount,
        notes: formNotes.trim() || null,
      } as Partial<EventQuotation>);
      toast.success("Quotation created");
      setModalOpen(false);
      setFormTitle("");
      setFormEventId("");
      setFormSubtotal("");
      setFormTax("");
      setFormDiscount("");
      setFormNotes("");
      fetchQuotations();
    } catch {
      toast.error("Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (quotation: EventQuotation, status: string) => {
    try {
      await updateQuotationStatus(quotation.id, status);
      toast.success(`Quotation ${status.toLowerCase()}`);
      fetchQuotations();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    DRAFT: "warning", SENT: "info", APPROVED: "success", REJECTED: "danger",
  };

  const columns = [
    {
      key: "quotationNumber",
      header: "Quote #",
      render: (row: EventQuotation) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <FileText size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.quotationNumber}</p>
            <p className="text-xs text-text-secondary truncate max-w-[180px]">{row.title}</p>
          </div>
        </div>
      ),
    },
    { key: "event", header: "Event", render: (row: EventQuotation) => <span className="text-sm text-text-secondary">{row.event?.title ?? "-"}</span> },
    { key: "total", header: "Total", render: (row: EventQuotation) => <span className="text-sm font-medium text-text-primary">{formatCurrency(row.totalAmount)}</span> },
    { key: "status", header: "Status", render: (row: EventQuotation) => <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>{row.status}</Badge> },
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (row: EventQuotation) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "DRAFT" && (
            <Button size="xs" variant="ghost" title="Send" onClick={() => handleStatusChange(row, "SENT")}>
              <Send size={14} />
            </Button>
          )}
          {row.status === "SENT" && (
            <>
              <Button size="xs" variant="ghost" title="Approve" onClick={() => handleStatusChange(row, "APPROVED")}>
                <CheckCircle2 size={14} className="text-success" />
              </Button>
              <Button size="xs" variant="ghost" title="Reject" onClick={() => handleStatusChange(row, "REJECTED")}>
                <XCircle size={14} className="text-danger" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Quotations"
      subtitle="Manage event quotations"
      actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> New Quotation</Button>}
    >
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search quotations..." className="max-w-xs" />
        </div>
        <div className="hidden sm:block">
          <Table columns={columns} data={quotations} loading={loading} emptyTitle="No quotations found" emptyDescription="Create your first quotation" />
          <div className="px-4 py-3"><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></div>
        </div>
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />)
          ) : quotations.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm text-text-secondary">No quotations found</p></div>
          ) : (
            quotations.map((q) => (
              <div key={q.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{q.quotationNumber}</p>
                    <p className="text-xs text-text-secondary">{q.title}</p>
                  </div>
                  <Badge size="sm" variant={statusVariant[q.status] ?? "outline"}>{q.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{q.event?.title ?? "-"}</span>
                  <span className="font-medium text-text-primary">{formatCurrency(q.totalAmount)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Quotation" size="lg" className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end">
        <div className="space-y-4">
          <Input label="Title" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Quotation title" />
          <UiSelect label="Event" placeholder="Select event" value={formEventId} onChange={setFormEventId} options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Subtotal (INR)" type="number" value={formSubtotal} onChange={(e) => setFormSubtotal(e.target.value)} placeholder="0" />
            <Input label="Tax (INR)" type="number" value={formTax} onChange={(e) => setFormTax(e.target.value)} placeholder="0" />
            <Input label="Discount (INR)" type="number" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} placeholder="0" />
          </div>
          <Input label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button onClick={() => setModalOpen(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform">
          <Plus size={24} />
        </button>
      </div>
    </PageContainer>
  );
}
