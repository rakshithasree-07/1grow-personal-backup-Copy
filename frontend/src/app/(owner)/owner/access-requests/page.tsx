"use client";

import * as React from "react";
import {
  UserCheck, UserX, Clock, CheckCircle2, XCircle,
  RefreshCw, Eye, Shield, SlidersHorizontal,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SearchBar } from "@/components/ui/SearchBar";
import { Modal } from "@/components/ui/Modal";
import {
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  type AccessRequest,
} from "@/services/onboarding";
import { getBranches, type Branch } from "@/services/branches";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { variant: "success" | "warning" | "danger" | "info" | "default"; icon: React.ElementType }> = {
  PENDING: { variant: "warning", icon: Clock },
  APPROVED: { variant: "success", icon: CheckCircle2 },
  REJECTED: { variant: "danger", icon: XCircle },
  BLOCKED: { variant: "danger", icon: Shield },
};

export default function AccessRequestsPage({ rolePrefix: _rolePrefix }: { rolePrefix?: string }) {
  const [requests, setRequests] = React.useState<AccessRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string>("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [detailModal, setDetailModal] = React.useState<AccessRequest | null>(null);
  const [rejectModal, setRejectModal] = React.useState<AccessRequest | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const [approveModal, setApproveModal] = React.useState<AccessRequest | null>(null);
  const [approveRole, setApproveRole] = React.useState("");
  const [approveBranchId, setApproveBranchId] = React.useState("");
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAccessRequests(statusFilter || undefined);
      setRequests(res.data ?? []);
    } catch {
      toast.error("Failed to load access requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData(); }, [fetchData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    getBranches().then((res) => setBranches(res.data ?? [])).catch(() => {});
  }, []);

  const openApproveModal = (req: AccessRequest) => {
    setApproveRole(req.role);
    setApproveBranchId(req.preferredBranchId ?? "");
    setApproveModal(req);
  };

  const handleApproveWithEdits = async () => {
    if (!approveModal) return;
    setActionLoading(approveModal.id);
    try {
      await approveAccessRequest({
        requestId: approveModal.id,
        role: approveRole !== approveModal.role ? approveRole : undefined,
        branchId: approveBranchId || undefined,
      });
      toast.success(`${approveModal.user.name} has been approved`);
      setApproveModal(null);
      setDetailModal(null);
      fetchData();
    } catch {
      toast.error("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const roleOptions = React.useMemo(() => {
    const roles = new Set(requests.map((r) => r.role));
    return Array.from(roles).sort();
  }, [requests]);

  const filtered = React.useMemo(() => {
    let result = requests;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.user.name.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter) result = result.filter((r) => r.role === roleFilter);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = sortKey === "user" ? a.user.name
          : sortKey === "role" ? a.role
          : sortKey === "status" ? a.status
          : sortKey === "createdAt" ? a.createdAt
          : String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
        const bVal = sortKey === "user" ? b.user.name
          : sortKey === "role" ? b.role
          : sortKey === "status" ? b.status
          : sortKey === "createdAt" ? b.createdAt
          : String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
        const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal) : String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [requests, search, roleFilter, sortKey, sortDir]);

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await rejectAccessRequest({ requestId: rejectModal.id, reason: rejectReason || undefined });
      toast.success(`${rejectModal.user.name}'s request has been rejected`);
      setRejectModal(null);
      setRejectReason("");
      fetchData();
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const columns: Column<AccessRequest>[] = [
    {
      key: "user",
      header: "Requester",
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{r.user.name}</p>
          <p className="text-xs text-text-secondary truncate">{r.user.email}</p>
          {r.user.phone && <p className="text-xs text-text-secondary">{r.user.phone}</p>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (r) => <Badge variant="info">{r.role}</Badge>,
    },
    {
      key: "skills",
      header: "Skills",
      render: (r) => r.skills.length > 0 ? (
        <div className="flex flex-wrap gap-1 max-w-40">
          {r.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" size="sm">{s}</Badge>)}
          {r.skills.length > 3 && <Badge variant="outline" size="sm">+{r.skills.length - 3}</Badge>}
        </div>
      ) : <span className="text-text-secondary text-sm">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        return (
          <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
            <Icon size={12} /> {r.status}
          </Badge>
        );
      },
    },
    {
      key: "notes",
      header: "Notes",
      render: (r) => r.notes ? (
        <p className="text-sm text-text-secondary max-w-[200px] truncate" title={r.notes}>{r.notes}</p>
      ) : <span className="text-text-secondary text-sm">—</span>,
    },
    {
      key: "createdAt",
      header: "Requested",
      sortable: true,
      render: (r) => <span className="text-sm text-text-secondary">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailModal(r)}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-overlay rounded-[var(--radius-sm)] transition-colors"
            aria-label="View details"
          >
            <Eye size={16} />
          </button>
          {r.status === "PENDING" && (
            <>
              <button
                onClick={() => openApproveModal(r)}
                disabled={actionLoading === r.id}
                className="p-1.5 text-success hover:text-success/80 hover:bg-success/10 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
                aria-label="Approve request"
              >
                <UserCheck size={16} />
              </button>
              <button
                onClick={() => { setRejectModal(r); setRejectReason(""); }}
                disabled={actionLoading === r.id}
                className="p-1.5 text-danger hover:text-danger/80 hover:bg-danger/10 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
                aria-label="Reject request"
              >
                <UserX size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Access Requests" subtitle="Review and manage user access requests for your organization.">
      {/* Stats Cards - Mobile First */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            <p className="text-xs text-text-secondary mt-1">Pending</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-success">{approvedCount}</p>
            <p className="text-xs text-text-secondary mt-1">Approved</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-danger">{rejectedCount}</p>
            <p className="text-xs text-text-secondary mt-1">Rejected</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-text-primary">{filtered.length}</p>
            <p className="text-xs text-text-secondary mt-1">Showing</p>
          </CardBody>
        </Card>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Requests</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchData} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <SearchBar
                value={search}
                onChange={(v) => setSearch(v)}
                placeholder="Search by name or email…"
                className="max-w-xs"
              />
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "", label: "All Status" },
                  { value: "PENDING", label: "Pending" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                  { value: "BLOCKED", label: "Blocked" },
                ]}
                className="w-36"
              />
              {roleOptions.length > 0 && (
                <Select
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val)}
                  options={[
                    { value: "", label: "All Roles" },
                    ...roleOptions.map((r) => ({ value: r, label: r })),
                  ]}
                  className="w-40"
                />
              )}
            </div>
            <Table
              columns={columns}
              data={filtered}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              emptyTitle="No access requests"
              emptyDescription="Access requests from users will appear here."
            />
          </CardBody>
        </Card>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(v) => setSearch(v)}
              placeholder="Search by name or email…"
            />
          </div>
          <Button
            variant={showMobileFilters ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowMobileFilters((p) => !p)}
            className="shrink-0"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={16} />
          </Button>
        </div>

        {showMobileFilters && (
          <div className="space-y-2 p-3 rounded-[var(--radius-md)] border border-border bg-surface">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="BLOCKED">Blocked</option>
            </select>
            {roleOptions.length > 0 && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        )}

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-md)] border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-surface-overlay" />
                  <div className="h-3 w-full rounded bg-surface-overlay" />
                </div>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Shield size={32} className="mb-3 text-text-disabled" />
              <p className="text-sm font-medium text-text-primary">No access requests</p>
              <p className="text-xs mt-1 mb-4 text-text-secondary">Access requests from users will appear here.</p>
            </div>
          </Card>
        ) : (
          filtered.map((r) => {
            const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={r.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">{r.user.name}</p>
                      <p className="text-xs text-text-secondary truncate">{r.user.email}</p>
                      {r.user.phone && <p className="text-xs text-text-secondary">{r.user.phone}</p>}
                    </div>
                    <Badge variant={statusCfg.variant} className="flex items-center gap-1 shrink-0">
                      <StatusIcon size={12} /> {r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="info" size="sm">{r.role}</Badge>
                    <span className="text-xs text-text-secondary">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.skills.slice(0, 4).map((s) => <Badge key={s} variant="outline" size="sm">{s}</Badge>)}
                      {r.skills.length > 4 && <Badge variant="outline" size="sm">+{r.skills.length - 4}</Badge>}
                    </div>
                  )}
                  {r.notes && <p className="text-xs text-text-secondary mt-2 truncate">{r.notes}</p>}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDetailModal(r)}
                      leftIcon={<Eye size={14} />}
                    >
                      View
                    </Button>
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => openApproveModal(r)}
                          loading={actionLoading === r.id}
                          leftIcon={<UserCheck size={14} />}
                          className="text-success hover:text-success/80"
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => { setRejectModal(r); setRejectReason(""); }}
                          disabled={actionLoading === r.id}
                          leftIcon={<UserX size={14} />}
                          className="text-danger hover:text-danger/80"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between pt-2 text-sm text-text-secondary">
            <span>{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Access Request Details"
        size="md"
        footer={detailModal?.status === "PENDING" ? (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const m = detailModal;
                setDetailModal(null);
                setRejectModal(m);
                setRejectReason("");
              }}
              leftIcon={<UserX size={14} />}
              className="text-danger"
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const m = detailModal;
                setDetailModal(null);
                if (m) openApproveModal(m);
              }}
              leftIcon={<UserCheck size={14} />}
            >
              Approve
            </Button>
          </div>
        ) : undefined}
      >
        {detailModal && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Name</span>
              <span className="font-medium text-right">{detailModal.user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Email</span>
              <span className="font-medium text-right">{detailModal.user.email}</span>
            </div>
            {detailModal.user.phone && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Phone</span>
                <span className="font-medium text-right">{detailModal.user.phone}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Requested Role</span>
              <Badge variant="info">{detailModal.role}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Status</span>
              <Badge variant={STATUS_CONFIG[detailModal.status]?.variant ?? "default"}>{detailModal.status}</Badge>
            </div>
            {detailModal.skills.length > 0 && (
              <div>
                <span className="text-text-secondary">Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detailModal.skills.map((s) => <Badge key={s} variant="outline" size="sm">{s}</Badge>)}
                </div>
              </div>
            )}
            {detailModal.notes && (
              <div>
                <span className="text-text-secondary">Notes</span>
                <p className="mt-1 text-text-primary">{detailModal.notes}</p>
              </div>
            )}
            {detailModal.rejectionReason && (
              <div>
                <span className="text-text-secondary">Rejection Reason</span>
                <p className="mt-1 text-danger">{detailModal.rejectionReason}</p>
              </div>
            )}
            {detailModal.reviewer && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Reviewed By</span>
                <span className="font-medium text-right">{detailModal.reviewer.name}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Requested At</span>
              <span className="text-right">{new Date(detailModal.createdAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(""); }}
        title="Reject Access Request"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReject} loading={actionLoading === rejectModal?.id}>
              Reject Request
            </Button>
          </div>
        }
      >
        {rejectModal && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Rejecting <strong>{rejectModal.user.name}</strong>&apos;s request to join as {rejectModal.role}.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full h-24 px-3 py-2 text-sm border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Rejection reason"
            />
          </>
        )}
      </Modal>

      {/* Approve Modal with Edit */}
      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve Access Request"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setApproveModal(null)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApproveWithEdits}
              loading={actionLoading === approveModal?.id}
              leftIcon={<UserCheck size={14} />}
            >
              Approve
            </Button>
          </div>
        }
      >
        {approveModal && (
          <div className="space-y-4 text-sm">
            <p className="text-text-secondary">
              Approving <strong className="text-text-primary">{approveModal.user.name}</strong>&apos;s
              request to join as <strong className="text-text-primary">{approveModal.role}</strong>.
            </p>

            <div>
              <label className="block text-text-secondary mb-1.5 font-medium">Assign Role</label>
              <select
                value={approveRole}
                onChange={(e) => setApproveRole(e.target.value)}
                className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                aria-label="Assign role"
              >
                {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {branches.length > 0 && (
              <div>
                <label className="block text-text-secondary mb-1.5 font-medium">Assign Branch (optional)</label>
                <select
                  value={approveBranchId}
                  onChange={(e) => setApproveBranchId(e.target.value)}
                  className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  aria-label="Assign branch"
                >
                  <option value="">No branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            <div className="rounded-[var(--radius-sm)] bg-surface-overlay p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">Email</span>
                <span className="text-text-primary">{approveModal.user.email}</span>
              </div>
              {approveModal.user.phone && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Phone</span>
                  <span className="text-text-primary">{approveModal.user.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Requested</span>
                <span className="text-text-primary">{new Date(approveModal.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
