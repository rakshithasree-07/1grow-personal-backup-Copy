"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  GraduationCap,
  BarChart2,
  Shield,
  ShieldAlert,
  KeyRound,
  Building2,
  IdCard,
  Fingerprint,
  History,
  ScrollText,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Calendar,
  TrendingUp,
  Award,
  HelpCircle,
  MessageSquare,
  FileText,
  CalendarDays,
  Target,
  PhoneCall,
  BookMarked,
  Layers,
  Clock,
  Receipt,
  Wallet,
  UserCheck,
  ArrowLeftRight,
  RefreshCw,
  FileCheck,
  Truck,
  Wrench,
  AlertOctagon,
  FileSignature,
  UserPlus,
  Store,
  Coins,
  Play,
  CheckSquare,
  LayoutGrid,
  Undo2,
  Box,
  Package,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { useStudentRequests } from "@/hooks/useStudentRequests";
import { useSubscriptionStore, getActiveModules } from "@/store/subscription.store";
import { SIDEBAR_MODULE_MAP } from "@/lib/modules";
import { INDUSTRY_NAV_MAP, isIndustryActive } from "@/lib/industries";

// ─── Nav definitions ──────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  onClick?: () => void;
  children?: Omit<NavItem, "children">[];
}

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
  {
    label: "Administration",
    icon: Shield,
    children: [
      { label: "Access Requests", href: "/super-admin/access-requests", icon: UserCheck },
      { label: "Users", href: "/super-admin/users", icon: Users },
      { label: "Roles", href: "/super-admin/roles", icon: KeyRound },
      { label: "Permissions", href: "/super-admin/permissions", icon: Shield },
    ],
  },
  { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
  {
    label: "Finance",
    icon: CreditCard,
    children: [
      { label: "Invoices", href: "/super-admin/invoices", icon: FileText },
      { label: "Payments", href: "/super-admin/payments", icon: Wallet },
    ],
  },
  {
    label: "Security",
    icon: ShieldAlert,
    children: [
      { label: "Sessions", href: "/super-admin/sessions", icon: Fingerprint },
      { label: "Login History", href: "/super-admin/login-history", icon: History },
      { label: "Audit Logs", href: "/super-admin/audit-logs", icon: ScrollText },
      { label: "Activity Logs", href: "/super-admin/activity-logs", icon: Activity },
      { label: "Security Events", href: "/super-admin/security-events", icon: AlertTriangle },
    ],
  },
  { label: "Certificate Templates", href: "/super-admin/certificate-templates", icon: FileText },
  { label: "Support", href: "/super-admin/support", icon: MessageSquare },
  { label: "Notifications", href: "/super-admin/notifications", icon: Bell },
  { label: "Profile", href: "/super-admin/profile", icon: IdCard },
  { label: "Settings", href: "/super-admin/platform-config", icon: Settings },
];

