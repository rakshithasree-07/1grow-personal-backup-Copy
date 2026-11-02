"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { ProfileDialog } from "@/components/shared/ProfileDialog";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth.store";
import { MailWarning, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface AppShellProps { children: React.ReactNode; className?: string }

const ROLE_PREFIX: Record<string, string> = {
  OWNER: "/owner",
  BRANCH_MANAGER: "/branch-manager",
  STAFF: "/staff",
  STUDENT: "/student",
  CLIENT: "/client",
  SUPER_ADMIN: "/super-admin",
};

/** Routes accessible while pending approval (prefix-match) */
const PENDING_ALLOWED_PREFIXES = [
  "/dashboard",
  "/notifications",
  "/profile",
  "/settings",
  "/support",
];

function isAccessRestricted(status: string | undefined): boolean {
  return status === "ACCESS_REQUESTED" || status === "PENDING_APPROVAL" || status === "PROFILE_COMPLETED";
}

export function AppShell({ children, className }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [resendingVerification, setResendingVerification] = React.useState(false);
  const sendVerificationToken = useAuthStore((s) => s.sendVerificationToken);
  const redirectedRef = React.useRef(false);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (isLoading || redirectedRef.current || !user) return;

    if (user.onboardingRequired && user.role !== "CLIENT" && user.role !== "SUPER_ADMIN" && !pathname.startsWith("/onboarding")) {
      redirectedRef.current = true;
      router.replace("/onboarding");
      return;
    }

    // ── Pending-approval gate ─────────────────────────────────────────────────
    // Users still waiting for approval can only visit dashboard, notifications,
    // profile, and settings. Any other route gets bounced back to their dashboard.
    if (isAccessRestricted(user.status)) {
      const rolePrefix = ROLE_PREFIX[user.role] ?? "";
      const pathWithoutPrefix = rolePrefix ? pathname.replace(rolePrefix, "") : pathname;
      const isAllowed = PENDING_ALLOWED_PREFIXES.some(
        (p) => pathWithoutPrefix === p || pathWithoutPrefix.startsWith(p + "/"),
      );
      if (!isAllowed) {
        redirectedRef.current = true;
        router.replace(`${rolePrefix}/dashboard`);
        return;
      }
      redirectedRef.current = false; // allow subsequent navigations within allowed set
      return;
    }

    const correctPrefix = ROLE_PREFIX[user.role];
    if (correctPrefix) {
      const rolePrefixes = Object.values(ROLE_PREFIX);
      const hasWrongPrefix = rolePrefixes.some(
        (prefix) => prefix !== correctPrefix && pathname.startsWith(prefix),
      );
      if (hasWrongPrefix) {
        redirectedRef.current = true;
        const suffix = pathname.replace(/^\/[^/]+/, "");
        router.replace(`${correctPrefix}${suffix}`);
      }
    }
  }, [user, isLoading, pathname, router]);

  const toggleMenu = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingVerification(true);
    try {
      await sendVerificationToken(user.email);
      toast.success("Verification email sent! Check your inbox.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send verification email";
      if (msg.toLowerCase().includes("already verified")) {
        toast.info("Email is already verified.");
        return;
      }
      toast.error(msg);
    } finally {
      setResendingVerification(false);
    }
  };

  const showEmailWarning = user && !user.emailVerified && user.role !== "SUPER_ADMIN" && user.role !== "CLIENT";

  return (
    /*
     * Root: sidebar bg-primary fills the full viewport.
     * The main content card floats on top with rounded corners and a gap
     * (padding) around it so the primary colour peeks through on all sides.
     */
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--primary)" }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex shrink-0">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 flex md:hidden">
            <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/*
       * ── Main card area ──
       * Flex column, takes remaining width.
       * Padding on all sides (top, right, bottom) so the primary bg peeks
       * through and the card floats visually.
       * The card itself has bg-surface, rounded-2xl, shadow, and clips its
       * overflow so inner scroll stays within rounded corners.
       */}
      <div className="flex flex-1 flex-col min-w-0 p-3 pb-3 pl-0 ml-0 md:pt-3 md:pr-3 md:pb-3">
        {/* Floating card */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">

          {/* Topbar lives inside the card */}
          <Topbar onMenuToggle={toggleMenu} />

          {/* Email verification warning */}
          {showEmailWarning && (
            <div className="mx-3 mt-2 flex items-center gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20">
                <MailWarning size={18} className="text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warning">Email not verified</p>
                <p className="text-xs text-text-secondary">Verify your email to access all features.</p>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="flex items-center gap-1.5 shrink-0 rounded-full bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/30 transition-colors disabled:opacity-50"
              >
                {resendingVerification ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                {resendingVerification ? "Sending..." : "Resend Email"}
              </button>
              <a
                href={`/verify-email${user?.email ? `?email=${encodeURIComponent(user.email)}` : ""}`}
                className="flex items-center gap-1.5 shrink-0 rounded-full bg-warning text-white px-3 py-1.5 text-xs font-semibold hover:bg-warning/90 transition-colors"
              >
                Verify Now
              </a>
            </div>
          )}

          {/* Scrollable page content */}
          <SubscriptionGuard>
            <main
              id="main-content"
              className={cn(
                "flex-1 overflow-y-auto pb-16 md:pb-0 bg-surface-raised",
                className,
              )}
            >
              {children}
            </main>
          </SubscriptionGuard>

        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileNav />

      {/* Profile dialog */}
      <ProfileDialog />
    </div>
  );
}
