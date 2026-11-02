"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Edit3,
  Archive,
  RotateCcw,
  Eye,
  MoreHorizontal,
  TrendingUp,
  CheckCircle2,
  FileText,
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
  getEvents,
  getEventStats,
  getEvent,
  createEvent,
  updateEvent,
  updateEventStatus,
  archiveEvent,
  restoreEvent,
  getEventClients,
  getEventTypes,
  type Event,
  type EventStats,
  type EventClient,
  type EventType,
} from "@/services/events";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

function RowMenu({
  row,
  onView,
  onEdit,
  onRestore,
  onArchive,
}: {
  row: Event;
  onView: () => void;
  onEdit: () => void;
  onRestore: () => void;
  onArchive: () => void;
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
          <Button size="xs" variant="ghost" title="View details" onClick={() => { setOpen(false); onView(); }}>
            <Eye size={14} />
          </Button>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          {row.isArchived ? (
            <Button size="xs" variant="ghost" title="Restore" onClick={() => { setOpen(false); onRestore(); }}>
              <RotateCcw size={14} />
            </Button>
          ) : (
            <Button size="xs" variant="ghost" title="Archive" onClick={() => { setOpen(false); onArchive(); }}>
              <Archive size={14} />
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

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [clients, setClients] = useState<EventClient[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Event | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<Event | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEventTypeId, setFormEventTypeId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEventDate, setFormEventDate] = useState("");
  const [formEventEndDate, setFormEventEndDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formExpectedGuests, setFormExpectedGuests] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const pageSize = 10;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvents({
        page,
        pageSize,
        search,
        status: activeFilters.status,
        clientId: activeFilters.clientId,
        sortBy: sortKey,
        sortDir,
      });
      setEvents(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [statsRes, clientsRes, typesRes] = await Promise.all([
        getEventStats().catch(() => null),
        getEventClients({ pageSize: 100 }).catch(() => ({ data: [] })),
        getEventTypes().catch(() => ({ data: [] })),
      ]);
      if (statsRes?.data) setStats(statsRes.data);
      setClients(clientsRes.data ?? []);
      setEventTypes(typesRes.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormEventTypeId("");
    setFormClientId("");
    setFormVenue("");
    setFormAddress("");
    setFormEventDate("");
    setFormEventEndDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormExpectedGuests("");
    setFormBudget("");
    setFormNotes("");
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description ?? "");
    setFormEventTypeId(event.eventTypeId ?? "");
    setFormClientId(event.clientId ?? "");
    setFormVenue(event.venue ?? "");
    setFormAddress(event.address ?? "");
    setFormEventDate(event.eventDate ? event.eventDate.slice(0, 10) : "");
    setFormEventEndDate(event.eventEndDate ? event.eventEndDate.slice(0, 10) : "");
    setFormStartTime(event.startTime ?? "");
    setFormEndTime(event.endTime ?? "");
    setFormExpectedGuests(event.expectedGuests?.toString() ?? "");
    setFormBudget(event.budget?.toString() ?? "");
    setFormNotes(event.notes ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (!formEventDate) { toast.error("Event date is required"); return; }

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      eventTypeId: formEventTypeId || null,
      clientId: formClientId || null,
      venue: formVenue.trim() || null,
      address: formAddress.trim() || null,
      eventDate: formEventDate,
      eventEndDate: formEventEndDate || null,
      startTime: formStartTime || null,
      endTime: formEndTime || null,
      expectedGuests: formExpectedGuests ? Number(formExpectedGuests) : null,
      budget: formBudget ? Number(formBudget) : null,
      notes: formNotes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, payload as Partial<Event>);
        toast.success("Event updated successfully");
      } else {
        await createEvent(payload as Partial<Event>);
        toast.success("Event created successfully");
      }
      setModalOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
      fetchMeta();
    } catch {
      toast.error("Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (event: Event, newStatus: string) => {
    try {
      await updateEventStatus(event.id, newStatus);
      toast.success(`Event status changed to ${newStatus}`);
      fetchEvents();
      fetchMeta();
    } catch {
      toast.error("Failed to update event status");
    }
  };

  const handleArchive = async (event: Event) => {
    try {
      await archiveEvent(event.id);
      toast.success("Event archived");
      fetchEvents();
      fetchMeta();
    } catch {
      toast.error("Failed to archive event");
    }
  };

  const handleRestore = async (event: Event) => {
    try {
      await restoreEvent(event.id);
      toast.success("Event restored");
      setRestoreConfirm(null);
      fetchEvents();
      fetchMeta();
    } catch {
      toast.error("Failed to restore event");
    }
  };

  const openDetail = async (event: Event) => {
    try {
      const res = await getEvent(event.id);
      setDetailEvent(res.data);
    } catch {
      setDetailEvent(event);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    DRAFT: "warning",
    CONFIRMED: "info",
    IN_PROGRESS: "success",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  const executionVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    NOT_STARTED: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    ON_HOLD: "danger",
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const columns = [
    {
      key: "eventNumber",
      header: "Event #",
      sortable: true,
      render: (row: Event) => (
        <button onClick={() => openDetail(row)} className="flex items-center gap-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            <Calendar size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.eventNumber}</p>
            <p className="text-xs text-text-secondary truncate max-w-[180px]">{row.title}</p>
          </div>
        </button>
      ),
    },
    {
      key: "client",
      header: "Client",
      render: (row: Event) => (
        <span className="text-sm text-text-secondary">{row.client?.name ?? "-"}</span>
      ),
    },
    {
      key: "eventDate",
      header: "Date",
      sortable: true,
      render: (row: Event) => (
        <span className="text-xs text-text-secondary">{formatDate(row.eventDate)}</span>
      ),
    },
    {
      key: "venue",
      header: "Venue",
      render: (row: Event) => (
        <span className="text-sm text-text-secondary">{row.venue ?? "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row: Event) => (
        <UiSelect
          value={row.status}
          onChange={(val) => { if (!val.startsWith("__")) handleStatusChange(row, val); }}
          options={[
            { value: "__current", label: row.status, disabled: true },
            { value: "DRAFT", label: "Draft" },
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          className="w-32 h-7 text-xs"
        />
      ),
    },
    {
      key: "execution",
      header: "Execution",
      render: (row: Event) => (
        <Badge size="sm" variant={executionVariant[row.executionStatus] ?? "outline"}>
          {row.executionStatus?.replace("_", " ") ?? "NOT STARTED"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (row: Event) => (
        <RowMenu
          row={row}
          onView={() => openDetail(row)}
          onEdit={() => openEditModal(row)}
          onRestore={() => setRestoreConfirm(row)}
          onArchive={() => setDeleteConfirm(row)}
        />
      ),
    },
  ];

  const filterDefs = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "CONFIRMED", label: "Confirmed" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
    {
      key: "clientId",
      label: "Client",
      options: clients.map((c) => ({ value: c.id, label: c.name })),
    },
  ];

  return (
    <PageContainer
      title="Events"
      subtitle="Manage your events"
      actions={
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} /> New Event
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <StatCard title="Total Events" value={stats?.total ?? events.length} icon={<Calendar size={18} />} />
        <StatCard title="Draft" value={stats?.draft ?? events.filter((e) => e.status === "DRAFT").length} icon={<FileText size={18} />} />
        <StatCard title="Confirmed" value={stats?.confirmed ?? events.filter((e) => e.status === "CONFIRMED").length} icon={<CheckCircle2 size={18} />} />
        <StatCard title="In Progress" value={stats?.inProgress ?? events.filter((e) => e.status === "IN_PROGRESS").length} icon={<TrendingUp size={18} />} />
        <StatCard title="Completed" value={stats?.completed ?? events.filter((e) => e.status === "COMPLETED").length} icon={<CheckCircle2 size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search events..." className="max-w-xs" />
          <FilterBar filters={filterDefs} active={activeFilters} onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }} onClear={() => { setActiveFilters({}); setPage(1); }} />
        </div>
        {/* Desktop: Table */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={events}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No events found"
            emptyDescription="Create your first event to get started"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
        {/* Mobile: Cards */}
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[var(--radius-md)]" />
            ))
          ) : events.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No events found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => openDetail(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openDetail(event)}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <Calendar size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{event.eventNumber}</p>
                      <p className="text-xs text-text-secondary truncate">{event.title}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      row={event}
                      onView={() => openDetail(event)}
                      onEdit={() => openEditModal(event)}
                      onRestore={() => setRestoreConfirm(event)}
                      onArchive={() => setDeleteConfirm(event)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {event.client && (
                    <span className="flex items-center gap-1 text-text-secondary">
                      <Users size={12} /> {event.client.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-text-secondary">
                    <Calendar size={12} /> {formatDate(event.eventDate)}
                  </span>
                  {event.venue && (
                    <span className="flex items-center gap-1 text-text-secondary">
                      <MapPin size={12} /> {event.venue}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[event.status] ?? "outline"} size="sm">
                    {event.status}
                  </Badge>
                  <Badge variant={executionVariant[event.executionStatus] ?? "outline"} size="sm">
                    {event.executionStatus?.replace("_", " ") ?? "NOT STARTED"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); resetForm(); }}
        title={editingEvent ? "Edit Event" : "Create Event"}
        size="lg"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Event title"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiSelect
              label="Event Type"
              placeholder="Select type"
              value={formEventTypeId}
              onChange={setFormEventTypeId}
              options={eventTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <UiSelect
              label="Client"
              placeholder="Select client"
              value={formClientId}
              onChange={setFormClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <Input
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Event description"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Venue"
              value={formVenue}
              onChange={(e) => setFormVenue(e.target.value)}
              placeholder="Venue name"
            />
            <Input
              label="Address"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="Event Date"
              type="date"
              required
              value={formEventDate}
              onChange={(e) => setFormEventDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={formEventEndDate}
              onChange={(e) => setFormEventEndDate(e.target.value)}
            />
            <Input
              label="Start Time"
              type="time"
              value={formStartTime}
              onChange={(e) => setFormStartTime(e.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expected Guests"
              type="number"
              value={formExpectedGuests}
              onChange={(e) => setFormExpectedGuests(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Budget (INR)"
              type="number"
              value={formBudget}
              onChange={(e) => setFormBudget(e.target.value)}
              placeholder="0"
            />
          </div>
          <Input
            label="Notes"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Additional notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingEvent(null); resetForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingEvent ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        title={detailEvent?.title ?? "Event Details"}
        size="xl"
      >
        {detailEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-surface-raised">
              <Calendar size={24} className="text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-lg font-semibold text-text-primary">{detailEvent.title}</p>
                <p className="text-sm text-text-secondary">
                  {detailEvent.eventNumber} - {detailEvent.client?.name ?? "No Client"}
                </p>
              </div>
              <Badge variant={statusVariant[detailEvent.status] ?? "outline"}>{detailEvent.status}</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Date</p>
                <p className="text-sm font-medium text-text-primary">{formatDate(detailEvent.eventDate)}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Venue</p>
                <p className="text-sm font-medium text-text-primary">{detailEvent.venue ?? "-"}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Budget</p>
                <p className="text-sm font-medium text-text-primary">{formatCurrency(detailEvent.budget)}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Guests</p>
                <p className="text-sm font-medium text-text-primary">{detailEvent.expectedGuests ?? "-"}</p>
              </div>
            </div>

            {detailEvent.description && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Description</p>
                <p className="text-sm text-text-primary">{detailEvent.description}</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Badge variant={executionVariant[detailEvent.executionStatus] ?? "outline"}>
                Execution: {detailEvent.executionStatus?.replace("_", " ") ?? "NOT STARTED"}
              </Badge>
              {detailEvent._count && (
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{detailEvent._count.tasks} tasks</span>
                  <span>{detailEvent._count.teamMembers} team</span>
                  <span>{detailEvent._count.vendors} vendors</span>
                </div>
              )}
            </div>

            {detailEvent.notes && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-xs text-text-secondary mb-1">Notes</p>
                <p className="text-sm text-text-primary">{detailEvent.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) await handleArchive(deleteConfirm);
          setDeleteConfirm(null);
        }}
        title="Archive Event"
        description={`Are you sure you want to archive "${deleteConfirm?.title}"?`}
        confirmLabel="Archive"
        intent="warning"
      />

      <ConfirmModal
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={async () => {
          if (restoreConfirm) await handleRestore(restoreConfirm);
        }}
        title="Restore Event"
        description={`Restore "${restoreConfirm?.title}"?`}
        confirmLabel="Restore"
        intent="info"
      />

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