const ownerNav: NavItem[] = [
  { label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { label: "Access Requests", href: "/owner/access-requests", icon: UserCheck },
  {
    label: "Leads",
    icon: Target,
    children: [
      { label: "Dashboard", href: "/owner/leads/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/owner/leads", icon: Target },
      { label: "Follow-ups", href: "/owner/leads/follow-ups", icon: PhoneCall },
    ],
  },
  {
    label: "Training",
    icon: BookOpen,
    children: [
      { label: "Programs", href: "/owner/training/programs", icon: BookMarked },
      { label: "Batches", href: "/owner/training/batches", icon: Layers },
      { label: "Schedules", href: "/owner/training/schedules", icon: Calendar },
      { label: "Trainers", href: "/owner/training/trainers", icon: GraduationCap },
      { label: "Students", href: "/owner/training/students", icon: Users },
      { label: "Enrollments", href: "/owner/training/enrollments", icon: UserCheck },
      { label: "Attendance", href: "/owner/training/attendance", icon: ClipboardCheck },
      { label: "Progress", href: "/owner/training/progress", icon: TrendingUp },
      { label: "Certificates", href: "/owner/training/certificates", icon: Award },
    ],
  },
  {
    label: "Rental",
    icon: Package,
    children: [
      { label: "Inventory", href: "/owner/rental/inventory", icon: Box },
      { label: "Catalogue", href: "/owner/rental/catalogue", icon: LayoutGrid },
      { label: "Enquiries", href: "/owner/rental/enquiries", icon: HelpCircle },
      { label: "Quotations", href: "/owner/rental/quotations", icon: FileText },
      { label: "Bookings", href: "/owner/rental/bookings", icon: CalendarDays },
      { label: "Dispatch", href: "/owner/rental/dispatch", icon: Truck },
      { label: "Returns", href: "/owner/rental/returns", icon: Undo2 },
      { label: "Maintenance", href: "/owner/rental/maintenance", icon: Wrench },
      { label: "Damage & Penalties", href: "/owner/rental/damage", icon: AlertTriangle },
    ],
  },
  {
    label: "Events",
    icon: CalendarDays,
    children: [
      { label: "Events", href: "/owner/events", icon: CalendarDays },
      { label: "Proposals", href: "/owner/events/proposals", icon: FileText },
      { label: "Quotations", href: "/owner/events/quotations", icon: FileText },
      { label: "Clients", href: "/owner/events/clients", icon: Users },
      { label: "Team Assignment", href: "/owner/events/team-assignment", icon: UserPlus },
      { label: "Vendors", href: "/owner/events/vendors", icon: Store },
      { label: "Tasks", href: "/owner/events/tasks", icon: ClipboardList },
      { label: "Timeline", href: "/owner/events/timeline", icon: Clock },
      { label: "Budget", href: "/owner/events/budget", icon: Coins },
      { label: "Event Execution", href: "/owner/events/execution", icon: Play },
    ],
  },
  {
    label: "Finance",
    icon: CreditCard,
    children: [
      { label: "Fee Plans / Pricing", href: "/owner/finance/fee-plans", icon: Receipt },
      { label: "Invoices", href: "/owner/finance/invoices", icon: FileText },
      { label: "Payments", href: "/owner/finance/payments", icon: Wallet },
      { label: "Payment History", href: "/owner/finance/payment-history", icon: History },
      { label: "Due Tracking", href: "/owner/finance/due-tracking", icon: AlertTriangle },
    ],
  },
  {
    label: "Operations",
    icon: ClipboardCheck,
    children: [
      { label: "Tasks", href: "/owner/operations/tasks", icon: ClipboardList },
      { label: "Documents", href: "/owner/operations/documents", icon: FileCheck },
    ],
  },
  { label: "Reports", href: "/owner/reports", icon: BarChart2 },
  { label: "Users", href: "/owner/users", icon: Users },
  { label: "Organisation", href: "/owner/organisation", icon: Building2 },
  { label: "Subscription", href: "/owner/subscription", icon: CreditCard },
  { label: "Audit Logs", href: "/owner/audit-logs", icon: ScrollText },
  { label: "Notifications", href: "/owner/notifications", icon: Bell },
  { label: "Profile", href: "/owner/profile", icon: IdCard },
  { label: "Support", href: "/owner/support", icon: MessageSquare },
];

const branchManagerNav: NavItem[] = [
  { label: "Dashboard", href: "/branch-manager/dashboard", icon: LayoutDashboard },
  { label: "Tenant Registration", href: "/branch-manager/organisation", icon: Building2 },
  { label: "Access Requests", href: "/branch-manager/access-requests", icon: UserCheck },
  {
    label: "Leads",
    icon: Target,
    children: [
      { label: "Dashboard", href: "/branch-manager/leads/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/branch-manager/leads", icon: Target },
      { label: "Follow-ups", href: "/branch-manager/leads/follow-ups", icon: PhoneCall },
    ],
  },
  {
    label: "Training",
    icon: BookOpen,
    children: [
      { label: "Programs", href: "/branch-manager/training/programs", icon: BookMarked },
      { label: "Batches", href: "/branch-manager/training/batches", icon: Layers },
      { label: "Schedules", href: "/branch-manager/training/schedules", icon: Calendar },
      { label: "Trainers", href: "/branch-manager/training/trainers", icon: GraduationCap },
      { label: "Students", href: "/branch-manager/training/students", icon: Users },
      { label: "Enrollments", href: "/branch-manager/training/enrollments", icon: UserCheck },
      { label: "Attendance", href: "/branch-manager/training/attendance", icon: ClipboardCheck },
      { label: "Progress", href: "/branch-manager/training/progress", icon: TrendingUp },
      { label: "Certificates", href: "/branch-manager/training/certificates", icon: Award },
    ],
  },
  {
    label: "Rental",
    icon: Package,
    children: [
      { label: "Inventory", href: "/branch-manager/rental/inventory", icon: Box },
      { label: "Bookings", href: "/branch-manager/rental/bookings", icon: CalendarDays },
      { label: "Dispatch", href: "/branch-manager/rental/dispatch", icon: Truck },
      { label: "Returns", href: "/branch-manager/rental/returns", icon: Undo2 },
      { label: "Maintenance", href: "/branch-manager/rental/maintenance", icon: Wrench },
    ],
  },
  {
    label: "Events",
    icon: CalendarDays,
    children: [
      { label: "Events", href: "/branch-manager/events", icon: CalendarDays },
      { label: "Quotations", href: "/branch-manager/events/quotations", icon: FileText },
      { label: "Team Assignment", href: "/branch-manager/events/team-assignment", icon: UserPlus },
      { label: "Tasks", href: "/branch-manager/events/tasks", icon: ClipboardList },
      { label: "Timeline", href: "/branch-manager/events/timeline", icon: Clock },
      { label: "Event Execution", href: "/branch-manager/events/execution", icon: Play },
    ],
  },
  {
    label: "Finance",
    icon: CreditCard,
    children: [
      { label: "Invoices", href: "/branch-manager/finance/invoices", icon: FileText },
      { label: "Payments", href: "/branch-manager/finance/payments", icon: Wallet },
      { label: "Due Tracking", href: "/branch-manager/finance/due-tracking", icon: AlertTriangle },
    ],
  },
  {
    label: "Operations",
    icon: ClipboardCheck,
    children: [
      { label: "Tasks", href: "/branch-manager/operations/tasks", icon: ClipboardList },
      { label: "Documents", href: "/branch-manager/operations/documents", icon: FileCheck },
    ],
  },
  { label: "Reports", href: "/branch-manager/reports", icon: BarChart2 },
  { label: "Users", href: "/branch-manager/users", icon: Users },
  { label: "Notifications", href: "/branch-manager/notifications", icon: Bell },
  { label: "Profile", href: "/branch-manager/profile", icon: IdCard },
  { label: "Support", href: "/branch-manager/support", icon: MessageSquare },
];

const staffNav: NavItem[] = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  {
    label: "Leads",
    icon: Target,
    children: [
      { label: "Dashboard", href: "/staff/leads/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/staff/leads", icon: Target },
      { label: "Follow-ups", href: "/staff/leads/follow-ups", icon: PhoneCall },
    ],
  },
  {
    label: "Training",
    icon: BookOpen,
    children: [
      { label: "Batches", href: "/staff/training/batches", icon: Layers },
      { label: "Schedule", href: "/staff/training/schedule", icon: Calendar },
      { label: "Students", href: "/staff/training/students", icon: Users },
      { label: "Attendance", href: "/staff/training/attendance", icon: ClipboardCheck },
      { label: "Progress", href: "/staff/training/progress", icon: TrendingUp },
      { label: "Certificates", href: "/staff/training/certificates", icon: Award },
    ],
  },
  {
    label: "Rental",
    icon: Package,
    children: [
      { label: "Inventory", href: "/staff/rental/inventory", icon: Box },
      { label: "Bookings", href: "/staff/rental/bookings", icon: CalendarDays },
      { label: "Dispatch", href: "/staff/rental/dispatch", icon: Truck },
      { label: "Returns", href: "/staff/rental/returns", icon: Undo2 },
    ],
  },
  {
    label: "Events",
    icon: CalendarDays,
    children: [
      { label: "Assigned Events", href: "/staff/events/assigned", icon: CalendarDays },
      { label: "Tasks", href: "/staff/events/tasks", icon: ClipboardList },
      { label: "Timeline", href: "/staff/events/timeline", icon: Clock },
      { label: "Event Checklist", href: "/staff/events/checklist", icon: CheckSquare },
    ],
  },
  {
    label: "Finance",
    icon: CreditCard,
    children: [
      { label: "Payments", href: "/staff/finance/payments", icon: Wallet },
      { label: "Due Tracking", href: "/staff/finance/due-tracking", icon: AlertTriangle },
    ],
  },
  {
    label: "Operations",
    icon: ClipboardCheck,
    children: [
      { label: "Tasks", href: "/staff/operations/tasks", icon: ClipboardList },
      { label: "Documents", href: "/staff/operations/documents", icon: FileCheck },
    ],
  },
  { label: "Notifications", href: "/staff/notifications", icon: Bell },
  { label: "Profile", href: "/staff/profile", icon: IdCard },
  { label: "Support", href: "/staff/support", icon: MessageSquare },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "My Requests", href: "/student/my-requests", icon: Clock },
  { label: "My Courses", href: "/student/my-courses", icon: BookOpen },
  { label: "Schedule", href: "/student/schedule", icon: Calendar },
  { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
  { label: "Fees", href: "/student/fees", icon: CreditCard },
  { label: "Progress", href: "/student/progress", icon: TrendingUp },
  { label: "Certificates", href: "/student/certificates", icon: Award },
  { label: "Notifications", href: "/student/notifications", icon: Bell },
  { label: "Profile", href: "/student/profile", icon: IdCard },
  { label: "Support", href: "/student/support", icon: HelpCircle },
];

const clientRentalNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "Catalogue", href: "/client/rental/catalogue", icon: LayoutGrid },
  { label: "Bookings", href: "/client/rental/bookings", icon: CalendarDays },
  { label: "Quotations", href: "/client/rental/quotations", icon: FileText },
  { label: "Rental Agreements", href: "/client/rental/agreements", icon: FileSignature },
  { label: "Documents", href: "/client/rental/documents", icon: FileCheck },
  { label: "Invoices", href: "/client/finance/invoices", icon: FileText },
  { label: "Payments", href: "/client/finance/payments", icon: Wallet },
  { label: "Payment History", href: "/client/finance/payment-history", icon: History },
  { label: "Notifications", href: "/client/notifications", icon: Bell },
  { label: "Profile", href: "/client/profile", icon: IdCard },
  { label: "Support", href: "/client/support", icon: HelpCircle },
];

const clientEventNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "My Events", href: "/client/events/my-events", icon: CalendarDays },
  { label: "Proposals", href: "/client/events/proposals", icon: FileText },
  { label: "Quotations", href: "/client/events/quotations", icon: FileText },
  { label: "Contracts", href: "/client/events/contracts", icon: FileSignature },
  { label: "Documents", href: "/client/events/documents", icon: FileCheck },
  { label: "Invoices", href: "/client/finance/invoices", icon: FileText },
  { label: "Payments", href: "/client/finance/payments", icon: Wallet },
  { label: "Event Timeline", href: "/client/events/timeline", icon: Clock },
  { label: "Notifications", href: "/client/notifications", icon: Bell },
  { label: "Profile", href: "/client/profile", icon: IdCard },
  { label: "Support", href: "/client/support", icon: HelpCircle },
];

