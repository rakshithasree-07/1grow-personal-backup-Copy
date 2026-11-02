"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Building2, Eye, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Card, Table, Badge, Pagination, SearchBar, Button, Modal, Input, Avatar } from "@/components/ui";
import { getStudents, createStudent, type Student } from "@/services/students";
import { getBranches, type Branch } from "@/services/branches";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StudentsPageProps {
  basePath?: string;
}

export function StudentsPage({ basePath = "/owner/students" }: StudentsPageProps) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  /* Add student modal */
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "" });
  const [addLoading, setAddLoading] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await getBranches();
      setBranches(res.data ?? []);
    } catch {
      setBranches([]);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({
        search: search || undefined,
        branchId: branchId || undefined,
        page,
        pageSize,
      });
      setStudents(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, branchId]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAddStudent = async () => {
    if (!addForm.name.trim()) { toast.error("Name is required"); return; }
    if (!addForm.phone.trim()) { toast.error("Phone is required"); return; }
    setAddLoading(true);
    try {
      const res = await createStudent({
        name: addForm.name,
        phone: addForm.phone,
        email: addForm.email || undefined,
      });
      toast.success("Student created successfully");
      setAddModal(false);
      setAddForm({ name: "", phone: "", email: "" });
      fetchStudents();
      router.push(`${basePath}/${res.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create student");
    } finally {
      setAddLoading(false);
    }
  };

  const columns = useMemo(() => [
    { key: "name", header: "Student", render: (row: Student) => (
      <button
        onClick={() => router.push(`${basePath}/${row.id}`)}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <Avatar src={row.photoUrl} name={row.name} size="md" />
        <div className="text-left min-w-0">
          <p className="font-medium text-text-primary truncate">{row.name}</p>
          <p className="text-xs text-text-secondary">{row.gender || "Not Specified"}</p>
        </div>
      </button>
    )},
    { key: "contact", header: "Contact Info", className: "min-w-[180px]", render: (row: Student) => (
      <div>
        <p className="text-sm text-text-secondary">{row.phone || "Not Provided"}</p>
        <p className="text-xs text-text-secondary mt-0.5">{row.email || "Not Provided"}</p>
      </div>
    )},
    { key: "course", header: "Course / Batch", className: "min-w-[160px]", render: (row: Student) => {
      const activeEnrollment = row.enrollments?.find((e) => e.status === "ACTIVE");
      if (!activeEnrollment) return <span className="text-sm text-text-secondary">No Batch Assigned</span>;
      return (
        <div>
          <p className="text-sm font-medium text-text-primary">{activeEnrollment.batch?.course?.name || activeEnrollment.batch?.name || "No Batch Assigned"}</p>
          <p className="text-xs text-text-secondary">{activeEnrollment.batch?.name}</p>
        </div>
      );
    }},
    { key: "branch", header: "Branch", className: "min-w-[100px]", render: (row: Student) => {
      const branchName = row.enrollments?.[0]?.batch?.branch?.name;
      return branchName ? (
        <span className="text-sm text-text-secondary">{branchName}</span>
      ) : (
        <span className="text-sm text-text-secondary">No Branch Assigned</span>
      );
    }},
    { key: "enrollment", header: "Enrollment", className: "whitespace-nowrap", render: (row: Student) => {
      const activeCount = row.enrollments?.filter((e) => e.status === "ACTIVE").length ?? 0;
      const totalCount = row.enrollments?.length ?? 0;
      return (
        <span className="text-sm text-text-secondary">{activeCount} active / {totalCount} total</span>
      );
    }},
    { key: "status", header: "Status", className: "w-20 whitespace-nowrap", render: (row: Student) => (
      <Badge variant={row.isActive ? "success" : "danger"} size="sm">
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    )},
    { key: "joinedAt", header: "Joined", className: "w-24 whitespace-nowrap", render: (row: Student) => (
      <span className="text-sm text-text-secondary">{new Date(row.joinedAt).toLocaleDateString()}</span>
    )},
    { key: "actions", header: "", className: "w-12", render: (row: Student) => (
      <Button size="xs" variant="ghost" onClick={() => router.push(`${basePath}/${row.id}`)} title="View Details">
        <Eye size={14} />
      </Button>
    )},
  ], [router]);

  return (
    <PageContainer
      title="Students"
      subtitle="Manage enrolled students and their progress"
      actions={
        <Button size="sm" onClick={() => setAddModal(true)}>
          <Plus size={16} /> Add Student
        </Button>
      }
    >
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, email, or phone..." className="w-full sm:max-w-md" />
          {branches.length > 1 && (
            <div className="flex items-center gap-2">
              <Building2 size={14} className="hidden sm:block text-text-secondary shrink-0" />
              <select
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
                aria-label="Filter by branch"
                className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors sm:w-auto"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="px-4">
          <Table
            columns={columns}
            data={students}
            loading={loading}
            emptyTitle="No students found"
            emptyDescription="Add your first student to get started"
          />
        </div>
        <div className="px-4 py-3">
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      </Card>

      {/* Add Student Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Student" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={addForm.name}
              onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter student name"
              required
            />
            <Input
              label="Phone *"
              value={addForm.phone}
              onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter phone number"
              required
            />
          </div>
          <Input
            label="Email"
            value={addForm.email}
            onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Enter email address"
            type="email"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setAddModal(false); setAddForm({ name: "", phone: "", email: "" }); }}>Cancel</Button>
            <Button onClick={handleAddStudent} loading={addLoading}>Create Student</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
