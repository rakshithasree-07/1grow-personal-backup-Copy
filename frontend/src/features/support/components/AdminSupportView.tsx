"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, MessageSquare, Loader2, RefreshCw,
  Search, X, User, BarChart3, ArrowLeft,
} from "lucide-react";
import { Badge, StatCard, Skeleton, Select, Avatar } from "@/components/ui";
import { supportService, type SupportTicket, type SupportStats } from "@/services/support";
import { toast } from "sonner";
import { TicketChat } from "./TicketChat";

const STATUS_CONFIG: Record<string, { label: string; variant: "info" | "warning" | "success" | "danger"; color: string; dot: string }> = {
  OPEN:        { label: "Open",        variant: "info",    color: "bg-info/10 text-info border-info/20",          dot: "bg-info"    },
  IN_PROGRESS: { label: "In Progress", variant: "warning", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  WAITING:     { label: "Waiting",     variant: "warning", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  RESOLVED:    { label: "Resolved",    variant: "success", color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  CLOSED:      { label: "Closed",      variant: "danger",  color: "bg-danger/10 text-danger border-danger/20",    dot: "bg-danger"  },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: "danger" | "warning" | "info" | "outline" }> = {
  CRITICAL: { label: "Critical", variant: "danger"  },
  URGENT:   { label: "Urgent",   variant: "danger"  },
  HIGH:     { label: "High",     variant: "warning" },
  MEDIUM:   { label: "Medium",   variant: "info"    },
  LOW:      { label: "Low",      variant: "outline" },
};

export function AdminSupportView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketResult, statsData] = await Promise.all([
        supportService.listTickets({ pageSize: 50, status: statusFilter || undefined }),
        supportService.getStats(),
      ]);
      setTickets(ticketResult.data);
      setStats(statsData);
    } catch {
      toast.error("Failed to load support data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openTicket = async (ticket: SupportTicket) => {
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

  const handleBack = () => { setSelectedTicket(null); setMessages([]); };

  const handleSendMessage = async (message: string) => {
    if (!selectedTicket) return;
    await supportService.addMessage(selectedTicket.id, { message });
    const full = await supportService.getTicket(selectedTicket.id);
    setMessages(full.messages ?? []);
    setSelectedTicket(full);
    setTickets((prev) => prev.map((t) => (t.id === full.id ? full : t)));
    fetchData();
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

  const handleStatusChange = async (ticket: SupportTicket, newStatus: string) => {
    try {
      await supportService.updateStatus(ticket.id, { status: newStatus });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      fetchData();
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      !search ||
      t.subject.toLowerCase().includes(q) ||
      t.ticketNo?.toLowerCase().includes(q) ||
      t.user?.name?.toLowerCase().includes(q)
    );
  });

  // ── CHAT VIEW ──────────────────────────────────────────────────────────────
  if (selectedTicket) {
    const statusCfg = STATUS_CONFIG[selectedTicket.status];
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] rounded-2xl border border-border/60 bg-surface overflow-hidden shadow-[var(--shadow-1)]">
        {/* Single header — TicketChat renders no header of its own */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
          <button
            onClick={handleBack}
            aria-label="Back to tickets"
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-overlay transition-colors text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{selectedTicket.subject}</p>
            <p className="text-[11px] text-text-secondary">
              #{selectedTicket.ticketNo}
              {selectedTicket.user?.name && ` · ${selectedTicket.user.name}`}
              {selectedTicket.category?.name && ` · ${selectedTicket.category.name}`}
            </p>
          </div>
          {/* Status changer */}
          <Select
            value={selectedTicket.status}
            onChange={(val) => handleStatusChange(selectedTicket, val)}
            options={[
              { value: "OPEN",        label: "Open"        },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "WAITING",     label: "Waiting"     },
              { value: "RESOLVED",    label: "Resolved"    },
              { value: "CLOSED",      label: "Closed"      },
            ]}
            className="w-36"
          />
          <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold ${statusCfg?.color ?? "bg-info/10 text-info border-info/20"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg?.dot ?? "bg-info"}`} />
            {statusCfg?.label ?? selectedTicket.status}
          </span>
        </div>

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
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { title: "Open",        value: stats.open,       icon: <MessageSquare size={18} />, className: "bg-gradient-to-br from-info/10 to-info/5 border-info/20"       },
            { title: "In Progress", value: stats.inProgress, icon: <Loader2 size={18} />,       className: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20" },
            { title: "Resolved",    value: stats.resolved,   icon: <RefreshCw size={18} />,     className: "bg-gradient-to-br from-success/10 to-success/5 border-success/20" },
            { title: "Closed",      value: stats.closed,     icon: <BarChart3 size={18} />,     className: ""                                                                 },
            { title: "Total",       value: stats.total,      icon: <BarChart3 size={18} />,     className: ""                                                                 },
          ].map((s) => (
            <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} className={s.className} />
          ))}
        </div>
      )}

      {/* Search, filter, refresh */}
      <div className="flex gap-2.5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets, users…"
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
            { value: "",            label: "All Status"  },
            { value: "OPEN",        label: "Open"        },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "WAITING",     label: "Waiting"     },
            { value: "RESOLVED",    label: "Resolved"    },
            { value: "CLOSED",      label: "Closed"      },
          ]}
          className="w-36 h-11"
        />
        <button
          onClick={fetchData}
          className="shrink-0 flex items-center gap-2 h-11 px-4 rounded-2xl border border-border/60 bg-surface text-sm font-semibold text-text-primary hover:bg-surface-overlay hover:border-primary/30 transition-all active:scale-[0.97]"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-overlay/60 mb-4">
            <MessageSquare size={28} className="text-text-disabled" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {search || statusFilter ? "No matching tickets" : "No tickets found"}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {statusFilter ? "Try a different filter" : "No support tickets yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTickets.map((t) => {
            const statusCfg = STATUS_CONFIG[t.status];
            const priorityCfg = PRIORITY_CONFIG[t.priority];
            return (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className="w-full flex items-center gap-3.5 rounded-2xl border border-border/50 bg-surface p-4 text-left hover:border-primary/30 hover:bg-surface-overlay/30 hover:shadow-sm transition-all duration-200 active:scale-[0.99] group"
              >
                {/* Avatar with status dot */}
                <div className="relative shrink-0">
                  <Avatar src={(t.user as any)?.avatarUrl ?? null} name={t.user?.name ?? "U"} size="sm" />
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${statusCfg?.dot ?? "bg-info"}`} />
                </div>

                {/* Subject + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                      {t.subject}
                    </p>
                    {priorityCfg && (
                      <Badge size="sm" variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <span className="font-mono text-text-secondary/70">#{t.ticketNo}</span>
                    <span className="text-text-disabled">·</span>
                    <span className="flex items-center gap-0.5">
                      <User size={10} /> {t.user?.name ?? "Unknown"}
                    </span>
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

                {/* Time + status + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-text-secondary/60 tabular-nums hidden sm:block">
                    {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold ${statusCfg?.color ?? "bg-info/10 text-info border-info/20"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusCfg?.dot ?? "bg-info"}`} />
                    {statusCfg?.label ?? t.status}
                  </span>
                  <ChevronRight size={14} className="text-text-disabled group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