function getNav(user: any): NavItem[] {
  const role = user?.role;
  const industries: string[] = user?.industries ?? [];

  switch (role) {
    case "OWNER": return ownerNav;
    case "BRANCH_MANAGER": return branchManagerNav;
    case "STAFF": return staffNav;
    case "STUDENT": return studentNav;
    case "CLIENT":
      if (industries.includes("EVENT")) return clientEventNav;
      return clientRentalNav;
    default: return ownerNav;
  }
}

/** Returns true when the user cannot access the full app (pending or rejected) */
function isAccessRestricted(status: string | undefined): boolean {
  return status === "ACCESS_REQUESTED" || status === "PENDING_APPROVAL" || status === "PROFILE_COMPLETED";
}

/** Minimal nav shown while approval is pending — role-aware href prefix */
function getPendingNav(role: string): NavItem[] {
  const prefix =
    role === "BRANCH_MANAGER" ? "/branch-manager"
    : role === "STAFF"        ? "/staff"
    : role === "STUDENT"      ? "/student"
    : role === "CLIENT"       ? "/client"
    : role === "TRAINER"      ? "/trainer"
    : "/owner";

  return [
    { label: "Dashboard",     href: `${prefix}/dashboard`,     icon: LayoutDashboard },
    { label: "Notifications", href: `${prefix}/notifications`, icon: Bell },
    { label: "Profile",       href: `${prefix}/profile`,       icon: IdCard },
    { label: "Support",       href: `${prefix}/support`,       icon: MessageSquare },
  ];
}

