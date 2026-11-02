"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bell,
  MoreHorizontal,
  Calendar,
  FileText,
  CreditCard,
  IdCard,
  BookMarked,
  Target,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth.store";

interface MobileTab {
  label: string;
  href?: string;
  icon: React.ElementType;
  onClick?: () => void;
}

const roleTabs: Record<string, MobileTab[]> = {
  OWNER: [
    { label: "Home", href: "/owner/dashboard", icon: LayoutDashboard },
    { label: "Leads", href: "/owner/leads", icon: Target },
    { label: "Students", href: "/owner/students", icon: Users },
    { label: "Alerts", href: "/owner/notifications", icon: Bell },
    { label: "More", href: "/owner/reports", icon: MoreHorizontal },
  ],
  BRANCH_MANAGER: [
    { label: "Home", href: "/branch-manager/dashboard", icon: LayoutDashboard },
    { label: "Leads", href: "/branch-manager/leads", icon: Target },
    { label: "Students", href: "/branch-manager/students", icon: Users },
    { label: "Alerts", href: "/branch-manager/notifications", icon: Bell },
    { label: "More", href: "/branch-manager/reports", icon: MoreHorizontal },
  ],
  STAFF: [
    { label: "Home", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Leads", href: "/staff/leads", icon: Target },
    { label: "Students", href: "/staff/students", icon: Users },
    { label: "Alerts", href: "/staff/notifications", icon: Bell },
    { label: "More", href: "/staff/reports", icon: MoreHorizontal },
  ],
  STUDENT: [
    { label: "Home", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Courses", href: "/student/my-courses", icon: BookMarked },
    { label: "Payments", href: "/student/fees", icon: CreditCard },
    { label: "Alerts", href: "/student/notifications", icon: Bell },
    { label: "Profile", href: "/student/profile", icon: IdCard },
  ],
  CLIENT: [
    { label: "Home", href: "/client/dashboard", icon: LayoutDashboard },
    { label: "Bookings", href: "/client/bookings", icon: Calendar },
    { label: "Invoices", href: "/client/invoices", icon: FileText },
    { label: "Alerts", href: "/client/notifications", icon: Bell },
    { label: "Profile", href: "/client/profile", icon: IdCard },
  ],
};

/** Minimal tabs shown while a user is waiting for role approval */
function getPendingTabs(role: string): MobileTab[] {
  const prefix =
    role === "BRANCH_MANAGER" ? "/branch-manager"
    : role === "STAFF"        ? "/staff"
    : role === "STUDENT"      ? "/student"
    : role === "CLIENT"       ? "/client"
    : role === "TRAINER"      ? "/trainer"
    : "/owner";

  return [
    { label: "Home",    href: `${prefix}/dashboard`,     icon: LayoutDashboard },
    { label: "Alerts",  href: `${prefix}/notifications`, icon: Bell },
    { label: "Profile", href: `${prefix}/profile`,       icon: IdCard },
    { label: "Support", href: `${prefix}/support`,       icon: MessageSquare },
  ];
}

/*
 * All colours are driven by CSS variables from tokens.css so both light and
 * dark modes are handled without JavaScript isDark branching.
 *
 * The bar itself uses bg-primary (same as the sidebar).
 * Active tab:   var(--sidebar-active-bg) background + var(--sidebar-active-text) colour
 * Inactive tab: var(--sidebar-text) colour + var(--sidebar-hover-bg) on hover
 */
export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  // Only resolve role-specific tabs after client hydration to prevent SSR↔client mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const isPending = user?.status === "ACCESS_REQUESTED" || user?.status === "PENDING_APPROVAL" || user?.status === "PROFILE_COMPLETED";
  const tabs = mounted
    ? isPending
      ? getPendingTabs(user?.role ?? "")
      : (roleTabs[user?.role ?? ""] ?? roleTabs.CLIENT)
    : [];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-primary md:hidden"
      style={{ borderColor: "var(--sidebar-border)" }}
      aria-label="Mobile navigation"
    >
      {tabs.map(({ label, href, onClick, icon: Icon }) => {
        const active = href
          ? pathname === href || pathname.startsWith(href + "/")
          : false;

        const activeStyle: React.CSSProperties = {
          background: "var(--sidebar-active-bg)",
          color: "var(--sidebar-active-text)",
          fontWeight: 600,
        };
        const inactiveStyle: React.CSSProperties = {
          color: "var(--sidebar-text)",
        };

        const content = (
          <>
            <Icon size={20} />
            <span>{label}</span>
          </>
        );

        if (onClick) {
          return (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors"
              style={inactiveStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
                (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
              }}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={href}
            href={href!}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors"
            )}
            style={active ? activeStyle : inactiveStyle}
            aria-current={active ? "page" : undefined}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
                (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
              }
            }}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
