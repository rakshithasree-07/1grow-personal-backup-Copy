"use client";

import * as React from "react";
import { Clock, Bell, IdCard, MessageSquare, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useRolePrefix } from "@/hooks/useRolePrefix";

export function PendingApprovalDashboard() {
  const user = useAuthStore((s) => s.user);
  const rolePrefix = useRolePrefix();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const quickLinks = [
    { label: "Notifications", href: `/${rolePrefix}/notifications`, icon: Bell },
    { label: "Profile", href: `/${rolePrefix}/profile`, icon: IdCard },
    { label: "Support", href: `/${rolePrefix}/support`, icon: MessageSquare },
  ];

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
      {/* Avatar / initials */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
        <span className="text-2xl font-bold text-primary">{initials}</span>
      </div>

      {/* Status badge */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-1.5 text-sm font-semibold text-warning">
        <Clock size={14} className="animate-pulse" />
        Access Request Pending
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold text-text-primary">
        Waiting for Approval
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary leading-relaxed">
        Hi <span className="font-semibold text-text-primary">{user?.name?.split(" ")[0]}</span>, your access request has been submitted and is awaiting approval from your organisation&apos;s admin. You&apos;ll be notified once it&apos;s reviewed.
      </p>

      {/* Info card */}
      <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-left shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Your details</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Name</span>
          <span className="text-sm font-medium text-text-primary">{user?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Email</span>
          <span className="text-sm font-medium text-text-primary truncate max-w-[180px]">{user?.email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Role</span>
          <span className="text-sm font-medium text-text-primary capitalize">{user?.role?.toLowerCase().replace("_", " ")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Organisation</span>
          <span className="text-sm font-medium text-text-primary">{user?.tenantName ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-text-secondary">Status</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
            <Clock size={10} /> Pending Approval
          </span>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {quickLinks.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm hover:bg-surface-overlay hover:border-primary/30 transition-colors"
          >
            <Icon size={15} className="text-text-secondary" />
            {label}
          </Link>
        ))}
      </div>

      {/* Refresh hint */}
      <p className="mt-8 flex items-center gap-1.5 text-xs text-text-disabled">
        <RefreshCw size={11} />
        This page will update automatically once your access is approved.
      </p>
    </div>
  );
}
