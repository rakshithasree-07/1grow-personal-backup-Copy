"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Activity, Clock, User } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Badge, Modal, Card, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventExecutionLogs, addExecutionLog, getEvents, getEvent, type EventExecutionLog, type Event } from "@/services/events";
import { toast } from "sonner";

export function ExecutionPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [logs, setLogs] = useState<EventExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formStatus, setFormStatus] = useState("IN_PROGRESS");
  const [formNotes, setFormNotes] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      const list = res.data ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
    } catch { /* ignore */ }
  }, []);

  const fetchExecution = useCallback(async () => {
    if (!selectedEventId) { setLogs([]); setCurrentEvent(null); return; }
    setLoading(true);
    try {
      const [logsRes, eventRes] = await Promise.all([
        getEventExecutionLogs(selectedEventId).catch(() => ({ data: [] })),
        getEvent(selectedEventId).catch(() => null),
      ]);
      setLogs(logsRes.data ?? []);
      if (eventRes?.data) setCurrentEvent(eventRes.data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchExecution(); }, [fetchExecution]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addExecutionLog(selectedEventId, {
        status: formStatus,
        notes: formNotes.trim() || null,
      } as Partial<EventExecutionLog>);
      toast.success("Execution log added");
      setModalOpen(false);
      setFormStatus("IN_PROGRESS");
      setFormNotes("");
      fetchExecution();
    } catch {
      toast.error("Failed to add log");
    } finally {
      setSubmitting(false);
    }
  };

  const executionVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    NOT_STARTED: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    ON_HOLD: "danger",
  };

  const formatTime = (time: string) => {
    try {
      return new Date(time).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  return (
    <PageContainer title="Execution" subtitle="Track event execution" actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Log</Button>}>
      <Card>
        <div className="p-4 border-b border-border">
          <UiSelect label="Select Event" placeholder="Choose an event" value={selectedEventId} onChange={setSelectedEventId} options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))} />
        </div>

        {currentEvent && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
                <Activity size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-text-primary">{currentEvent.title}</p>
                <p className="text-xs text-text-secondary">{currentEvent.eventNumber}</p>
              </div>
              <Badge variant={executionVariant[currentEvent.executionStatus] ?? "outline"}>
                {currentEvent.executionStatus?.replace("_", " ") ?? "NOT STARTED"}
              </Badge>
            </div>
          </div>
        )}

        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock size={32} className="mx-auto text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">No execution logs</p>
              <p className="text-xs text-text-secondary mt-1">Add logs to track execution progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge size="sm" variant={executionVariant[log.status] ?? "outline"}>{log.status?.replace("_", " ")}</Badge>
                      <span className="text-xs text-text-secondary flex items-center gap-1"><Clock size={12} />{formatTime(log.createdAt)}</span>
                    </div>
                    {log.user && (
                      <span className="text-xs text-text-secondary flex items-center gap-1"><User size={12} />{log.user.name}</span>
                    )}
                  </div>
                  {log.notes && <p className="text-sm text-text-secondary">{log.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Execution Log" size="md">
        <div className="space-y-4">
          <UiSelect label="Status" value={formStatus} onChange={setFormStatus} options={[
            { value: "NOT_STARTED", label: "Not Started" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "ON_HOLD", label: "On Hold" },
          ]} />
          <Input label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Execution notes" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Log</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
