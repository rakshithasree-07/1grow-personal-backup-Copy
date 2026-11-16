"use client";

import * as React from "react";
import { 
  ShieldCheck, Search, Clock, CheckCircle2, XCircle, 
  Eye, RefreshCw, UserCheck, AlertCircle 
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface AccessRequestItem {
  id: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  status: "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
  requestedOrganization: string;
  reason?: string;
  createdAt: string;
}

const STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  BLOCKED: "danger",
};

export default function AccessRequestsPage() {
  const [requests, setRequests] = React.useState<AccessRequestItem[]>([
    {
      id: "req_1",
      user: { name: "Alex Johnson", email: "alex.j@example.com", role: "Developer" },
      status: "PENDING",
      requestedOrganization: "Acme Corp Logistics",
      reason: "Need owner-level access to inspect API integrations and audit logs.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "req_2",
      user: { name: "Sarah Connor", email: "sarah@cyberdyne.io", role: "Security Auditor" },
      status: "APPROVED",
      requestedOrganization: "Cyberdyne Systems",
      reason: "Compliance review and security auditing.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
  
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("PENDING");
  const [selectedRequest, setSelectedRequest] = React.useState<AccessRequestItem | null>(null);

  const filtered = requests.filter((r) => {
    const matchesSearch = r.user.name.toLowerCase().includes(search.toLowerCase()) || 
                          r.user.email.toLowerCase().includes(search.toLowerCase()) ||
                          r.requestedOrganization.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (id: string) => {
    setRequests((prev) => prev.map((req) => req.id === id ? { ...req, status: "APPROVED" } : req));
    toast.success("Access request approved successfully");
    setSelectedRequest(null);
  };

  const handleReject = (id: string) => {
    setRequests((prev) => prev.map((req) => req.id === id ? { ...req, status: "REJECTED" } : req));
    toast.error("Access request rejected");
    setSelectedRequest(null);
  };

  const columns: Column<AccessRequestItem>[] = [
    {
      key: "user",
      header: "Applicant",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl text-[#3b5bdb] flex items-center justify-center font-bold text-xs shrink-0 border border-white/20 dark:border-gray-700/80 shadow-2xl">
            {r.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{r.user.name}</p>
            <p className="text-xs text-gray-500">{r.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Requested Organization",
      render: (r) => (
        <span className="font-semibold text-gray-900 dark:text-white">{r.requestedOrganization}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={STATUS_VARIANTS[r.status] ?? "default"} className="px-2.5 py-1 font-medium">
          {r.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Requested Date",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
          <Clock size={13} className="text-gray-400" />
          {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSelectedRequest(r)}
            className="p-2 text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl cursor-pointer"
            title="Review Request"
          >
            <Eye size={16} />
          </button>
          {r.status === "PENDING" && (
            <>
              <button
                onClick={() => handleApprove(r.id)}
                className="p-2 text-[#3b5bdb] bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl cursor-pointer"
                title="Quick Approve"
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                onClick={() => handleReject(r.id)}
                className="p-2 text-rose-600 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl cursor-pointer"
                title="Quick Reject"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Access Requests" subtitle="Review and manage incoming tenant and platform access requests.">
      
      {/* Apple Glass Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border border-white/20 dark:border-gray-700/80 shadow-2xl rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Total Requests</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{requests.length}</p>
            </div>
            <div className="p-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl text-[#3b5bdb]">
              <UserCheck size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-white/20 dark:border-gray-700/80 shadow-2xl rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Pending Review</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">
                {requests.filter(r => r.status === "PENDING").length}
              </p>
            </div>
            <div className="p-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl text-amber-600">
              <AlertCircle size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-white/20 dark:border-gray-700/80 shadow-2xl rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Approved</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                {requests.filter(r => r.status === "APPROVED").length}
              </p>
            </div>
            <div className="p-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-white/20 dark:border-gray-700/80 shadow-2xl rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl">
          <CardBody className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Rejected</p>
              <p className="text-3xl font-extrabold text-rose-600 mt-1">
                {requests.filter(r => r.status === "REJECTED").length}
              </p>
            </div>
            <div className="p-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl text-rose-600">
              <XCircle size={20} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="border border-white/20 dark:border-gray-700/80 shadow-2xl rounded-3xl overflow-hidden bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl w-full">
        <CardHeader className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border-b border-white/20 dark:border-gray-700/80 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3b5bdb]" />
              Access Management
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toast.success("Refreshed access list")} 
              leftIcon={<RefreshCw size={14} />} 
              className="rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border border-white/20 dark:border-gray-700/80 shadow-2xl text-gray-700 dark:text-gray-300"
            >
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardBody className="p-6">
          {/* Apple Glass Filters Bar */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search applicant or organization…"
                className="w-full h-10 pl-10 pr-4 text-sm bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border border-white/20 dark:border-gray-700/80 rounded-3xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none shadow-2xl"
              />
            </div>

            {/* Apple Glass Status Tabs */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl p-1 rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl">
              {["", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3.5 py-2 text-xs font-semibold rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl cursor-pointer transition-colors",
                    statusFilter === st 
                      ? "bg-[#3b5bdb]/15 text-[#3b5bdb] dark:bg-[#3b5bdb]/30 dark:text-blue-300 font-bold" 
                      : "text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl"
                  )}
                >
                  {st ? st.charAt(0) + st.slice(1).toLowerCase() : "All Status"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/20 dark:border-gray-700/80 shadow-2xl backdrop-blur-2xl bg-white/90 dark:bg-gray-950/90 w-full">
            <Table 
              columns={columns} 
              data={filtered} 
              loading={loading}
              emptyTitle="No access requests"
              emptyDescription="Incoming access requests will appear here for review." 
            />
          </div>

          <div className="mt-6">
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
          </div>
        </CardBody>
      </Card>

      {/* Review Modal */}
      <Modal
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Access Request Details"
        size="md"
        footer={
          selectedRequest?.status === "PENDING" ? (
            <div className="flex items-center gap-3 w-full justify-end">
              <Button 
                variant="outline" 
                onClick={() => handleReject(selectedRequest.id)}
                className="border border-white/20 dark:border-gray-700/80 text-rose-600 rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl shadow-2xl"
              >
                Reject
              </Button>
              <Button 
                onClick={() => handleApprove(selectedRequest.id)}
                className="bg-[#3b5bdb]/15 text-[#3b5bdb] dark:bg-[#3b5bdb]/30 dark:text-blue-300 font-bold rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl"
              >
                Approve Request
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setSelectedRequest(null)} className="rounded-3xl bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border border-white/20 dark:border-gray-700/80 shadow-2xl text-gray-700 dark:text-gray-300">
              Close
            </Button>
          )
        }
      >
        {selectedRequest && (
          <div className="space-y-4 text-sm">
            <div className="rounded-3xl border border-white/20 dark:border-gray-700/80 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl p-4 space-y-3 shadow-2xl">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Applicant Name</p>
                <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{selectedRequest.user.name}</p>
                <p className="text-xs text-gray-500">{selectedRequest.user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 dark:border-gray-700/80">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Organization</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{selectedRequest.requestedOrganization}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Current Status</p>
                  <div className="mt-0.5"><Badge variant={STATUS_VARIANTS[selectedRequest.status]}>{selectedRequest.status}</Badge></div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 dark:border-gray-700/80 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl p-4 space-y-2 shadow-2xl">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Reason for Access</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl p-3 rounded-3xl border border-white/20 dark:border-gray-700/80 shadow-2xl">
                {selectedRequest.reason || "No reason provided by applicant."}
              </p>
            </div>
          </div>
        )}
      </Modal>

    </PageContainer>
  );
}