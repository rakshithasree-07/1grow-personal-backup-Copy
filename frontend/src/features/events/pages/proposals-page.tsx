"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  FileText,
  Edit3,
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Table,
  Badge,
  Pagination,
  SearchBar,
  Modal,
  ConfirmModal,
  Card,
  Skeleton,
  Input,
  Select as UiSelect,
} from "@/components/ui";
import {
  getEventProposals,
  getEventProposal,
  createEventProposal,
  updateEventProposal,
  updateProposalStatus,
  getEvents,
  type EventProposal,
  type Event,
} from "@/services/events";
import { toast } from "sonner";

function RowMenu({
  row,
  onView,
  onEdit,
  onSend,
  onApprove,
  onReject,
}: {
  row: EventProposal;
  onView: () => void;
  onEdit: () => void;
  onSend: () => void;
  onApprove: () => void;
  onReject: () => void;
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
          <Button size="xs" variant="ghost" title="View" onClick={() => { setOpen(false); onView(); }}>
            <Eye size={14} />
          </Button>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          {row.status === "DRAFT" && (
            <Button size="xs" variant="ghost" title="Send" onClick={() => { setOpen(false); onSend(); }}>
              <Send size={14} />
            </Button>
          )}
          {row.status === "SENT" && (
            <>
              <Button size="xs" variant="ghost" title="Approve" onClick={() => { setOpen(false); onApprove(); }}>
                <CheckCircle2 size={14} className="text-success" />
              </Button>
              <Button size="xs" variant="ghost" title="Reject" onClick={() => { setOpen(false); onReject(); }}>
                <XCircle size={14} className="text-danger" />
              </Button>
            </>
          )}
        </>
      )}
      <Button size="xs" variant="ghost" title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}

