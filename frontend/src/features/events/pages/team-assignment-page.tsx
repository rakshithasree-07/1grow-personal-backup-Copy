"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users, Trash2, UserPlus } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Modal, Card, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventTeam, assignTeamMember, removeTeamMember, getEvents, type EventTeamMember, type Event } from "@/services/events";
import { toast } from "sonner";

export function TeamAssignmentPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [team, setTeam] = useState<EventTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formUserId, setFormUserId] = useState("");
  const [formRole, setFormRole] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      const list = res.data ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
    } catch { /* ignore */ }
  }, []);

  const fetchTeam = useCallback(async () => {
    if (!selectedEventId) { setTeam([]); return; }
    setLoading(true);
    try {
      const res = await getEventTeam(selectedEventId);
      setTeam(res.data ?? []);
    } catch {
      setTeam([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleAssign = async () => {
    if (!formUserId.trim()) { toast.error("User ID is required"); return; }
    if (!formRole.trim()) { toast.error("Role is required"); return; }
    setSubmitting(true);
    try {
      await assignTeamMember(selectedEventId, { userId: formUserId.trim(), role: formRole.trim() });
      toast.success("Member assigned");
      setModalOpen(false);
      setFormUserId("");
      setFormRole("");
      fetchTeam();
    } catch {
      toast.error("Failed to assign member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (member: EventTeamMember) => {
    try {
      await removeTeamMember(selectedEventId, member.id);
      toast.success("Member removed");
      fetchTeam();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const columns = [
    {
      key: "user",
      header: "Name",
      render: (row: EventTeamMember) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{row.user?.name?.charAt(0) ?? "?"}</div>
          <div>
            <p className="font-medium text-text-primary">{row.user?.name ?? "Unknown"}</p>
            <p className="text-xs text-text-secondary">{row.user?.email ?? ""}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (row: EventTeamMember) => <Badge size="sm" variant="info">{row.role}</Badge> },
    { key: "assignedAt", header: "Assigned Since", render: (row: EventTeamMember) => <span className="text-xs text-text-secondary">{new Date(row.assignedAt).toLocaleDateString("en-IN")}</span> },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row: EventTeamMember) => (
        <div className="flex items-center justify-end">
          <Button size="xs" variant="ghost" title="Remove" onClick={() => handleRemove(row)}><Trash2 size={14} className="text-danger" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Team Assignment" subtitle="Assign team members to events" actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Member</Button>}>
      <Card>
        <div className="p-4 border-b border-border">
          <UiSelect
            label="Select Event"
            placeholder="Choose an event"
            value={selectedEventId}
            onChange={setSelectedEventId}
            options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))}
          />
        </div>
        <div className="hidden sm:block">
          <Table columns={columns} data={team} loading={loading} emptyTitle="No team members" emptyDescription="Assign team members to this event" />
        </div>
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />)
          ) : team.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm text-text-secondary">No team members</p></div>
          ) : (
            team.map((member) => (
              <div key={member.id} className="rounded-[var(--radius-md)] border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{member.user?.name?.charAt(0) ?? "?"}</div>
                  <div>
                    <p className="font-medium text-text-primary">{member.user?.name ?? "Unknown"}</p>
                    <Badge size="sm" variant="info">{member.role}</Badge>
                  </div>
                </div>
                <Button size="xs" variant="ghost" onClick={() => handleRemove(member)}><Trash2 size={14} className="text-danger" /></Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Team Member" size="sm">
        <div className="space-y-4">
          <Input label="User ID" required value={formUserId} onChange={(e) => setFormUserId(e.target.value)} placeholder="Enter user ID" />
          <UiSelect label="Role" placeholder="Select role" value={formRole} onChange={setFormRole} options={[
            { value: "COORDINATOR", label: "Coordinator" },
            { value: "MANAGER", label: "Manager" },
            { value: "EXECUTOR", label: "Executor" },
            { value: "VOLUNTEER", label: "Volunteer" },
          ]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAssign} loading={submitting}>Assign</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
