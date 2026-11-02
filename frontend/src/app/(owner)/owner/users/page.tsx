"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, Mail, Shield, Building2, Clock, UserCheck, Plus, Unlink, Copy, MoreHorizontal, Eye, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Card, Table, Badge, Pagination, SearchBar, Modal, Button, Select, Avatar, Input } from "@/components/ui";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";
import { getTenantUsers, updateUserStatus, updateUserRole, createStaffUser, removeUserBranch, type StaffMember, type TenantUserQuery } from "@/services/staff";
import { getBranches } from "@/services/branches";
import { toast } from "sonner";

const roleConfig: Record<string, { label: string; variant: "info" | "brand" | "warning" | "success" | "danger" | "outline" }> = {
  OWNER: { label: "Owner", variant: "brand" },
  BRANCH_MANAGER: { label: "Branch Manager", variant: "success" },
  STAFF: { label: "Staff", variant: "info" },
  STUDENT: { label: "Student", variant: "warning" },
  CLIENT: { label: "Client", variant: "outline" },
  SUPER_ADMIN: { label: "Super Admin", variant: "danger" },
};

const statusConfig: Record<string, { label: string; variant: "success" | "danger" | "warning" | "info" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  APPROVED: { label: "Approved", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "danger" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
  PENDING: { label: "Pending", variant: "warning" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  NEW_USER: { label: "New User", variant: "info" },
  REGISTERED: { label: "Registered", variant: "info" },
  PROFILE_COMPLETED: { label: "Profile Done", variant: "info" },
  ACCESS_REQUESTED: { label: "Access Requested", variant: "warning" },
};

const allRoles = ["OWNER", "BRANCH_MANAGER", "STAFF", "STUDENT", "CLIENT"];
const allStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING", "APPROVED", "PENDING_APPROVAL", "NEW_USER", "REGISTERED"];

export default function UsersPage() {
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Edit modals
  const [editUser, setEditUser] = useState<StaffMember | null>(null);
  const [editType, setEditType] = useState<"role" | "status" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: TenantUserQuery = {
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        pageSize,
      };
      const res = await getTenantUsers(query);
      setUsers(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
    const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleUpdateRole = async () => {
    if (!editUser || !editValue) return;
    setSubmitting(true);
    try {
      await updateUserRole(editUser.id, editValue);
      toast.success(`Role updated to ${editValue}`);
      setEditUser(null);
      setEditType(null);
      fetchUsers();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editUser || !editValue) return;
    setSubmitting(true);
    try {
      await updateUserStatus(editUser.id, editValue);
      toast.success(`Status updated to ${editValue}`);
      setEditUser(null);
      setEditType(null);
      fetchUsers();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: StaffMember, type: "role" | "status") => {
    setEditUser(user);
    setEditType(type);
    setEditValue(type === "role" ? user.role : user.status);
  };

  const handleToggleStatus = async (user: StaffMember) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateUserStatus(user.id, nextStatus);
      toast.success(`Status updated to ${nextStatus}`);
      fetchUsers();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Staff creation
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", email: "", branchId: "" });
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const openCreateStaff = async () => {
    setStaffForm({ name: "", phone: "", email: "", branchId: "" });
    setInviteLink(null);
    setStaffModalOpen(true);
    if (branches.length === 0) {
      try {
        const res = await getBranches();
        setBranches(res.data ?? []);
      } catch { /* ignore */ }
    }
  };

  const handleCreateStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setCreatingStaff(true);
    try {
      const res = await createStaffUser({
        name: staffForm.name.trim(),
        phone: staffForm.phone.trim(),
        email: staffForm.email.trim() || undefined,
        branchId: staffForm.branchId || undefined,
      });
      setInviteLink(res.data.inviteLink);
      toast.success("Staff created successfully");
      fetchUsers();
    } catch {
      toast.error("Failed to create staff");
    } finally {
      setCreatingStaff(false);
    }
  };

  // Branch unlink
  const handleUnlinkBranch = async (userId: string, branchId: string) => {
    try {
      await removeUserBranch(userId, branchId);
      toast.success("User unlinked from branch");
      fetchUsers();
    } catch {
      toast.error("Failed to unlink user from branch");
    }
  };

  const columns = [
    { key: "name", header: "User", sortable: true, render: (row: StaffMember) => (
      <div className="flex items-center gap-3">
        <Avatar src={row.avatarUrl} name={row.name} size="md" />
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{row.name}</p>
          <p className="text-xs text-text-secondary truncate">{row.email}</p>
        </div>
      </div>
    )},
    { key: "role", header: "Role", sortable: true, render: (row: StaffMember) => {
      const cfg = roleConfig[row.role] || { label: row.role, variant: "outline" as const };
      return <Badge size="sm" variant={cfg.variant}>{cfg.label}</Badge>;
    }},
    { key: "contact", header: "Contact", render: (row: StaffMember) => (
      <div>
        <p className="flex items-center gap-1 text-sm text-text-secondary"><Phone size={12} /> <span className="truncate">{row.phone || "-"}</span></p>
        <p className="flex items-center gap-1 text-xs text-text-secondary mt-0.5"><Mail size={12} /> <span className="truncate">{row.email}</span></p>
      </div>
    )},
    { key: "status", header: "Status", sortable: true, render: (row: StaffMember) => {
      const cfg = statusConfig[row.status] || { label: row.status, variant: "outline" as const };
      return <Badge size="sm" variant={cfg.variant}>{cfg.label}</Badge>;
    }},
    { key: "branch", header: "Branch", render: (row: StaffMember) => (
      <div className="flex flex-wrap gap-1 max-w-40">
        {row.branches && row.branches.length > 0 ? (
          row.branches.map((b) => (
            <div key={b.id} className="flex items-center gap-1 group">
              <Building2 size={10} className="text-text-secondary shrink-0" />
              <span className="text-xs text-text-secondary truncate max-w-24">{b.name}</span>
              <button
                onClick={() => handleUnlinkBranch(row.id, b.id)}
                className="p-0.5 text-text-disabled hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label={`Unlink from branch ${b.name}`}
              >
                <Unlink size={10} />
              </button>
            </div>
          ))
        ) : (
          <span className="text-sm text-text-secondary">-</span>
        )}
      </div>
    )},
    { key: "lastLogin", header: "Last Login", sortable: true, render: (row: StaffMember) => (
      <div className="flex items-center gap-1 text-sm text-text-secondary">
        <Clock size={12} />
        <span className="truncate">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : "Never"}</span>
      </div>
    )},
    { key: "actions", header: "", className: "w-12", render: (row: StaffMember) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-surface-overlay transition-colors"
            aria-label="User actions"
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(row, "role")}>
            <Shield size={14} /> Edit Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(row, "status")}>
            <UserCheck size={14} /> Edit Status
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleToggleStatus(row)}>
            {row.status === "ACTIVE" ? (
              <><Eye size={14} /> Deactivate</>
            ) : (
              <><Eye size={14} /> Activate</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  if (error) {
    return (
      <PageContainer title="User Management" subtitle="View and manage all users in your organization">
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
            <AlertTriangle size={32} className="mb-3 text-danger" />
            <p className="text-sm font-medium text-text-primary">Failed to load users</p>
            <p className="text-xs mt-1 mb-4">{error}</p>
            <Button size="sm" onClick={fetchUsers}>Retry</Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="User Management"
      subtitle="View and manage all users in your organization"
      actions={
        <Button leftIcon={<Plus size={16} />} onClick={openCreateStaff} className="hidden sm:inline-flex">
          Add Staff
        </Button>
      }
    >
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={openCreateStaff}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
          aria-label="Add Staff"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search users..."
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-text-secondary shrink-0" />
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  aria-label="Filter by role"
                >
                  <option value="">All Roles</option>
                  {allRoles.map((r) => (
                    <option key={r} value={r}>{roleConfig[r]?.label ?? r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-text-secondary shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  aria-label="Filter by status"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
            </div>
          </div>
          <Table
            columns={columns}
            data={sortedUsers}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No users found"
            emptyDescription="Users will appear here once they join your organization"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </Card>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3">
        {/* Mobile Search + Filter Toggle */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search users..."
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

        {/* Mobile Collapsible Filters */}
        {showMobileFilters && (
          <div className="space-y-2 p-3 rounded-[var(--radius-md)] border border-border bg-surface">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-text-secondary shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                {allRoles.map((r) => (
                  <option key={r} value={r}>{roleConfig[r]?.label ?? r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck size={14} className="text-text-secondary shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-md)] border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-overlay" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-surface-overlay" />
                  <div className="h-3 w-full rounded bg-surface-overlay" />
                </div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Shield size={32} className="mb-3 text-text-disabled" />
              <p className="text-sm font-medium text-text-primary">No users found</p>
              <p className="text-xs mt-1 mb-4 text-text-secondary">Users will appear here once they join your organization</p>
              <Button size="sm" onClick={openCreateStaff}>
                <Plus size={16} /> Add Staff
              </Button>
            </div>
          </Card>
        ) : (
          users.map((row) => {
            const roleCfg = roleConfig[row.role] || { label: row.role, variant: "outline" as const };
            const statusCfg = statusConfig[row.status] || { label: row.status, variant: "outline" as const };
            return (
              <Card key={row.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={row.avatarUrl} name={row.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-text-primary truncate">{row.name}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-surface-overlay transition-colors"
                              aria-label="User actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(row, "role")}>
                              <Shield size={14} /> Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(row, "status")}>
                              <UserCheck size={14} /> Edit Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(row)}>
                              {row.status === "ACTIVE" ? <><Eye size={14} /> Deactivate</> : <><Eye size={14} /> Activate</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-xs text-text-secondary truncate mt-0.5">{row.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge size="sm" variant={roleCfg.variant}>{roleCfg.label}</Badge>
                        <Badge size="sm" variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                        <span className="flex items-center gap-1"><Phone size={10} /> {row.phone || "-"}</span>
                        {row.lastLoginAt && (
                          <span className="flex items-center gap-1"><Clock size={10} /> {new Date(row.lastLoginAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      {row.branches && row.branches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {row.branches.map((b) => (
                            <span key={b.id} className="flex items-center gap-1 text-xs text-text-secondary bg-surface-overlay rounded-[var(--radius-xs)] px-1.5 py-0.5">
                              <Building2 size={10} /> {b.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
        {users.length > 0 && (
          <div className="pt-2">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Role Edit Modal */}
      <Modal
        open={editType === "role" && !!editUser}
        onClose={() => { setEditUser(null); setEditType(null); }}
        title={`Update Role — ${editUser?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Role"
            value={editValue}
            onChange={(val) => setEditValue(val)}
            options={allRoles.map((r) => ({ value: r, label: roleConfig[r]?.label ?? r }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditUser(null); setEditType(null); }}>Cancel</Button>
            <Button onClick={handleUpdateRole} loading={submitting}>Update Role</Button>
          </div>
        </div>
      </Modal>

      {/* Status Edit Modal */}
      <Modal
        open={editType === "status" && !!editUser}
        onClose={() => { setEditUser(null); setEditType(null); }}
        title={`Update Status — ${editUser?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={editValue}
            onChange={(val) => setEditValue(val)}
            options={allStatuses.map((s) => ({ value: s, label: statusConfig[s]?.label ?? s }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditUser(null); setEditType(null); }}>Cancel</Button>
            <Button onClick={handleUpdateStatus} loading={submitting}>Update Status</Button>
          </div>
        </div>
      </Modal>

      {/* Create Staff Modal */}
      <Modal
        open={staffModalOpen}
        onClose={() => { setStaffModalOpen(false); setInviteLink(null); }}
        title="Create Staff User"
        size="sm"
      >
        {inviteLink ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] bg-success-light border border-success/30 px-4 py-3">
              <p className="text-sm font-medium text-text-primary">Staff created successfully</p>
              <p className="text-xs text-text-secondary mt-1">Share this invite link with the new staff member:</p>
            </div>
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2">
              <code className="flex-1 text-xs text-text-primary break-all">{inviteLink}</code>
              <Button size="xs" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Link copied"); }}>
                <Copy size={12} />
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => { setStaffModalOpen(false); setInviteLink(null); }}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Name"
              required
              value={staffForm.name}
              onChange={(e) => setStaffForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter staff name"
            />
            <Input
              label="Phone"
              required
              value={staffForm.phone}
              onChange={(e) => setStaffForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
            <Input
              label="Email (optional)"
              value={staffForm.email}
              onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Enter email"
            />
            <Select
              label="Branch (optional)"
              placeholder="Select branch"
              value={staffForm.branchId}
              onChange={(val) => setStaffForm((p) => ({ ...p, branchId: val }))}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setStaffModalOpen(false); setInviteLink(null); }}>Cancel</Button>
              <Button onClick={handleCreateStaff} loading={creatingStaff}>Create Staff</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
