"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, ExternalLink, Mail, MessageSquare, Smartphone,
  Globe, AlertCircle, Info, CheckCircle2, CreditCard, Users, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotificationStore } from "@/store/notification.store";
import { useAuthStore } from "@/store/auth.store";

const ROLE_SLUG_MAP: Record<string, string> = {
  SUPER_ADMIN: "super-admin",
  OWNER: "owner",
  BRANCH_MANAGER: "branch-manager",
  STAFF: "staff",
  STUDENT: "student",
  CLIENT: "client",
};

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  IN_APP: { icon: Bell, color: "text-primary", bg: "bg-primary/10" },
  EMAIL: { icon: Mail, color: "text-info", bg: "bg-info/10" },
  PUSH: { icon: Smartphone, color: "text-success", bg: "bg-success/10" },
  SMS: { icon: MessageSquare, color: "text-warning", bg: "bg-warning/10" },
  WHATSAPP: { icon: Globe, color: "text-secondary", bg: "bg-secondary/10" },
};

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "This Week";
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) return "Earlier This Month";
  return "Older";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4">
          <Skeleton className="mt-1 h-3 w-3 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    notifications, loading, total, unreadCount,
    fetchNotifications, markAsRead, markAllAsRead,
  } = useNotificationStore();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = React.useState(false);

  React.useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const filtered = React.useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [notifications, filter]);

  const groups = React.useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const n of filtered) {
      const group = getDateGroup(n.createdAt);
      const arr = map.get(group) || [];
      arr.push(n);
      map.set(group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleClick = async (n: typeof notifications[0]) => {
    if (!n.isRead) await markAsRead(n.id);
    if (n.link) {
      const slug = user?.role ? ROLE_SLUG_MAP[user.role] ?? "owner" : "owner";
      const link = n.link.startsWith("/dashboard") ? `/${slug}/dashboard` : n.link;
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
  };

  const getChannelConfig = (channel: string) => {
    return CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.IN_APP;
  };

  const isLoading = loading && notifications.length === 0;
  const isEmpty = !loading && notifications.length === 0;
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <PageContainer
      title="Notifications"
      subtitle={
        <span className="flex items-center gap-2">
          Stay updated with your latest activity
          {unreadCount > 0 && (
            <Badge variant="brand" size="sm">{unreadCount} unread</Badge>
          )}
        </span>
      }
      actions={
        hasUnread ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            loading={markingAll}
            leftIcon={<CheckCheck size={14} />}
          >
            Mark all read
          </Button>
        ) : undefined
      }
    >
      {/* Filter Tabs */}
      {!isLoading && !isEmpty && (
        <div className="mb-4 flex items-center gap-1 rounded-xl bg-surface-overlay/60 p-1 border border-border/40">
          {(["all", "unread"] as const).map((tab) => {
            const count = tab === "all" ? total : unreadCount;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  filter === tab
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {tab === "all" ? "All" : "Unread"}
                {count > 0 && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                    filter === tab ? "bg-primary/10 text-primary" : "bg-border/50 text-text-secondary",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardBody className="p-0">
            <NotificationSkeleton />
          </CardBody>
        </Card>
      ) : isEmpty ? (
        <EmptyState
          icon={<Bell size={40} className="text-text-disabled" />}
          title="No notifications yet"
          description="When you receive notifications, they will appear here. We'll keep you updated on important activity."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={40} className="text-success" />}
          title="All caught up"
          description="You have no unread notifications. Nice work staying on top of things!"
        />
      ) : (
        <div className="space-y-5">
          {groups.map(([label, items]) => (
            <div key={label}>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {label}
              </h3>
              <Card>
                <CardBody className="p-0">
                  <AnimatePresence>
                    {items.map((n, idx) => {
                      const ch = getChannelConfig(n.channel);
                      const Icon = ch.icon;
                      return (
                        <motion.button
                          key={n.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.03, duration: 0.2 }}
                          onClick={() => handleClick(n)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all border-b border-border/40 last:border-0",
                            "active:bg-surface-overlay sm:hover:bg-surface-overlay/60",
                            !n.isRead && "bg-primary/[0.03]",
                          )}
                        >
                          {/* Channel Icon */}
                          <div className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            ch.bg,
                          )}>
                            <Icon size={16} className={ch.color} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-sm leading-snug",
                                n.isRead ? "text-text-secondary" : "font-semibold text-text-primary",
                              )}>
                                {n.title}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {!n.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                                {n.link && (
                                  <ExternalLink size={12} className="text-text-disabled" />
                                )}
                              </div>
                            </div>
                            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                              {n.body}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <p className="text-[10px] text-text-disabled">{timeAgo(n.createdAt)}</p>
                              <span className="text-[10px] text-text-disabled/50">·</span>
                              <p className={cn("text-[10px] font-medium", ch.color)}>{n.channel.replace("_", " ")}</p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
