"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Clock, Flag, Power, Pencil } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Badge, Modal, Card, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventTimeline, createTimelineSlot, updateTimelineSlot, updateTimelineSlotStatus, getEvents, type EventTimelineEntry, type Event } from "@/services/events";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [entries, setEntries] = useState<EventTimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formDependencies, setFormDependencies] = useState<string[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      const list = res.data ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
    } catch { /* ignore */ }
  }, []);

  const fetchTimeline = useCallback(async () => {
    if (!selectedEventId) { setEntries([]); return; }
    setLoading(true);
    try {
      const res = await getEventTimeline(selectedEventId);
      setEntries(res.data?.timeline ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (!formStartTime) { toast.error("Start time is required"); return; }
    setSubmitting(true);
    try {
      await createTimelineSlot(selectedEventId, {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        startTime: new Date(formStartTime).toISOString(),
        endTime: formEndTime ? new Date(formEndTime).toISOString() : undefined,
        priority: "MEDIUM",
        dependencies: formDependencies.length > 0 ? formDependencies : undefined,
      });
      toast.success("Timeline slot added");
      setModalOpen(false);
      setFormTitle("");
      setFormDescription("");
      setFormStartTime("");
      setFormEndTime("");
      setFormDependencies([]);
      fetchTimeline();
    } catch {
      toast.error("Failed to add slot");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (entry: EventTimelineEntry) => {
    try {
      await updateTimelineSlotStatus(selectedEventId, entry.slotId, !entry.isActive);
      toast.success(entry.isActive ? "Slot deactivated" : "Slot activated");
      fetchTimeline();
    } catch {
      toast.error("Failed to update slot");
    }
  };

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    TODO: "warning", IN_PROGRESS: "info", COMPLETED: "success", CANCELLED: "danger",
  };

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  return (
    <PageContainer title="Timeline" subtitle="Event timeline management" actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Slot</Button>}>
      <Card>
        <div className="p-4 border-b border-border">
          <UiSelect label="Select Event" placeholder="Choose an event" value={selectedEventId} onChange={setSelectedEventId} options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))} />
        </div>
        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center">
              <Clock size={32} className="mx-auto text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">No timeline slots</p>
              <p className="text-xs text-text-secondary mt-1">Add slots to build the event timeline</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {entries.map((entry, idx) => (
                  <div key={entry.slotId ?? entry.id ?? idx} className={cn("relative flex gap-4 pl-4", entry.isActive === false && "opacity-50")}>
                    <div className={cn(
                      "absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-background z-10",
                      entry.isMilestone ? "bg-primary" : "bg-surface-overlay"
                    )} />
                    <div className="flex-1 rounded-[var(--radius-md)] border border-border p-4 ml-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.isMilestone && <Flag size={14} className="text-primary" />}
                          <p className="font-medium text-text-primary">{entry.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge size="sm" variant={entry.isActive === false ? "outline" : (statusVariant[entry.status] ?? "outline")}>{entry.isActive === false ? "INACTIVE" : entry.status}</Badge>
                          <Button variant="ghost" size="xs" onClick={() => toggleActive(entry)} title={entry.isActive ? "Deactivate" : "Activate"}>
                            <Power size={14} />
                          </Button>
                        </div>
                      </div>
                      {entry.description && <p className="text-sm text-text-secondary">{entry.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1"><Clock size={12} />{formatTime(entry.startTime)}</span>
                        {entry.endTime && <span>- {formatTime(entry.endTime)}</span>}
                      </div>
                      {entry.dependencies && entry.dependencies.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap text-xs">
                          {entry.dependencies.map((d) => (
                            <Badge key={d.slotId} size="sm" variant="info">depends on: {d.title ?? d.slotId}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Timeline Slot" size="md">
        <div className="space-y-4">
          <Input label="Title" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Slot title" />
          <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="datetime-local" required value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
            <Input label="End Time" type="datetime-local" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Dependencies</p>
            <div className="flex flex-wrap gap-2">
              {entries.map((entry) => (
                <label key={entry.slotId ?? entry.id} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formDependencies.includes(entry.slotId ?? entry.id ?? "")}
                    onChange={(e) => {
                      const id = entry.slotId ?? entry.id ?? "";
                      setFormDependencies((prev) =>
                        e.target.checked ? [...prev, id] : prev.filter((d) => d !== id)
                      );
                    }}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {entry.title}
                </label>
              ))}
              {entries.length === 0 && <p className="text-xs text-text-secondary">No existing slots to depend on yet</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Slot</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}