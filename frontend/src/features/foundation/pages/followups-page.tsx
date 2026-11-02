"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Phone, Calendar, Clock, Activity, Filter, CheckCircle2, XCircle, MessageSquare, PhoneCall, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Card, CardHeader, CardBody, Badge, SearchBar, Pagination, Skeleton, Avatar } from "@/components/ui";
import { getLeads, type Lead } from "@/services/leads";
import { useRolePath } from "@/hooks/useRolePrefix";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "info" | "brand" | "warning" | "success" | "danger" | "outline" }> = {
  NEW: { label: "New", variant: "info" },
  CONTACTED: { label: "Contacted", variant: "brand" },
  FOLLOWUP: { label: "Follow Up", variant: "warning" },
  INTERESTED: { label: "Interested", variant: "success" },
  DEMO_SCHEDULED: { label: "Demo", variant: "info" },
  CONVERTED: { label: "Converted", variant: "success" },
  LOST: { label: "Lost", variant: "danger" },
};

export function FollowupsPage() {
  const router = useRouter();
  const rolePath = useRolePath();
  const [followupLeads, setFollowupLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterOverdue, setFilterOverdue] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads({
        page: 1,
        pageSize: 200,
        search: search || undefined,
        sortBy: "nextFollowUp",
        sortDir: "asc",
      });
      const withFollowUp = (res.data ?? []).filter(
        (l) => l.nextFollowUp && !["CONVERTED", "LOST"].includes(l.status),
      );
      setFollowupLeads(withFollowUp);
    } catch {
      toast.error("Failed to load follow-ups");
      setFollowupLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setPage(1); }, [search, filterOverdue]);

  const isOverdue = (date: string) => new Date(date) < new Date();
  const isToday = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };
  const isTomorrow = (date: string) => {
    const d = new Date(date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.toDateString() === tomorrow.toDateString();
  };

  const filteredLeads = followupLeads.filter((lead) => {
    if (!lead.nextFollowUp) return false;
    if (filterOverdue === "overdue") return isOverdue(lead.nextFollowUp);
    if (filterOverdue === "today") return isToday(lead.nextFollowUp);
    if (filterOverdue === "upcoming") return !isOverdue(lead.nextFollowUp) && !isToday(lead.nextFollowUp);
    return true;
  });

  const total = filteredLeads.length;
  const paginatedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize);

  const overdueCount = followupLeads.filter((l) => l.nextFollowUp && isOverdue(l.nextFollowUp)).length;
  const todayCount = followupLeads.filter((l) => l.nextFollowUp && isToday(l.nextFollowUp)).length;

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const leadsByDate = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    followupLeads.forEach((lead) => {
      if (!lead.nextFollowUp) return;
      const key = new Date(lead.nextFollowUp).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(lead);
    });
    return map;
  }, [followupLeads]);

  const selectedLeads = selectedDate ? (leadsByDate[selectedDate] ?? []) : [];

  const prevMonth = () => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <PageContainer
      title="Follow-ups"
      subtitle="Track and manage lead follow-ups"
    >
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={() => router.push(rolePath("/leads/create"))}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Phone size={24} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-md)]" />)
        ) : (
          <>
            <button
              onClick={() => setFilterOverdue(filterOverdue === "overdue" ? "all" : "overdue")}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-[var(--radius-md)] border transition-colors",
                filterOverdue === "overdue"
                  ? "bg-danger/10 border-danger/30"
                  : "bg-surface border-border hover:bg-surface-overlay"
              )}
            >
              <XCircle size={18} className={cn("mb-1", filterOverdue === "overdue" ? "text-danger" : "text-danger")} />
              <span className="text-lg font-bold text-text-primary">{overdueCount}</span>
              <span className="text-[10px] text-text-secondary uppercase">Overdue</span>
            </button>
            <button
              onClick={() => setFilterOverdue(filterOverdue === "today" ? "all" : "today")}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-[var(--radius-md)] border transition-colors",
                filterOverdue === "today"
                  ? "bg-warning/10 border-warning/30"
                  : "bg-surface border-border hover:bg-surface-overlay"
              )}
            >
              <Calendar size={18} className={cn("mb-1", filterOverdue === "today" ? "text-warning" : "text-warning")} />
              <span className="text-lg font-bold text-text-primary">{todayCount}</span>
              <span className="text-[10px] text-text-secondary uppercase">Today</span>
            </button>
            <button
              onClick={() => setFilterOverdue(filterOverdue === "upcoming" ? "all" : "upcoming")}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-[var(--radius-md)] border transition-colors",
                filterOverdue === "upcoming"
                  ? "bg-success/10 border-success/30"
                  : "bg-surface border-border hover:bg-surface-overlay"
              )}
            >
              <CheckCircle2 size={18} className={cn("mb-1", filterOverdue === "upcoming" ? "text-success" : "text-success")} />
              <span className="text-lg font-bold text-text-primary">{followupLeads.length - overdueCount - todayCount}</span>
              <span className="text-[10px] text-text-secondary uppercase">Upcoming</span>
            </button>
          </>
        )}
      </div>

      {/* View Toggle & Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search follow-ups..." />
        </div>
        <div className="hidden sm:flex gap-1">
          <Button size="xs" variant={viewMode === "list" ? "primary" : "outline"} onClick={() => setViewMode("list")}>
            <Activity size={14} /> List
          </Button>
          <Button size="xs" variant={viewMode === "calendar" ? "primary" : "outline"} onClick={() => setViewMode("calendar")}>
            <Calendar size={14} /> Calendar
          </Button>
        </div>
      </div>

      {/* Follow-ups List */}
      {viewMode === "list" ? (
        <Card>
          <CardBody className="pt-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />)}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <Phone size={32} className="mb-3 text-text-disabled" />
                <p className="text-sm font-medium">No follow-ups {filterOverdue !== "all" ? `for ${filterOverdue}` : "scheduled"}</p>
                <p className="text-xs mt-1">Leads with follow-up dates will appear here</p>
                {filterOverdue !== "all" && (
                  <Button size="xs" variant="ghost" className="mt-3" onClick={() => setFilterOverdue("all")}>
                    Show all
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedLeads.map((lead) => {
                  const overdue = lead.nextFollowUp ? isOverdue(lead.nextFollowUp) : false;
                  const today = lead.nextFollowUp ? isToday(lead.nextFollowUp) : false;
                  const cfg = statusConfig[lead.status];
                  const followUpDate = lead.nextFollowUp ? new Date(lead.nextFollowUp) : null;

                  return (
                    <div
                      key={lead.id}
                      className={cn(
                        "rounded-[var(--radius-md)] border p-4 transition-colors",
                        overdue ? "border-danger/30 bg-danger/5" :
                        today ? "border-warning/30 bg-warning/5" :
                        "border-border bg-surface hover:bg-surface-overlay"
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar
                          src={null}
                          name={lead.name}
                          size="md"
                          variant={overdue ? "danger" : today ? "warning" : "default"}
                        />
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => router.push(rolePath(`/leads/${lead.id}`))}
                            className="text-left"
                          >
                            <p className="font-medium text-text-primary hover:underline">{lead.name}</p>
                          </button>
                          <p className="text-xs text-text-secondary">{lead.phone}{lead.course ? ` · ${lead.course}` : ""}</p>
                        </div>
                        <Badge size="sm" variant={cfg?.variant ?? "outline"}>
                          {cfg?.label ?? lead.status}
                        </Badge>
                      </div>

                      {/* Follow-up Info */}
                      <div className={cn(
                        "flex items-center gap-2 mb-3 p-2 rounded-[var(--radius-sm)]",
                        overdue ? "bg-danger/10" : today ? "bg-warning/10" : "bg-surface-raised"
                      )}>
                        <Clock size={14} className={cn(
                          overdue ? "text-danger" : today ? "text-warning" : "text-text-secondary"
                        )} />
                        <div className="flex-1">
                          <p className={cn(
                            "text-xs font-medium",
                            overdue ? "text-danger" : today ? "text-warning" : "text-text-primary"
                          )}>
                            {followUpDate ? formatDate(lead.nextFollowUp!) : "No date"}
                          </p>
                          {followUpDate && (
                            <p className="text-[10px] text-text-secondary">
                              {formatTime(lead.nextFollowUp!)}
                            </p>
                          )}
                        </div>
                        {overdue && (
                          <Badge size="sm" variant="danger">Overdue</Badge>
                        )}
                        {today && (
                          <Badge size="sm" variant="warning">Today</Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] bg-success/10 text-success text-sm font-medium hover:bg-success/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PhoneCall size={14} />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] bg-success/10 text-success text-sm font-medium hover:bg-success/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                        <button
                          onClick={() => router.push(rolePath(`/leads/${lead.id}`))}
                          className="flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-surface-raised border border-border text-text-primary text-sm font-medium hover:bg-surface-overlay transition-colors"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Month Navigation */}
          <Card>
            <CardBody className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-overlay transition-colors">
                  <ChevronLeft size={18} className="text-text-primary" />
                </button>
                <h3 className="text-sm font-semibold text-text-primary">
                  {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <button onClick={nextMonth} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-overlay transition-colors">
                  <ChevronRight size={18} className="text-text-primary" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-[10px] font-medium text-text-secondary uppercase tracking-wider py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-[var(--radius-sm)] overflow-hidden">
                {calendarGrid.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="bg-surface min-h-[72px]" />;
                  const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                  const dateKey = date.toDateString();
                  const leadsOnDay = leadsByDate[dateKey] ?? [];
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate === dateKey;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                      className={cn(
                        "min-h-[72px] p-1.5 text-left transition-colors flex flex-col",
                        isSelected ? "bg-primary/10" : "bg-surface hover:bg-surface-overlay"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-medium mb-auto",
                        isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-text-primary"
                      )}>
                        {isToday ? <span className="text-[10px]">{day}</span> : day}
                      </span>
                      {leadsOnDay.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-auto">
                          {leadsOnDay.slice(0, 3).map((lead) => (
                            <div
                              key={lead.id}
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                new Date(lead.nextFollowUp!) < new Date() ? "bg-danger" : "bg-primary"
                              )}
                            />
                          ))}
                          {leadsOnDay.length > 3 && (
                            <span className="text-[8px] text-text-secondary ml-0.5">+{leadsOnDay.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Selected Day Leads */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h3>
                  <Badge size="sm" variant="outline">{selectedLeads.length} follow-up{selectedLeads.length !== 1 ? "s" : ""}</Badge>
                </div>
              </CardHeader>
              <CardBody className="pt-0 space-y-2">
                {selectedLeads.length === 0 ? (
                  <p className="text-xs text-text-secondary py-4 text-center">No follow-ups on this day</p>
                ) : (
                  selectedLeads.map((lead) => {
                    const overdue = lead.nextFollowUp ? new Date(lead.nextFollowUp) < new Date() : false;
                    const cfg = statusConfig[lead.status];
                    return (
                      <button
                        key={lead.id}
                        onClick={() => router.push(rolePath(`/leads/${lead.id}`))}
                        className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-surface-raised hover:bg-surface-overlay transition-colors text-left"
                      >
                        <Avatar src={null} name={lead.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{lead.name}</p>
                          <p className="text-[10px] text-text-secondary">{lead.phone}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-text-primary">{lead.nextFollowUp ? formatTime(lead.nextFollowUp) : ""}</p>
                          <Badge size="sm" variant={cfg?.variant ?? "outline"}>{cfg?.label ?? lead.status}</Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </PageContainer>
  );
}
