"use client";

import * as React from "react";
import {
  Clock, Bell, IdCard, MessageSquare, RefreshCw,
  XCircle, Send, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useRolePrefix } from "@/hooks/useRolePrefix";
import { isPendingApproval, isRejected } from "@/lib/access-restriction";
import { getMyAccessRequests, type AccessRequest } from "@/services/onboarding";
import { NewRequestModal } from "./NewRequestModal";
import { Button } from "@/components/ui/Button";

export function AccessRestrictedDashboard() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const rolePrefix = useRolePrefix();
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [latestRequest, setLatestRequest] = React.useState<AccessRequest | null>(null);

  const pending = isPendingApproval(user);
  const rejected = isRejected(user);

  React.useEffect(() => {
    if (!rejected || !user) return;
    getMyAccessRequests()
      .then((res) => {
        const rejectedReq = (res.data ?? []).find((r) => r.status === "REJECTED");
        setLatestRequest(rejectedReq ?? null);
      })
      .catch(() => {});
  }, [rejected, user]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const quickLinks = [
    { label: "Notifications", href: `/${rolePrefix}/notifications`, icon: Bell },
    { label: "Profile", href: `/${rolePrefix}/profile`, icon: IdCard },
    { label: "Support", href: `/${rolePrefix}/support`, icon: MessageSquare },
  ];

  const handleRequestSuccess = async () => {
    try {
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.data) setUser(meData.data);
      }
    } catch {}
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
      {/* Status badge */}
      {pending && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-1.5 text-sm font-semibold text-warning">
          <Clock size={14} className="animate-pulse" />
          Access Request Pending
        </div>
      )}
      {rejected && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-4 py-1.5 text-sm font-semibold text-danger">
          <XCircle size={14} />
          Access Request Not Approved
        </div>
      )}

      {/* Heading */}
      {pending && (
        <>
          <h1 className="text-2xl font-bold text-text-primary">Waiting for Approval</h1>
          <p className="mt-2 max-w-md text-sm text-text-secondary leading-relaxed">
            Hi <span className="font-semibold text-text-primary">{user?.name?.split(" ")[0]}</span>, your access request has been submitted and is awaiting approval from your organisation&apos;s admin. You&apos;ll be notified once it&apos;s reviewed.
          </p>
        </>
      )}
      {rejected && (
        <>
          <h1 className="text-2xl font-bold text-text-primary">Request Not Approved</h1>
          <p className="mt-2 max-w-md text-sm text-text-secondary leading-relaxed">
            Hi <span className="font-semibold text-text-primary">{user?.name?.split(" ")[0]}</span>, your previous access request was not approved.
            {latestRequest?.rejectionReason
              ? ` Reason: "${latestRequest.rejectionReason}".`
              : ""}
            {" "}You can search for another organization to request access to.
          </p>
        </>
      )}

      {/* Rejection reason card */}
      {rejected && latestRequest?.rejectionReason && (
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-danger/20 bg-danger/5 p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-danger" />
            <span className="text-xs font-semibold text-danger uppercase tracking-wider">Rejection Reason</span>
          </div>
          <p className="text-sm text-text-secondary">{latestRequest.rejectionReason}</p>
          {latestRequest.tenant && (
            <p className="mt-2 text-xs text-text-secondary">
              Organization: <span className="font-medium text-text-primary">{latestRequest.tenant.name}</span>
            </p>
          )}
        </div>
      )}


      {/* Re-request button for rejected users */}
      {rejected && (
        <Button
          variant="primary"
          size="lg"
          className="mt-8"
          leftIcon={<Send size={16} />}
          onClick={() => setShowRequestModal(true)}
        >
          Send Another Request
        </Button>
      )}

      {/* Refresh hint */}
      {pending && (
        <p className="mt-8 flex items-center gap-1.5 text-xs text-text-disabled">
          <RefreshCw size={11} />
          This page will update automatically once your access is approved.
        </p>
      )}

      {/* New request modal */}
      <NewRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
