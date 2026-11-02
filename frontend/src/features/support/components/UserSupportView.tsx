"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, MessageSquare, ChevronRight, Ticket, Loader2, Search, X, Upload, ArrowLeft, Clock } from "lucide-react";
import { Button, Badge, Modal, Input, Textarea, Select, Skeleton, Avatar } from "@/components/ui";
import { supportService, type SupportTicket, type SupportCategory } from "@/services/support";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { TicketChat } from "./TicketChat";

// Pre-defined auto-response text sent 15 seconds after ticket creation
const AUTO_RESPONSE_TEXT =
  "Hello! Thank you for reaching out to our support team. We have received your ticket and one of our agents will review it shortly.\n\nIn the meantime, please feel free to add any additional details that might help us resolve your issue faster.\n\nTypical response time: within 24 hours.\n\nBest regards,\n1Grow Support Team";

const ROLE_MODULES: Record<string, { value: string; label: string }[]> = {
  OWNER: [
    { value: "Dashboard", label: "Dashboard (Home)" }, { value: "Access Requests", label: "Access Requests" },
    { value: "Leads", label: "Leads" }, { value: "Followups", label: "Follow-ups" },
    { value: "Programs", label: "Programs" }, { value: "Batches", label: "Batches" },
    { value: "Schedules", label: "Schedules" }, { value: "Students", label: "Students" },
    { value: "Enrollments", label: "Enrollments" }, { value: "Attendance", label: "Attendance" },
    { value: "Progress", label: "Progress" }, { value: "Certificates", label: "Certificates" },
    { value: "Fee Plans", label: "Fee Plans" }, { value: "Invoices", label: "Invoices" },
    { value: "Payments", label: "Payments" }, { value: "Reports", label: "Reports" },
    { value: "Users", label: "Users" }, { value: "Organisation", label: "Organisation" },
    { value: "Subscription", label: "Subscription" }, { value: "Support", label: "Support" },
  ],
  BRANCH_MANAGER: [
    { value: "Dashboard", label: "Dashboard (Home)" }, { value: "Access Requests", label: "Access Requests" },
    { value: "Leads", label: "Leads" }, { value: "Followups", label: "Follow-ups" },
    { value: "Programs", label: "Programs" }, { value: "Batches", label: "Batches" },
    { value: "Schedules", label: "Schedules" }, { value: "Staff", label: "Staff" },
    { value: "Students", label: "Students" }, { value: "Enrollments", label: "Enrollments" },
    { value: "Attendance", label: "Attendance" }, { value: "Progress", label: "Progress" },
    { value: "Certificates", label: "Certificates" }, { value: "Transfers", label: "Transfers" },
    { value: "Waitlists", label: "Waitlists" }, { value: "Renewals", label: "Renewals" },
    { value: "Fee Plans", label: "Fee Plans" }, { value: "Invoices", label: "Invoices" },
    { value: "Payments", label: "Payments" }, { value: "Tasks", label: "Tasks" },
    { value: "Documents", label: "Documents" }, { value: "Reports", label: "Reports" },
    { value: "Support", label: "Support" },
  ],
  STAFF: [
    { value: "Dashboard", label: "Dashboard (Home)" }, { value: "Leads", label: "Leads" },
    { value: "Followups", label: "Follow-ups" }, { value: "Programs", label: "Programs" },
    { value: "Batches", label: "Batches" }, { value: "Schedules", label: "Schedules" },
    { value: "Staff", label: "Staff" }, { value: "Students", label: "Students" },
    { value: "Enrollments", label: "Enrollments" }, { value: "Attendance", label: "Attendance" },
    { value: "Progress", label: "Progress" }, { value: "Certificates", label: "Certificates" },
    { value: "Transfers", label: "Transfers" }, { value: "Waitlists", label: "Waitlists" },
    { value: "Renewals", label: "Renewals" }, { value: "Fee Plans", label: "Fee Plans" },
    { value: "Invoices", label: "Invoices" }, { value: "Payments", label: "Payments" },
    { value: "Tasks", label: "Tasks" }, { value: "Documents", label: "Documents" },
    { value: "Access Requests", label: "Access Requests" }, { value: "Reports", label: "Reports" },
    { value: "Support", label: "Support" },
  ],
  STUDENT: [
    { value: "Dashboard", label: "Dashboard (Home)" }, { value: "My Request", label: "My Request" },
    { value: "My Courses", label: "My Courses" }, { value: "Attendance", label: "Attendance" },
    { value: "Fees", label: "Fees" }, { value: "Progress", label: "Progress" },
    { value: "Certificates", label: "Certificates" }, { value: "Notifications", label: "Notifications" },
    { value: "Support", label: "Support" },
  ],
  CLIENT: [
    { value: "Dashboard", label: "Dashboard (Home)" }, { value: "Bookings", label: "Bookings" },
    { value: "Contracts", label: "Contracts" }, { value: "Documents", label: "Documents" },
    { value: "Events", label: "Events" }, { value: "Invoices", label: "Invoices" },
    { value: "Payments", label: "Payments" }, { value: "Due Tracking", label: "Due Tracking" },
    { value: "Quotations", label: "Quotations" },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; variant: "info" | "warning" | "success" | "danger"; color: string; dot: string }> = {
  OPEN:        { label: "Open",        variant: "info",    color: "bg-info/10 text-info border-info/20",       dot: "bg-info"    },
  IN_PROGRESS: { label: "In Progress", variant: "warning", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  WAITING:     { label: "Waiting",     variant: "warning", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  RESOLVED:    { label: "Resolved",    variant: "success", color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  CLOSED:      { label: "Closed",      variant: "danger",  color: "bg-danger/10 text-danger border-danger/20",   dot: "bg-danger"  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function UserSupportView({ basePath: _basePath }: { basePath?: string }) {
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role || "STUDENT";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", categoryId: "", priority: "MEDIUM", module: "" });
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // Countdown shown while waiting for auto-response
  const [autoResponseCountdown, setAutoResponseCountdown] = useState<number | null>(null);
  const autoResponseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length !== files.length) toast.error("Only image files are allowed");
    const promises = valid.map(
      (f) =>
        new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(f);
        })
    );
    Promise.all(promises)
      .then((b64s) => setScreenshots((p) => [...p, ...b64s]))
      .catch(() => toast.error("Failed to read image files"));
  };

  const removeScreenshot = (idx: number) =>
    setScreenshots((p) => p.filter((_, i) => i !== idx));

  const handleCloseCreate = () => {
    setShowCreate(false);
    setNewTicket({ subject: "", description: "", categoryId: "", priority: "MEDIUM", module: "" });
    setScreenshots([]);
  };

  const clearAutoResponseTimers = () => {
    if (autoResponseTimerRef.current) clearTimeout(autoResponseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    autoResponseTimerRef.current = null;
    countdownIntervalRef.current = null;
  };

  // ── data fetching ──────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supportService.listTickets({ pageSize: 50 });
      setTickets(result.data);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await supportService.getCategories();
      setCategories(cats);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchCategories();
    return () => clearAutoResponseTimers();
  }, [fetchTickets, fetchCategories]);

  // ── ticket creation with 15-second auto-response ───────────────────────────
  const handleCreate = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setCreating(true);
    try {
      const ticket = await supportService.createTicket({
        subject: newTicket.subject,
        description: newTicket.description,
        categoryId: newTicket.categoryId || undefined,
        priority: newTicket.priority,
        module: newTicket.module || undefined,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
      });

      toast.success("Ticket created successfully");
      handleCloseCreate();
      setTickets((prev) => [ticket, ...prev]);
      setSelectedTicket(ticket);
      setMessages([]);

      // Start 15-second countdown then inject auto-response
      setAutoResponseCountdown(15);
      countdownIntervalRef.current = setInterval(() => {
        setAutoResponseCountdown((c) => {
          if (c === null || c <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return null;
          }
          return c - 1;
        });
      }, 1000);

      autoResponseTimerRef.current = setTimeout(async () => {
        setAutoResponseCountdown(null);
        try {
          await supportService.addMessage(ticket.id, { message: AUTO_RESPONSE_TEXT });
          const full = await supportService.getTicket(ticket.id);
          setMessages(full.messages ?? []);
          setSelectedTicket(full);
          setTickets((prev) => prev.map((t) => (t.id === full.id ? full : t)));
        } catch {
          // silently ignore auto-response failures
        }
      }, 15000);
    } catch {
      toast.error("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  // ── open existing ticket ───────────────────────────────────────────────────
  const openTicket = async (ticket: SupportTicket) => {
    clearAutoResponseTimers();
    setAutoResponseCountdown(null);
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const full = await supportService.getTicket(ticket.id);
      setMessages(full.messages ?? []);
    } catch {
      toast.error("Failed to load ticket details");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleBack = () => {
    clearAutoResponseTimers();
    setAutoResponseCountdown(null);
    setSelectedTicket(null);
    setMessages([]);
  };

  // ── message handlers ───────────────────────────────────────────────────────
  const handleSendMessage = async (message: string) => {
    if (!selectedTicket) return;
    await supportService.addMessage(selectedTicket.id, { message });
    const full = await supportService.getTicket(selectedTicket.id);
    setMessages(full.messages ?? []);
    setSelectedTicket(full);
    setTickets((prev) => prev.map((t) => (t.id === full.id ? full : t)));
  };

  const handleUpdateMessage = async (messageId: string, newMessage: string) => {
    if (!selectedTicket) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, message: newMessage, updatedAt: new Date().toISOString() } : m
      )
    );
    supportService.updateMessage(selectedTicket.id, messageId, { message: newMessage }).catch(() => {});
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedTicket) return;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m)));
    supportService.deleteMessage(selectedTicket.id, messageId).catch(() => {});
  };

  // ── derived values ─────────────────────────────────────────────────────────
  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.subject.toLowerCase().includes(q) ||
      t.ticketNo?.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const baseModules =
    ROLE_MODULES[userRole] ?? [
      { value: "Dashboard", label: "Dashboard (Home)" },
      { value: "Support", label: "Support" },
      { value: "General", label: "General / Other" },
    ];
  const moduleOptions = baseModules.some((m) => m.value === "General")
    ? baseModules
    : [...baseModules, { value: "General", label: "General / Other" }];

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  // ── CHAT VIEW (ticket selected) ────────────────────────────────────────────
  if (selectedTicket) {
    const statusCfg = STATUS_CONFIG[selectedTicket.status];
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] rounded-2xl border border-border/60 bg-surface overflow-hidden shadow-[var(--shadow-1)]">
        {/* Single header — no duplication with TicketChat */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
          <button
            onClick={handleBack}
            aria-label="Back to tickets"
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-overlay transition-colors text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {selectedTicket.subject}
            </p>
            <p className="text-[11px] text-text-secondary">
              #{selectedTicket.ticketNo}
              {selectedTicket.category?.name && ` · ${selectedTicket.category.name}`}
              {selectedTicket.module && ` · ${selectedTicket.module}`}
            </p>
          </div>
          {/* Auto-response countdown badge */}
          {autoResponseCountdown !== null && (
            <div className="flex items-center gap-1.5 rounded-xl bg-info/10 border border-info/20 px-3 py-1.5 text-info text-[11px] font-semibold shrink-0">
              <Clock size={12} className="animate-pulse" />
              Support reply in {autoResponseCountdown}s
            </div>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold shrink-0 ${statusCfg?.color ?? "bg-info/10 text-info border-info/20"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg?.dot ?? "bg-info"}`} />
            {statusCfg?.label ?? selectedTicket.status}
          </span>
        </div>

        {/* Chat body */}
        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-text-secondary" />
              <p className="text-xs text-text-secondary">Loading messages…</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <TicketChat
              ticket={selectedTicket}
              messages={messages}
              onSendMessage={handleSendMessage}
              onUpdateMessage={handleUpdateMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: tickets.length, bg: "bg-surface",                                    border: "border-border/60",   textColor: "text-text-primary" },
          { label: "Active",   value: openCount,       bg: "bg-gradient-to-br from-info/10 to-info/5",     border: "border-info/20",     textColor: "text-info"         },
          { label: "Resolved", value: resolvedCount,   bg: "bg-gradient-to-br from-success/10 to-success/5", border: "border-success/20", textColor: "text-success"      },
        ].map(({ label, value, bg, border, textColor }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 text-center hover:shadow-sm transition-all`}>
            <p className={`text-2xl font-bold tabular-nums ${textColor}`}>{value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search, filter, new-ticket */}
      <div className="flex gap-2.5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-2xl border border-border/60 bg-surface text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-primary transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <Select
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: "", label: "All" },
            { value: "OPEN", label: "Open" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "WAITING", label: "Waiting" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "CLOSED", label: "Closed" },
          ]}
          className="w-36 h-11"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:brightness-105 active:scale-[0.97] transition-all"
        >
          <Plus size={16} strokeWidth={2.5} /> New Ticket
        </button>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-overlay/60 mb-4">
            <Ticket size={28} className="text-text-disabled" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {search || statusFilter ? "No matching tickets" : "No tickets yet"}
          </p>
          <p className="text-xs text-text-secondary mt-1 max-w-[240px]">
            {search || statusFilter
              ? "Try adjusting your search or filter"
              : "Create a support ticket to get help from our team"}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.97] transition-all"
            >
              <Plus size={14} strokeWidth={2.5} /> Create Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTickets.map((t) => {
            const cfg = STATUS_CONFIG[t.status];
            return (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className="w-full flex items-center gap-3.5 rounded-2xl border border-border/50 bg-surface p-4 text-left hover:border-primary/30 hover:bg-surface-overlay/30 hover:shadow-sm transition-all duration-200 active:scale-[0.99] group"
              >
                <div className="relative shrink-0">
                  <Avatar src={(t.user as any)?.avatarUrl ?? null} name={t.user?.name ?? "U"} size="sm" />
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${cfg?.dot ?? "bg-info"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {t.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                    <span className="font-mono text-text-secondary/70">#{t.ticketNo}</span>
                    <span className="text-text-disabled">·</span>
                    <span>{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    {t._count && t._count.messages > 0 && (
                      <>
                        <span className="text-text-disabled">·</span>
                        <span className="flex items-center gap-0.5">
                          <MessageSquare size={10} /> {t._count.messages}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold ${cfg?.color ?? "bg-info/10 text-info border-info/20"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-info"}`} />
                  {cfg?.label ?? t.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Create ticket modal */}
      <Modal
        open={showCreate}
        onClose={handleCloseCreate}
        title="New Support Ticket"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseCreate}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Submit Ticket</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {categories.length > 0 && (
              <Select
                label="Category"
                placeholder="Select category (optional)"
                value={newTicket.categoryId}
                onChange={(val) => setNewTicket((p) => ({ ...p, categoryId: val }))}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
            <Select
              label="Priority"
              value={newTicket.priority}
              onChange={(val) => setNewTicket((p) => ({ ...p, priority: val }))}
              options={[
                { value: "LOW",      label: "Low"      },
                { value: "MEDIUM",   label: "Medium"   },
                { value: "HIGH",     label: "High"     },
                { value: "CRITICAL", label: "Critical" },
              ]}
            />
          </div>
          <Select
            label="Page / Module where issue occurred"
            placeholder="Select page/module (optional)"
            value={newTicket.module}
            onChange={(val) => setNewTicket((p) => ({ ...p, module: val }))}
            options={moduleOptions}
          />
          <Input
            label="Subject"
            required
            placeholder="Brief description of the issue"
            value={newTicket.subject}
            onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))}
          />
          <Textarea
            label="Description"
            required
            placeholder="Provide details about your issue…"
            rows={4}
            value={newTicket.description}
            onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
          />
          {/* Screenshot upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Screenshots
            </label>
            <label className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-surface-raised transition-all rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer group gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-overlay group-hover:bg-primary/10 transition-colors">
                <Upload size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-semibold text-text-primary">Click to select screenshots</span>
              <span className="text-[10px] text-text-disabled">PNG, JPG, JPEG, GIF</span>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
            </label>
            {screenshots.length > 0 && (
              <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border/40 bg-surface-overlay/30 p-2.5">
                {screenshots.map((b64, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl border border-border bg-surface overflow-hidden">
                    <img src={b64} alt={`Screenshot ${idx + 1}`} className="object-cover h-full w-full" />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(idx)}
                      className="absolute top-1 right-1 h-5 w-5 bg-danger hover:bg-danger/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