// ─── Shared item style helpers (pure CSS vars — no theme JS needed) ───────────

/**
 * All colours driven by CSS variables from tokens.css.
 * Hover/active states are handled purely via Tailwind + CSS — no imperative
 * el.style manipulation, which causes React reconciliation glitches.
 *
 * CSS variables used:
 *   --sidebar-text              inactive text (white)
 *   --sidebar-text-hover        hovered text
 *   --sidebar-hover-bg          hover background
 *   --sidebar-active-bg         active item background (white pill)
 *   --sidebar-active-text       active item text (primary color)
 *   --sidebar-parent-active-bg  parent group with active child
 *   --sidebar-border            header / footer divider
 */

// ─── Collapsed sidebar flyout components (portal-based) ─────────────────────
// These render via React portals at <body> level so they escape the
// overflow-hidden ancestors and are always visible.

/** Hover tooltip for leaf items in collapsed sidebar */
function CollapsedTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
    }, 150);
  };
  const close = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPos(null), 100);
  };

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div ref={triggerRef} className="relative" onMouseEnter={open} onMouseLeave={close}>
      {children}
      {pos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none -translate-y-1/2"
          style={{ top: pos.top, left: pos.left }}
          role="tooltip"
        >
          <div
            className="px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap"
            style={{
              background: "var(--sidebar-hover-bg)",
              color: "var(--sidebar-text-hover, var(--sidebar-text))",
            }}
          >
            {label}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Flyout submenu for accordion items in collapsed sidebar */
function CollapsedFlyout({
  item,
  isActive,
  onItemClick,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
  onItemClick?: () => void;
}) {
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.right + 4 });
    }, 120);
  };
  const close = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPos(null), 180);
  };

  const keepOpen = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Close on outside click
  React.useEffect(() => {
    if (!pos) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && triggerRef.current.contains(e.target as Node)
      ) return;
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
      setPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pos]);

  const Icon = item.icon;
  const hasActiveChild = item.children?.some((c) => c.href && isActive(c.href));

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <button
        onClick={() => {
          if (pos) {
            setPos(null);
          } else {
            const el = triggerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setPos({ top: r.top, left: r.right + 4 });
          }
        }}
        className={cn(
          "sidebar-item",
          "flex items-center justify-center w-full px-2 py-2 text-sm font-semibold rounded-lg",
          hasActiveChild && "sidebar-item-expanded",
        )}
        title={item.label}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
      </button>

      {pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={keepOpen}
          onMouseLeave={close}
        >
          <div
            className="py-1.5 px-1 rounded-xl shadow-xl min-w-[180px] border"
            style={{
              background: "var(--sidebar-bg)",
              borderColor: "var(--sidebar-border)",
            }}
          >
            <div
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b mb-1"
              style={{
                color: "var(--sidebar-text)",
                borderColor: "var(--sidebar-border)",
                opacity: 0.5,
              }}
            >
              {item.label}
            </div>
            {item.children!.map((child) => {
              const ChildIcon = child.icon;
              const childActive = child.href ? isActive(child.href) : false;
              return (
                <Link
                  key={child.href}
                  href={child.href!}
                  onClick={() => {
                    setPos(null);
                    onItemClick?.();
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    "hover:bg-surface-overlay",
                    childActive && "sidebar-item-child-active",
                  )}
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

interface SidebarContentProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

function SidebarContent({ isCollapsed = false, onItemClick }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const { hasRequests } = useStudentRequests();

  // Gate: only render nav content after client hydration to avoid SSR↔client
  // mismatches from auth store (user/role) and next-themes (theme).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const isActive = React.useCallback((href: string) => {
    if (href.endsWith("/dashboard")) return pathname === href;
    return pathname.startsWith(href);
  }, [pathname]);

  const navItems = React.useMemo(() => {
    if (!mounted) return [];
    if (user?.role === "SUPER_ADMIN") return superAdminNav;
    if (isAccessRestricted(user?.status)) return getPendingNav(user?.role ?? "");
    const nav = getNav(user);
    let filtered = nav;

    // Hide "Tenant Registration" for users without a tenant
    if (!user?.tenantId) {
      filtered = filtered.filter((item) => item.label !== "Tenant Registration");
    }

    // For OWNER/BRANCH_MANAGER/STAFF: filter modules based on subscription plan AND tenant industries
    if (user?.role === "OWNER" || user?.role === "BRANCH_MANAGER" || user?.role === "STAFF") {
      const activeModules = getActiveModules(subscription);
      const industries = user?.industries ?? [];

      filtered = filtered.filter((item) => {
        const moduleKey = SIDEBAR_MODULE_MAP[item.label];
        if (moduleKey && !activeModules.has(moduleKey)) return false;
        const industryKey = INDUSTRY_NAV_MAP[item.label];
        if (industryKey && !isIndustryActive(industries, industryKey)) return false;
        return true;
      });
    }

    if (user?.role === "STUDENT" && !hasRequests) {
      filtered = filtered.filter((item) => item.label !== "My Requests");
    }
    return filtered;
  }, [mounted, user, hasRequests, subscription]);

  const autoExpandedItems = React.useMemo(() => {
    // only the first matching parent — one open at a time
    for (const item of navItems) {
      if (item.children?.some((child) => child.href && isActive(child.href))) {
        return [item.label];
      }
    }
    return [];
  }, [navItems, isActive]);

  const [toggledItems, setToggledItems] = React.useState<string[]>([]);
  const expandedItems = React.useMemo(
    () => Array.from(new Set([...autoExpandedItems, ...toggledItems])),
    [autoExpandedItems, toggledItems],
  );

  const toggleExpanded = (key: string) => {
    setToggledItems((prev) =>
      // if already open → close it; otherwise open only this one (close all others)
      prev.includes(key) ? prev.filter((i) => i !== key) : [key],
    );
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutDialog(false);
    toast.success("Logged out successfully");
    router.push("/login");
  };

  // Every nav row gets sidebar-item as the base.
  // Base item: sits inside nav's px-3 (12px) padding.
  // Active/parent-active CSS overrides: border-radius left-only, margin-right: -12px,
  // padding-right: 12px — so the pill bleeds to the sidebar's right edge exactly.
  const itemClass = (level: number, extra?: string) =>
    cn(
      "sidebar-item",
      "flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold rounded-lg",
      isCollapsed && "justify-center px-2",
      extra,
    );

  const renderNavItem = (item: NavItem, level = 0): React.ReactNode => {
    const active = item.href ? isActive(item.href) : false;
    const expanded = expandedItems.includes(item.label);
    const hasChildren = Boolean(item.children?.length);
    const Icon = item.icon;
    const isParentActive =
      hasChildren && item.children!.some((c) => c.href && isActive(c.href));

    // onClick-only item (e.g. Profile modal)
    if (item.onClick) {
      if (isCollapsed) {
        return (
          <CollapsedTooltip key={item.label} label={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className={itemClass(level)}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
            </button>
          </CollapsedTooltip>
        );
      }
      return (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={itemClass(level)}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span>{item.label}</span>
        </button>
      );
    }

    // Parent with children — accordion toggle
    if (hasChildren) {
      // Collapsed: show flyout submenu
      if (isCollapsed) {
        return (
          <CollapsedFlyout
            key={item.label}
            item={item}
            isActive={isActive}
            onItemClick={onItemClick}
          />
        );
      }

      // Expanded: show inline accordion
      const isOpen = expanded || isParentActive;
      return (
        <div
          key={item.label}
          className={cn(
            "transition-colors duration-150",
            isOpen && "sidebar-group-open",
          )}
        >
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              itemClass(level),
              "rounded-none",
              isOpen && "sidebar-item-expanded",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate flex-1 text-left">{item.label}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200 mr-1",
                expanded && "rotate-90",
              )}
            />
          </button>

          {isOpen && (
            <div className="pb-1 px-2 space-y-0.5">
              {item.children!.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf link — collapsed: tooltip; expanded: inline link
    const isChild = level > 0;

    if (isCollapsed) {
      return (
        <CollapsedTooltip key={item.href} label={item.label}>
          <Link
            href={item.href!}
            onClick={onItemClick}
            aria-current={active ? "page" : undefined}
            className={cn(
              itemClass(level),
              active && (isChild ? "sidebar-item-child-active" : "sidebar-item-active"),
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
          </Link>
        </CollapsedTooltip>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        onClick={onItemClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          itemClass(level),
          active && (isChild ? "sidebar-item-child-active" : "sidebar-item-active"),
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const logoSrc = mounted ? (user?.tenantLogoUrl || "/icons/logo.png") : "/icons/logo.png";
  const tenantName = mounted ? (user?.tenantName || "1Grow") : "1Grow";
  const roleLabel = mounted
    ? (user?.role === "SUPER_ADMIN" ? "Platform Admin" : "ERP Portal")
    : "ERP Portal";

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header — stable across SSR/client */}
      <div
        className={cn("px-4 py-5 border-b", isCollapsed && "px-3")}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onItemClick}>
          <img
            src={logoSrc}
            alt="Logo"
            className="h-9 w-9 rounded-xl shadow-md shrink-0 object-cover"
            style={{ background: "rgba(0,0,0,0.15)" }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/icons/logo.png"; }}
          />
          {!isCollapsed && (
            <div className="min-w-0 ">
              <h2
                  className="text-base font-bold truncate"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {tenantName}
                </h2>
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                {roleLabel}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation — only rendered after mount to avoid hydration mismatch */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        aria-label="Main navigation"
      >
        
        {mounted
          ? navItems.map((item) => renderNavItem(item))
          : null /* blank on SSR — no mismatch */
        }
      </nav>

      {/* Footer — Logout */}
      <div
        className={cn("border-t px-3 py-3", isCollapsed && "px-2")}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <button
          onClick={() => setShowLogoutDialog(true)}
          className={cn(
            "sidebar-item",
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
            isCollapsed && "justify-center px-2",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Logout confirmation */}
      <Modal
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        title="Confirm Logout"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutDialog(false)}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-danger text-white hover:bg-danger/90 transition-colors"
            >
              Logout
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-4 py-2">
          <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-danger" />
          </div>
          <p className="text-sm text-text-secondary">
            Are you sure you want to logout? You will need to sign in again to access your account.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sidebar shell ────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

export function Sidebar({ collapsed, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64",
      )}
      style={{ background: "var(--sidebar-bg)" }}
    >
      <SidebarContent isCollapsed={collapsed} onItemClick={onClose} />
    </aside>
  );
}
