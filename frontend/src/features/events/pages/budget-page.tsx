"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Modal, Card, StatCard, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { getEventBudget, getBudgetSummary, addBudgetItem, getEvents, type EventBudgetItem, type Event, type BudgetSummary } from "@/services/events";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function BudgetPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [budgetItems, setBudgetItems] = useState<EventBudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBudgeted, setFormBudgeted] = useState("");
  const [formActual, setFormActual] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getEvents({ pageSize: 100 });
      const list = res.data ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
    } catch { /* ignore */ }
  }, []);

  const fetchBudget = useCallback(async () => {
    if (!selectedEventId) { setBudgetItems([]); setSummary(null); return; }
    setLoading(true);
    try {
      const [budgetRes, summaryRes] = await Promise.all([
        getEventBudget(selectedEventId).catch(() => ({ data: [] })),
        getBudgetSummary(selectedEventId).catch(() => null),
      ]);
      setBudgetItems(budgetRes.data ?? []);
      if (summaryRes?.data) setSummary(summaryRes.data);
    } catch {
      setBudgetItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  const handleSubmit = async () => {
    if (!formCategory.trim()) { toast.error("Category is required"); return; }
    setSubmitting(true);
    try {
      await addBudgetItem(selectedEventId, {
        category: formCategory.trim(),
        description: formDescription.trim() || null,
        budgetedAmount: Number(formBudgeted) || 0,
        actualAmount: Number(formActual) || 0,
        notes: formNotes.trim() || null,
      } as Partial<EventBudgetItem>);
      toast.success("Budget item added");
      setModalOpen(false);
      setFormCategory("");
      setFormDescription("");
      setFormBudgeted("");
      setFormActual("");
      setFormNotes("");
      fetchBudget();
    } catch {
      toast.error("Failed to add budget item");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const columns = [
    { key: "category", header: "Category", render: (row: EventBudgetItem) => <span className="font-medium text-text-primary">{row.category}</span> },
    { key: "description", header: "Description", render: (row: EventBudgetItem) => <span className="text-sm text-text-secondary">{row.description ?? "-"}</span> },
    { key: "budgeted", header: "Budgeted", render: (row: EventBudgetItem) => <span className="text-sm text-text-primary">{formatCurrency(row.budgetedAmount)}</span> },
    { key: "actual", header: "Actual", render: (row: EventBudgetItem) => <span className="text-sm text-text-primary">{formatCurrency(row.actualAmount)}</span> },
    {
      key: "difference",
      header: "Difference",
      render: (row: EventBudgetItem) => {
        const diff = row.budgetedAmount - row.actualAmount;
        return (
          <span className={cn("text-sm font-medium", diff >= 0 ? "text-success" : "text-danger")}>
            {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
          </span>
        );
      },
    },
  ];

  return (
    <PageContainer title="Budget" subtitle="Track event budgets" actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Item</Button>}>
      <Card>
        <div className="p-4 border-b border-border">
          <UiSelect label="Select Event" placeholder="Choose an event" value={selectedEventId} onChange={setSelectedEventId} options={events.map((e) => ({ value: e.id, label: `${e.eventNumber} - ${e.title}` }))} />
        </div>
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 p-4">
            <StatCard title="Total Budgeted" value={formatCurrency(summary.totalBudgeted)} icon={<DollarSign size={18} />} />
            <StatCard title="Total Actual" value={formatCurrency(summary.totalActual)} icon={<DollarSign size={18} />} />
            <StatCard title="Variance" value={formatCurrency(summary.variance)} icon={summary.variance >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />} />
            <StatCard title="Items" value={summary.items} icon={<DollarSign size={18} />} />
          </div>
        )}
        <div className="hidden sm:block">
          <Table columns={columns} data={budgetItems} loading={loading} emptyTitle="No budget items" emptyDescription="Add budget items for this event" />
        </div>
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)
          ) : budgetItems.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm text-text-secondary">No budget items</p></div>
          ) : (
            budgetItems.map((item) => {
              const diff = item.budgetedAmount - item.actualAmount;
              return (
                <div key={item.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-text-primary">{item.category}</p>
                    <span className={cn("text-sm font-medium", diff >= 0 ? "text-success" : "text-danger")}>
                      {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                    </span>
                  </div>
                  {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-secondary">Budgeted: {formatCurrency(item.budgetedAmount)}</span>
                    <span className="text-text-secondary">Actual: {formatCurrency(item.actualAmount)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Budget Item" size="md">
        <div className="space-y-4">
          <Input label="Category" required value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Venue, Catering, Decorations" />
          <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budgeted Amount (INR)" type="number" value={formBudgeted} onChange={(e) => setFormBudgeted(e.target.value)} placeholder="0" />
            <Input label="Actual Amount (INR)" type="number" value={formActual} onChange={(e) => setFormActual(e.target.value)} placeholder="0" />
          </div>
          <Input label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
