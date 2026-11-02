"use client";

import * as React from "react";
import { Plus, Shield, ShieldOff, UserCheck, UserX, AlertTriangle, MoreHorizontal, Eye, SlidersHorizontal, Phone, Clock, Mail, Building2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Table, type Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/ui/SearchBar";
import { Card, CardBody } from "@/components/ui/Card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";
import { rbacService, type UserListItem } from "@/services/rbac.service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const statusVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "warning",
  SUSPENDED: "danger",
  PENDING: "info",
};

const roleOptions = ["SUPER_ADMIN", "OWNER", "BRANCH_MANAGER", "STAFF", "STUDENT", "CLIENT"];
const statusOptions = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"];

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string>("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rbacService.listUsers(page, pageSize);
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = React.useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter) result = result.filter((u) => u.role === roleFilter);
    if (statusFilter) result = result.filter((u) => u.status === statusFilter);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
        const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [users, search, roleFilter, statusFilter, sortKey, sortDir]);

  const handleStatusToggle = async (user: UserListItem) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await rbacService.updateUserStatus(user.id, nextStatus);
      toast.success(`Status updated to ${nextStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (error) {
    return (
      <PageContainer title="User Management" subtitle="Manage users, assign roles, and control account status.">
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <AlertTriangle size={32} className="mb-3 text-danger" />
              <p className="text-sm font-medium text-text-primary">Failed to load users</p>
              <p className="text-xs mt-1 mb-4">{error}</p>
              <Button size="sm" onClick={fetchUsers}>Retry</Button>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  const columns: Column<UserListItem>[] = [
    { key: "name", header: "User", sortable: true, render: (r) => (
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{r.name}</p>
          <p className="text-xs text-text-secondary truncate">{r.email}</p>
        </div>
      </div>
    )},
    { key: "role", header: "Role", sortable: true, render: (r) => <Badge variant="brand">{r.role}</Badge> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => <Badge variant={statusVariant[r.status] ?? "default"}>{r.status}</Badge>,
    },
    {
      key: "emailVerified",
      header: "Verified",
      render: (r) => (
        r.emailVerified
          ? <UserCheck size={16} className="text-success" aria-label="Verified" />
          : <UserX size={16} className="text-text-disabled" aria-label="Not verified" />
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (r) => <span className="text-sm text-text-secondary">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
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
            <DropdownMenuItem onClick={() => router.push(`/super-admin/users/${r.id}`)}>
              <Eye size={14} /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusToggle(r)}>
              {r.status === "ACTIVE" ? <><ShieldOff size={14} /> Deactivate</> : <><Shield size={14} /> Activate</>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageContainer
      title="User Management"
      subtitle="Manage users, assign roles, and control account status."
      actions={
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => router.push("/super-admin/users")} className="hidden sm:inline-flex">
          Add User
        </Button>
      }
    >
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={() => router.push("/super-admin/users")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
          aria-label="Add User"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search users…"
            className="max-w-sm"
          />
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          emptyTitle="No users found"
          emptyDescription="Users will appear here once they register."
        />

        <div className="mt-4">
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search users…"
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
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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
        ) : filtered.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Shield size={32} className="mb-3 text-text-disabled" />
              <p className="text-sm font-medium text-text-primary">No users found</p>
              <p className="text-xs mt-1 mb-4 text-text-secondary">Users will appear here once they register.</p>
            </div>
          </Card>
        ) : (
          filtered.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-text-primary truncate">{r.name}</p>
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
                          <DropdownMenuItem onClick={() => router.push(`/super-admin/users/${r.id}`)}>
                            <Eye size={14} /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusToggle(r)}>
                            {r.status === "ACTIVE" ? <><ShieldOff size={14} /> Deactivate</> : <><Shield size={14} /> Activate</>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-text-secondary truncate mt-0.5">{r.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="brand" size="sm">{r.role}</Badge>
                      <Badge size="sm" variant={statusVariant[r.status] ?? "default"}>{r.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      {r.phone && <span className="flex items-center gap-1"><Phone size={10} /> {r.phone}</span>}
                      <span className="flex items-center gap-1">
                        {r.emailVerified ? <UserCheck size={10} className="text-success" /> : <UserX size={10} className="text-text-disabled" />}
                        {r.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Clock size={10} /> Joined {new Date(r.createdAt).toLocaleDateString()}</span>
                      {r.lastLoginAt && <span className="flex items-center gap-1">· Last login {new Date(r.lastLoginAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
        {filtered.length > 0 && (
          <div className="pt-2">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
