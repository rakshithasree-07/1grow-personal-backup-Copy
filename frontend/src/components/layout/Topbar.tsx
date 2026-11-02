"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Search, Bell, Sun, Moon, Settings, Lock, LogOut, IdCard, CheckCheck, ExternalLink, BellRing, X, Crown, Zap, AlertTriangle, Clock, MailWarning } from "lucide-react";
import { cn } from "@/lib/cn";
import { Breadcrumb } from "./Breadcrumb";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useSubscriptionStore, trialDaysRemaining } from "@/store/subscription.store";
import { notificationService } from "@/services/notification.service";

interface TopbarProps {
  onMenuToggle: () => void;
  className?: string;
}

export function Topbar({ onMenuToggle, className }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const notifBtnRef = React.useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const prevUnreadRef = React.useRef(unreadCount);

  React.useEffect(() => {
    setMounted(true);
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  React.useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  React.useEffect(() => {
    if (unreadCount > prevUnreadRef.current && unreadCount > 0 && "Notification" in window && Notification.permission === "granted") {
      new Notification("1Grow", {
        body: `You have ${unreadCount} new notification${unreadCount > 1 ? "s" : ""}`,
        icon: "/icons/logo.png",
      });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifBtnRef.current && !notifBtnRef.current.contains(e.target as Node) && !(e.target as Element)?.closest?.("#notif-panel")) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  React.useEffect(() => {
    if (notifOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [notifOpen]);

  const toggleDark = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const rolePrefix = user?.role === "SUPER_ADMIN" ? "super-admin"
    : user?.role === "OWNER" ? "owner"
    : user?.role === "BRANCH_MANAGER" ? "branch-manager"
    : user?.role === "STAFF" ? "staff"
    : user?.role === "STUDENT" ? "student"
    : user?.role === "CLIENT" ? "client"
    : "owner";

  const notifHref = `/${rolePrefix}/notifications`;
  const hasSettings = user?.role === "SUPER_ADMIN" || user?.role === "OWNER";
  const settingsHref = user?.role === "SUPER_ADMIN"
    ? "/super-admin/platform-config"
    : "/owner/organisation";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const handleOpenSettings = () => {
    setMenuOpen(false);
    if (user?.role === "OWNER") {
      router.push("/owner/organisation");
      return;
    }
    useProfileModal.getState().setTab("preferences");
    useProfileModal.getState().setOpen(true);
  };

  const handleOpenChangePassword = () => {
    setMenuOpen(false);
    useProfileModal.getState().setTab("security");
    useProfileModal.getState().setOpen(true);
  };

  const handleNotifClick = async (notification: typeof notifications[0]) => {
    if (!notification.isRead) await markAsRead(notification.id);
    setNotifOpen(false);
    if (notification.link) {
      const link = notification.link.startsWith('/dashboard')
        ? `/${rolePrefix}/dashboard`
        : notification.link;
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleEnablePush = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support push notifications");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!key) {
            toast.error("VAPID key not configured");
            return;
          }
          const newSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
          });
          await notificationService.registerDevice(JSON.stringify(newSub), "web");
        }
      } catch (e) {
        toast.error("Failed to register for push");
        return;
      }
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Permission denied. Enable from browser settings.");
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-[60px] shrink-0 items-center gap-4 border-b border-border bg-surface/95 px-4 backdrop-blur-sm",
        className,
      )}
    >
      <button
        onClick={onMenuToggle}
        className="rounded-[var(--radius-sm)] p-2 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:block flex-1">
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Subscription status badge */}
        {user?.role !== "SUPER_ADMIN" && user?.role !== "CLIENT" && subscription ? (
          <SubscriptionBadge subscription={subscription as any} />
        ) : null}

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={notifBtnRef}
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-[var(--radius-sm)] p-2 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] animate-bounce items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1 shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Desktop dropdown */}
          {notifOpen && (
            <div className="hidden md:block absolute right-0 top-full mt-2 w-96 rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl z-50" id="notif-panel">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <BellRing size={16} className="text-text-secondary" />
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {"Notification" in window && Notification.permission !== "granted" && (
                    <button onClick={handleEnablePush} className="text-xs font-medium text-primary hover:underline">Enable push</button>
                  )}
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                    <Bell size={32} className="mb-3 text-text-disabled" />
                    <p className="text-sm font-medium">No notifications yet</p>
                    <p className="text-xs mt-1">We&apos;ll notify you when something arrives</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border px-4 py-3.5 text-left transition-all hover:bg-surface-overlay group",
                        !n.isRead && "bg-primary/[0.03]"
                      )}
                    >
                      <span className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface transition-colors",
                        n.isRead ? "bg-text-disabled ring-surface" : "bg-primary ring-primary/20"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", n.isRead ? "text-text-secondary" : "font-semibold text-text-primary")}>{n.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-text-disabled mt-1.5 flex items-center gap-1.5">
                          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", n.isRead ? "bg-text-disabled" : "bg-primary")} />
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {n.link && <ExternalLink size={12} className="shrink-0 mt-1.5 text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <Link
                href={notifHref}
                onClick={() => setNotifOpen(false)}
                className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-xs font-medium text-primary hover:bg-surface-overlay transition-colors"
              >
                View all notifications
                <ExternalLink size={12} />
              </Link>
            </div>
          )}

          {/* Mobile bottom sheet */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setNotifOpen(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl border-t border-border bg-surface shadow-2xl md:hidden flex flex-col" id="notif-panel">
                {/* Handle */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <BellRing size={18} className="text-text-secondary" />
                    <h3 className="text-base font-bold text-text-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-medium text-primary">
                        <CheckCheck size={14} />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-text-secondary p-1">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                {/* List */}
                <div className="flex-1 overflow-y-auto pb-4">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                      <Bell size={40} className="mb-3 text-text-disabled" />
                      <p className="text-sm font-medium">No notifications yet</p>
                      <p className="text-xs mt-1">We&apos;ll notify you when something arrives</p>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors border-b border-border/50 active:bg-surface-overlay",
                          !n.isRead && "bg-primary/[0.04]"
                        )}
                      >
                        <span className={cn(
                          "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                          n.isRead ? "bg-border" : "bg-primary"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm leading-snug", n.isRead ? "text-text-secondary" : "font-semibold text-text-primary")}>{n.title}</p>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-3 leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-text-disabled mt-1.5">{timeAgo(n.createdAt)}</p>
                        </div>
                        {n.link && <ExternalLink size={14} className="shrink-0 mt-1.5 text-text-disabled" />}
                      </button>
                    ))
                  )}
                </div>
                {/* Footer */}
                <Link
                  href={notifHref}
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1.5 border-t border-border px-5 py-3 text-sm font-semibold text-primary hover:bg-surface-overlay transition-colors"
                >
                  View all notifications
                  <ExternalLink size={14} />
                </Link>
              </div>
            </>
          )}
        </div>

        <button onClick={toggleDark} className="rounded-[var(--radius-sm)] p-2 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors" aria-label="Toggle dark mode">
          {mounted && resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="ml-1 flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 hover:bg-surface-overlay transition-colors"
          >
            <Avatar
              src={user?.avatarUrl ?? null}
              name={user?.name ?? "User"}
              size="sm"
            />
            <span className="hidden md:block text-sm font-medium text-text-primary">
              {user?.name || "User"}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-[var(--radius-md)] border border-border bg-surface shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
              </div>
              <Link
                href={`/${rolePrefix}/profile`}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors"
              >
                <IdCard size={16} className="text-text-secondary" />
                Profile
              </Link>
              <Link
                href={notifHref}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors"
              >
                <Bell size={16} className="text-text-secondary" />
                Notifications
              </Link>
              {hasSettings && (
                <Link
                  href={settingsHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors"
                >
                  <Settings size={16} className="text-text-secondary" />
                  Settings
                </Link>
              )}
              <Link
                href={`/${rolePrefix}/profile?tab=security`}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-overlay transition-colors"
              >
                <Lock size={16} className="text-text-secondary" />
                Change Password
              </Link>
              <hr className="border-border my-1" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-overlay transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

function SubscriptionBadge({ subscription }: { subscription: { status: string; plan: { name: string; slug: string }; trialEndsAt: string | null; endDate: string } }) {
  const days = trialDaysRemaining(subscription as any);
  const status = subscription.status;
  const planName = subscription.plan.name;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const config: Record<string, { label: string; icon: React.ReactNode; className: string; glow?: string; date?: string }> = {
    TRIAL: {
      label: days > 0 ? `Trial - ${days}d left` : "Trial Expired",
      icon: <Clock size={13} />,
      className: days > 3
        ? "bg-primary/15 text-primary border-primary/30 shadow-primary/10"
        : days > 0
          ? "bg-warning/15 text-warning border-warning/30 shadow-warning/10"
          : "bg-danger/15 text-danger border-danger/30 shadow-danger/10",
      glow: days > 0 && days <= 3 ? "animate-pulse" : undefined,
      date: subscription.trialEndsAt ? fmtDate(subscription.trialEndsAt) : undefined,
    },
    ACTIVE: {
      label: planName,
      icon: <Crown size={13} />,
      className: "bg-success/15 text-success border-success/30 shadow-success/10",
      date: fmtDate(subscription.endDate),
    },
    PAST_DUE: {
      label: "Payment Due",
      icon: <AlertTriangle size={13} />,
      className: "bg-warning/15 text-warning border-warning/30 shadow-warning/10 animate-pulse",
    },
    CANCELLED: {
      label: "Cancelled",
      icon: <X size={13} />,
      className: "bg-danger/15 text-danger border-danger/30 shadow-danger/10",
    },
    EXPIRED: {
      label: "Expired",
      icon: <Zap size={13} />,
      className: "bg-danger/15 text-danger border-danger/30 shadow-danger/10",
    },
  };

  const c = config[status] || config.TRIAL;

  return (
    <Link
      href="/owner/subscription"
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold leading-none transition-all hover:scale-105 shadow-sm",
        c.className,
        c.glow,
      )}
      title={c.date ? `Valid till ${c.date}` : "View Subscription"}
    >
      {c.icon}
      <span className="hidden sm:inline">{c.label}</span>
      {c.date && (
        <span className="hidden lg:inline text-[10px] font-normal opacity-70">
          till {c.date}
        </span>
      )}
    </Link>
  );
}
