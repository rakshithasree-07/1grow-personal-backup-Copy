"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CheckSquare, Edit3, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Modal, Card, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventTasks, createEventTask, updateEventTask, getEvents, type EventTask, type Event } from "@/services/events";
import { toast } from "sonner";

export function TasksPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formDueDate, setFormDueDate] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      const list = res.data ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
    } catch { /* ignore */ }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!selectedEventId) { setTasks([]); return; }
    setLoading(true);
    try {
      const res = await getEventTasks(selectedEventId);
      setTasks(res.data ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const resetForm = () => { setFormTitle(""); setFormDescription(""); setFormAssignedTo(""); setFormPriority("MEDIUM"); setFormDueDate(""); };

  const openCreateModal = () => { setEditingTask(null); resetForm(); setModalOpen(true); };

  const openEditModal = (task: EventTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description ?? "");
    setFormAssignedTo(task.assignedTo ?? "");
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    const payload: Partial<EventTask> = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      assignedTo: formAssignedTo.trim() || null,
      priority: formPriority,
      dueDate: formDueDate || null,
    };
    setSubmitting(true);
    try {
      if (editingTask) {
        await updateEventTask(selectedEventId, editingTask.id, payload);
        toast.success("Task updated");
      } else {
        await createEventTask(selectedEventId, payload);
        toast.success("Task created");
      }
      setModalOpen(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
    } catch {
      toast.error("Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (task: EventTask, status: string) => {
    try {
      await updateEventTask(selectedEventId, task.id, { status } as Partial<EventTask>);
      toast.success(`Task ${status.toLowerCase()}`);
      fetchTasks();
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    PENDING: "warning", IN_PROGRESS: "info", COMPLETED: "success", CANCELLED: "danger",
  };

  const priorityVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    LOW: "success", MEDIUM: "info", HIGH: "warning", URGENT: "danger",
  };

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (row: EventTask) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10"><CheckSquare size={14} className="text-primary" /></div>
          <div>
            <p className="font-medium text-text-primary">{row.title}</p>
            {row.description && <p className="text-xs text-text-secondary truncate max-w-[200px]">{row.description}</p>}
          </div>
        </div>
      ),
    },
    { key: "assignee", header: "Assignee", render: (row: EventTask) => <span className="text-sm text-text-secondary">{row.assignee?.name ?? row.assignedTo ?? "-"}</span> },
    { key: "priority", header: "Priority", render: (row: EventTask) => <Badge size="sm" variant={priorityVariant[row.priority] ?? "outline"}>{row.priority}</Badge> },
    {
      key: "status",
      header: "Status",
      render: (row: EventTask) => (
        <UiSelect
          value={row.status}
          onChange={(val) => { if (!val.startsWith("__")) handleStatusChange(row, val); }}
          options={[
            { value: "__current", label: row.status, disabled: true },
            { value: "PENDING", label: "Pending" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          className="w-32 h-7 text-xs"
        />
      ),
    },
    { key: "dueDate", header: "Due Date", render: (row: EventTask) => <span className="text-xs text-text-secondary">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "-"}</span> },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row: EventTask) => (
        <div className="flex items-center justify-end">
          <Button size="xs" variant="ghost" title="Edit" onClick={() => openEditModal(row)}><Edit3 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Tasks" subtitle="Manage event tasks" actions={<Button size="sm" onClick={openCreateModal}><Plus size={16} /> New Task</Button>}>
      <Card>
        <div className="p-4 border-b border-border">
          <UiSelect label="Select Event" placeholder="Choose an event" value={selectedEventId} onChange={setSelectedEventId} options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))} />
        </div>
        <div className="hidden sm:block">
          <Table columns={columns} data={tasks} loading={loading} emptyTitle="No tasks" emptyDescription="Create tasks for this event" />
        </div>
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm text-text-secondary">No tasks</p></div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{task.title}</p>
                    <p className="text-xs text-text-secondary">{task.assignee?.name ?? task.assignedTo ?? "Unassigned"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge size="sm" variant={priorityVariant[task.priority] ?? "outline"}>{task.priority}</Badge>
                    <Button size="xs" variant="ghost" onClick={() => openEditModal(task)}><Edit3 size={14} /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant={statusVariant[task.status] ?? "outline"}>{task.status}</Badge>
                  {task.dueDate && <span className="text-xs text-text-secondary">Due: {new Date(task.dueDate).toLocaleDateString("en-IN")}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTask(null); resetForm(); }} title={editingTask ? "Edit Task" : "Create Task"} size="md" className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end">
        <div className="space-y-4">
          <Input label="Title" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Task title" />
          <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description" />
          <Input label="Assigned To (User ID)" value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)} placeholder="User ID" />
          <div className="grid grid-cols-2 gap-4">
            <UiSelect label="Priority" value={formPriority} onChange={setFormPriority} options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "URGENT", label: "Urgent" },
            ]} />
            <Input label="Due Date" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingTask(null); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>{editingTask ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
