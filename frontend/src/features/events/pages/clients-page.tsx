"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users, Edit3, MoreHorizontal, Phone, Mail, Building } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Pagination, SearchBar, Modal, Card, Skeleton, Input } from "@/components/ui";
import { getEventClients, createEventClient, updateEventClient, type EventClient } from "@/services/events";
import { toast } from "sonner";

export function ClientsPage() {
  const [clients, setClients] = useState<EventClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<EventClient | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formLeadId, setFormLeadId] = useState("");

  const pageSize = 10;

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEventClients({ page, pageSize, search });
      setClients(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const resetForm = () => { setFormName(""); setFormPhone(""); setFormEmail(""); setFormCompany(""); setFormLeadId(""); };

  const openCreateModal = () => { setEditingClient(null); resetForm(); setModalOpen(true); };

  const openEditModal = (client: EventClient) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone);
    setFormEmail(client.email ?? "");
    setFormCompany(client.companyName ?? "");
    setFormLeadId(client.leadId ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) { toast.error("Name is required"); return; }
    if (!formPhone.trim()) { toast.error("Phone is required"); return; }
    const payload: Partial<EventClient> = { name: formName.trim(), phone: formPhone.trim(), email: formEmail.trim() || null, companyName: formCompany.trim() || null };
    if (!editingClient && formLeadId.trim()) payload.leadId = formLeadId.trim();
    setSubmitting(true);
    try {
      if (editingClient) {
        await updateEventClient(editingClient.id, payload);
        toast.success("Client updated");
      } else {
        await createEventClient(payload);
        toast.success("Client created");
      }
      setModalOpen(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch {
      toast.error("Failed to save client");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: EventClient) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{row.name.charAt(0)}</div>
          <div>
            <p className="font-medium text-text-primary">{row.name}</p>
            <p className="text-xs text-text-secondary">{row.companyName ?? "-"}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (row: EventClient) => <span className="text-sm text-text-secondary flex items-center gap-1"><Phone size={12} />{row.phone}</span> },
    { key: "email", header: "Email", render: (row: EventClient) => <span className="text-sm text-text-secondary flex items-center gap-1"><Mail size={12} />{row.email ?? "-"}</span> },
    { key: "events", header: "Events", render: (row: EventClient) => <span className="text-sm text-text-secondary">{row._count?.events ?? 0}</span> },
    { key: "status", header: "Status", render: (row: EventClient) => <Badge size="sm" variant={row.isActive ? "success" : "warning"}>{row.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row: EventClient) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="xs" variant="ghost" title="Edit" onClick={() => openEditModal(row)}><Edit3 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Clients" subtitle="Manage event clients" actions={<Button size="sm" onClick={openCreateModal}><Plus size={16} /> New Client</Button>}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search clients..." className="max-w-xs" />
        </div>
        <div className="hidden sm:block">
          <Table columns={columns} data={clients} loading={loading} emptyTitle="No clients found" emptyDescription="Add your first client" />
          <div className="px-4 py-3"><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></div>
        </div>
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)
          ) : clients.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm text-text-secondary">No clients found</p></div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{client.name.charAt(0)}</div>
                    <div>
                      <p className="font-medium text-text-primary">{client.name}</p>
                      <p className="text-xs text-text-secondary">{client.phone}</p>
                    </div>
                  </div>
                  <Button size="xs" variant="ghost" onClick={() => openEditModal(client)}><Edit3 size={14} /></Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {client.companyName && <span className="flex items-center gap-1 text-text-secondary"><Building size={12} />{client.companyName}</span>}
                  <Badge size="sm" variant={client.isActive ? "success" : "warning"}>{client.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingClient(null); resetForm(); }} title={editingClient ? "Edit Client" : "Create Client"} size="md" className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end">
        <div className="space-y-4">
          <Input label="Name" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Client name" />
          <Input label="Phone" required value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone number" />
          <Input label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email address" />
          <Input label="Company" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="Company name" />
          {!editingClient && <Input label="Lead ID" value={formLeadId} onChange={(e) => setFormLeadId(e.target.value)} placeholder="Optional - link an existing lead" />}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingClient(null); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>{editingClient ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button onClick={openCreateModal} className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform">
          <Plus size={24} />
        </button>
      </div>
    </PageContainer>
  );
}
