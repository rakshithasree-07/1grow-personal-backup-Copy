"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, BookOpen, Edit3, Copy, Archive, RotateCcw } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Pagination, SearchBar, FilterBar, Modal, ConfirmModal, Card, StatCard, Skeleton } from "@/components/ui";
import { ProgramForm, type FormData } from "../components/ProgramForm";
import { getCourses, createCourse, updateCourse, duplicateCourse, archiveCourse, restoreCourse, getCourseStats, type Course, type CourseStats } from "@/services/training";
import { toast } from "sonner";

function RowMenu({ onEdit, onDuplicate, onArchive, onRestore, isArchived }: { onEdit: () => void; onDuplicate: () => void; onArchive: () => void; onRestore?: () => void; isArchived?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useState(() => ({ current: null as HTMLDivElement | null }))[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, ref]);

  return (
    <div className="flex items-center justify-end gap-1" ref={(el) => { ref.current = el; }}>
      {open && (
        <>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          <Button size="xs" variant="ghost" title="Duplicate" onClick={() => { setOpen(false); onDuplicate(); }}>
            <Copy size={14} />
          </Button>
          {isArchived ? (
            <Button size="xs" variant="ghost" title="Restore" className="text-success hover:text-success" onClick={() => { setOpen(false); onRestore?.(); }}>
              <RotateCcw size={14} />
            </Button>
          ) : (
            <Button size="xs" variant="ghost" title="Archive" className="text-warning hover:text-warning" onClick={() => { setOpen(false); onArchive(); }}>
              <Archive size={14} />
            </Button>
          )}
        </>
      )}
      <Button size="xs" variant="ghost" title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}

export function ProgramsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const pageSize = 10;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCourses({ page, pageSize, search, status: activeFilters.status, sortBy: sortKey, sortDir });
      setCourses(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getCourseStats();
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        toast.success("Program updated successfully");
      } else {
        await createCourse(payload);
        toast.success("Program created successfully");
      }
      setModalOpen(false);
      setEditingCourse(null);
      fetchCourses();
      fetchStats();
    } catch {
      toast.error("Failed to save program");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (course: Course) => {
    try {
      await archiveCourse(course.id);
      toast.success("Program archived");
      fetchCourses();
      fetchStats();
    } catch {
      toast.error("Failed to archive program");
    }
  };

  const handleDuplicate = async (course: Course) => {
    try {
      await duplicateCourse(course.id);
      toast.success("Program duplicated");
      fetchCourses();
      fetchStats();
    } catch {
      toast.error("Failed to duplicate program");
    }
  };

  const handleRestore = async (course: Course) => {
    try {
      await restoreCourse(course.id);
      toast.success("Program restored");
      fetchCourses();
      fetchStats();
    } catch {
      toast.error("Failed to restore program");
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

  const columns = [
    { key: "name", header: "Program", sortable: true, render: (row: Course) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
          <BookOpen size={14} className="text-primary" />
        </div>
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
        </div>
      </div>
    )},
    { key: "type", header: "Type", render: (row: Course) => (
      <Badge variant={row.type === "LONG_TERM" ? "info" : "warning"} size="sm">
        {row.type === "LONG_TERM" ? "Long Term" : "Short Term"}
      </Badge>
    )},
    { key: "startDate", header: "Duration", render: (row: Course) => (
      <span className="text-sm text-text-secondary">
        {row.type === "SHORT_TERM" && row.startDate && row.endDate
          ? `${new Date(row.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${new Date(row.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
          : "-"}
      </span>
    )},
    { key: "fee", header: "Fee", render: (row: Course) => (
      <span className="text-sm font-medium tabular-nums">{row.fee != null ? `₹${row.fee.toLocaleString()}` : "-"}</span>
    )},
    { key: "isActive", header: "Status", render: (row: Course) => (
      <Badge variant={row.isActive ? "success" : "outline"} size="sm">
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    )},
    { key: "actions", header: "", className: "w-12", render: (row: Course) => (
      <RowMenu
        onEdit={() => { setEditingCourse(row); setModalOpen(true); }}
        onDuplicate={() => handleDuplicate(row)}
        onArchive={() => setDeleteConfirm(row)}
        onRestore={() => handleRestore(row)}
        isArchived={!row.isActive}
      />
    )},
  ];

  const filterDefs = [
    { key: "status", label: "Status", options: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Inactive" },
    ]},
  ];

  return (
    <PageContainer
      title="Programs"
      subtitle="Manage your training programs"
      actions={
        <Button size="sm" onClick={() => { setEditingCourse(null); setModalOpen(true); }}>
          <Plus size={16} /> New Program
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Total Programs" value={stats?.total ?? courses.length} icon={<BookOpen size={18} />} />
        <StatCard title="Active" value={stats?.active ?? courses.filter((c) => c.isActive).length} icon={<BookOpen size={18} />} />
        <StatCard title="Categories" value={stats?.categoriesCount ?? 0} icon={<BookOpen size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search programs…" className="max-w-xs" />
          <FilterBar filters={filterDefs} active={activeFilters} onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }} onClear={() => { setActiveFilters({}); setPage(1); }} />
        </div>
        {/* Desktop: Table */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={courses}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No programs found"
            emptyDescription="Create your first program to get started"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
        {/* Mobile: Cards */}
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />
            ))
          ) : courses.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No programs found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first program to get started</p>
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="rounded-[var(--radius-md)] border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                      <BookOpen size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{course.name}</p>
                    </div>
                  </div>
                  <RowMenu
                    onEdit={() => { setEditingCourse(course); setModalOpen(true); }}
                    onDuplicate={() => handleDuplicate(course)}
                    onArchive={() => setDeleteConfirm(course)}
                    onRestore={() => handleRestore(course)}
                    isArchived={!course.isActive}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={course.type === "LONG_TERM" ? "info" : "warning"} size="sm">
                    {course.type === "LONG_TERM" ? "Long Term" : "Short Term"}
                  </Badge>
                  <Badge variant={course.isActive ? "success" : "outline"} size="sm">
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {course.fee != null && (
                    <span className="text-xs font-medium tabular-nums text-text-secondary">₹{course.fee.toLocaleString()}</span>
                  )}
                  {course.type === "SHORT_TERM" && course.startDate && course.endDate && (
                    <span className="text-xs text-text-secondary">
                      {new Date(course.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - {new Date(course.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCourse(null); }}
        title={editingCourse ? "Edit Program" : "Create Program"}
        size="md"
      >
        <ProgramForm
          initialData={editingCourse}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditingCourse(null); }}
          loading={submitting}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) await handleArchive(deleteConfirm);
          setDeleteConfirm(null);
        }}
        title="Archive Program"
        description={`Are you sure you want to archive "${deleteConfirm?.name}"? This action can be reversed.`}
        confirmLabel="Archive"
        intent="warning"
      />
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={() => { setEditingCourse(null); setModalOpen(true); }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>
    </PageContainer>
  );
}