export function ProposalsPage() {
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<EventProposal | null>(null);
  const [detailProposal, setDetailProposal] = useState<EventProposal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [formScope, setFormScope] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const pageSize = 10;

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEventProposals({ page, pageSize, search });
      setProposals(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setProposals([]);
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

  useEffect(() => { fetchProposals(); }, [fetchProposals]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setFormTitle("");
    setFormEventId("");
    setFormScope("");
    setFormAmount("");
    setFormValidUntil("");
    setFormNotes("");
  };

  const openCreateModal = () => {
    setEditingProposal(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (proposal: EventProposal) => {
    setEditingProposal(proposal);
    setFormTitle(proposal.title);
    setFormEventId(proposal.eventId ?? "");
    setFormScope(proposal.scope ?? "");
    setFormAmount(proposal.totalAmount.toString());
    setFormValidUntil(proposal.validUntil ? proposal.validUntil.slice(0, 10) : "");
    setFormNotes(proposal.notes ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      eventId: formEventId || null,
      scope: formScope.trim() || null,
      totalAmount: formAmount ? Number(formAmount) : 0,
      validUntil: formValidUntil || null,
      notes: formNotes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingProposal) {
        await updateEventProposal(editingProposal.id, payload as Partial<EventProposal>);
        toast.success("Proposal updated");
      } else {
        await createEventProposal(payload as Partial<EventProposal>);
        toast.success("Proposal created");
      }
      setModalOpen(false);
      setEditingProposal(null);
      resetForm();
      fetchProposals();
    } catch {
      toast.error("Failed to save proposal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (proposal: EventProposal, status: string) => {
    try {
      await updateProposalStatus(proposal.id, status);
      toast.success(`Proposal ${status.toLowerCase()}`);
      fetchProposals();
    } catch {
      toast.error("Failed to update proposal status");
    }
  };

  const openDetail = async (proposal: EventProposal) => {
    try {
      const res = await getEventProposal(proposal.id);
      setDetailProposal(res.data);
    } catch {
      setDetailProposal(proposal);
    }
  };

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    DRAFT: "warning",
    SENT: "info",
    APPROVED: "success",
    REJECTED: "danger",
    EXPIRED: "danger",
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const columns = [
    {
      key: "proposalNumber",
      header: "Proposal #",
      render: (row: EventProposal) => (
        <button onClick={() => openDetail(row)} className="flex items-center gap-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <FileText size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.proposalNumber}</p>
            <p className="text-xs text-text-secondary truncate max-w-[180px]">{row.title}</p>
          </div>
        </button>
      ),
    },
    {
      key: "event",
      header: "Event",
      render: (row: EventProposal) => (
        <span className="text-sm text-text-secondary">{row.event?.title ?? "-"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row: EventProposal) => (
        <span className="text-sm font-medium text-text-primary">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: EventProposal) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>{row.status}</Badge>
      ),
    },
    {
      key: "validUntil",
      header: "Valid Until",
      render: (row: EventProposal) => (
        <span className="text-xs text-text-secondary">{formatDate(row.validUntil)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (row: EventProposal) => (
        <RowMenu
          row={row}
          onView={() => openDetail(row)}
          onEdit={() => openEditModal(row)}
          onSend={() => handleStatusChange(row, "SENT")}
          onApprove={() => handleStatusChange(row, "APPROVED")}
          onReject={() => handleStatusChange(row, "REJECTED")}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Proposals"
      subtitle="Manage event proposals"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Proposal
        </Button>
      }
    >
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search proposals..." className="max-w-xs" />
        </div>
        {/* Desktop: Table */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={proposals}
            loading={loading}
            emptyTitle="No proposals found"
            emptyDescription="Create your first proposal to get started"
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
          ) : proposals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No proposals found</p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => openDetail(proposal)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openDetail(proposal)}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <FileText size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{proposal.proposalNumber}</p>
                      <p className="text-xs text-text-secondary truncate">{proposal.title}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      row={proposal}
                      onView={() => openDetail(proposal)}
                      onEdit={() => openEditModal(proposal)}
                      onSend={() => handleStatusChange(proposal, "SENT")}
                      onApprove={() => handleStatusChange(proposal, "APPROVED")}
                      onReject={() => handleStatusChange(proposal, "REJECTED")}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-text-secondary">{proposal.event?.title ?? "No Event"}</span>
                  <span className="font-medium text-text-primary">{formatCurrency(proposal.totalAmount)}</span>
                  <Badge size="sm" variant={statusVariant[proposal.status] ?? "outline"}>{proposal.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProposal(null); resetForm(); }}
        title={editingProposal ? "Edit Proposal" : "Create Proposal"}
        size="lg"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Proposal title"
          />
          <UiSelect
            label="Event"
            placeholder="Select event"
            value={formEventId}
            onChange={setFormEventId}
            options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))}
          />
          <Input
            label="Scope"
            value={formScope}
            onChange={(e) => setFormScope(e.target.value)}
            placeholder="Scope of work"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Amount (INR)"
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Valid Until"
              type="date"
              value={formValidUntil}
              onChange={(e) => setFormValidUntil(e.target.value)}
            />
          </div>
          <Input
            label="Notes"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Additional notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingProposal(null); resetForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingProposal ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailProposal}
        onClose={() => setDetailProposal(null)}
        title={detailProposal?.title ?? "Proposal Details"}
        size="lg"
      >
        {detailProposal && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-surface-raised">
              <FileText size={24} className="text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-lg font-semibold text-text-primary">{detailProposal.title}</p>
                <p className="text-sm text-text-secondary">{detailProposal.proposalNumber}</p>
              </div>
              <Badge variant={statusVariant[detailProposal.status] ?? "outline"}>{detailProposal.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Amount</p>
                <p className="text-sm font-medium text-text-primary">{formatCurrency(detailProposal.totalAmount)}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Valid Until</p>
                <p className="text-sm font-medium text-text-primary">{formatDate(detailProposal.validUntil)}</p>
              </div>
            </div>
            {detailProposal.scope && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Scope</p>
                <p className="text-sm text-text-primary">{detailProposal.scope}</p>
              </div>
            )}
            {detailProposal.event && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Event</p>
                <p className="text-sm text-text-primary">{detailProposal.event.title}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

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
