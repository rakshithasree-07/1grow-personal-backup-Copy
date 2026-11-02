"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Layers, Edit3, Archive, RotateCcw, Copy, Users, Calendar, BarChart3, Eye, UserPlus, GraduationCap, Clock, ListOrdered, Trash2, Save, Play } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Table, Badge, Pagination, SearchBar, FilterBar, Modal, ConfirmModal, Card, StatCard, Skeleton, Input, Select as UiSelect } from "@/components/ui";
import { BatchForm } from "../components/BatchForm";
import { getBatches, createBatch, updateBatch, updateBatchStatus, archiveBatch, restoreBatch, duplicateBatch, getBatchStats, getBatchStudents, getBatchSchedules, createBatchSchedule, updateBatchSchedule, deleteBatchSchedule, generateBatchSessions, getBatchAttendance, getBatchProgress, getBatchWaitlist, getBatchCapacity, getBatch, getCourses, assignTrainerToBatch, getTrainers, enrollStudentInBatch, bulkEnrollStudents, removeStudentFromBatch, type Batch, type BatchStats, type Course, type BatchSchedule, type BatchTrainer, type Trainer } from "@/services/training";
import { getBranches } from "@/services/branches";
import { getStudents } from "@/services/students";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { MoreHorizontal } from "lucide-react";

function RowMenu({
  row,
  onView,
  onAssign,
  onEdit,
  onDuplicate,
  onRestore,
  onArchive,
}: {
  row: Batch;
  onView: () => void;
  onAssign: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRestore: () => void;
  onArchive: () => void;
}) {
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
          <Button size="xs" variant="ghost" title="View details" onClick={() => { setOpen(false); onView(); }}>
            <Eye size={14} />
          </Button>
          <Button size="xs" variant="ghost" title="Assign trainer" onClick={() => { setOpen(false); onAssign(); }}>
            <UserPlus size={14} />
          </Button>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          <Button size="xs" variant="ghost" title="Duplicate" onClick={() => { setOpen(false); onDuplicate(); }}>
            <Copy size={14} />
          </Button>
          {row.isActive === false ? (
            <Button size="xs" variant="ghost" title="Restore" onClick={() => { setOpen(false); onRestore(); }}>
              <RotateCcw size={14} />
            </Button>
          ) : (
            <Button size="xs" variant="ghost" title="Archive" onClick={() => { setOpen(false); onArchive(); }}>
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

export function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Batch | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<Batch | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<Batch | null>(null);
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);
  const [detailTab, setDetailTab] = useState("students");
  const [detailData, setDetailData] = useState<Record<string, unknown>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [assignTrainerOpen, setAssignTrainerOpen] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState<string | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BatchSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", room: "" });
  const [generatingSessions, setGeneratingSessions] = useState(false);
  const [enrollStudentOpen, setEnrollStudentOpen] = useState(false);
  const [enrollStudentNew, setEnrollStudentNew] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [studentList, setStudentList] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentListLoading, setStudentListLoading] = useState(false);
  const pageSize = 10;

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBatches({ page, pageSize, search, status: activeFilters.status, sortBy: sortKey, sortDir });
      setBatches(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [statsRes, coursesRes, trainersRes, branchesRes] = await Promise.all([
        getBatchStats(), getCourses(), getTrainers({ pageSize: 100 }), getBranches(),
      ]);
      setStats(statsRes.data);
      setCourses(coursesRes.data ?? []);
      setTrainers(trainersRes.data ?? []);
      setBranchesList(branchesRes.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const [branchesList, setBranchesList] = useState<Array<{ id: string; name: string }>>([]);

  const handleSubmit = async (formData: { name: string; code?: string; courseId?: string; branchId?: string; capacity: string; startDate?: string; endDate?: string; status?: string; schedules?: Array<{ dayOfWeek: string; startTime: string; endTime: string; room?: string }> }) => {
    const { status, schedules, ...rest } = formData;
    const payload: Record<string, unknown> = { ...rest, capacity: Number(formData.capacity) };
    if (schedules && schedules.length > 0) {
      payload.schedules = schedules;
    }
    setSubmitting(true);
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, payload);
        toast.success("Batch updated successfully");
      } else {
        await createBatch(payload);
        toast.success("Batch created successfully");
      }
      setModalOpen(false);
      setEditingBatch(null);
      fetchBatches();
      fetchMeta();
    } catch {
      toast.error("Failed to save batch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!detailBatch) return;
    try {
      await createBatchSchedule(detailBatch.id, scheduleForm);
      toast.success("Schedule added");
      setScheduleFormOpen(false);
      setScheduleForm({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", room: "" });
      loadDetailTab("schedules", detailBatch.id);
    } catch {
      toast.error("Failed to add schedule");
    }
  };

  const handleUpdateSchedule = async () => {
    if (!detailBatch || !editingSchedule) return;
    try {
      await updateBatchSchedule(detailBatch.id, editingSchedule.id, scheduleForm);
      toast.success("Schedule updated");
      setScheduleFormOpen(false);
      setEditingSchedule(null);
      setScheduleForm({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", room: "" });
      loadDetailTab("schedules", detailBatch.id);
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleDeleteSchedule = async (schedule: BatchSchedule) => {
    if (!detailBatch) return;
    try {
      await deleteBatchSchedule(detailBatch.id, schedule.id);
      toast.success("Schedule removed");
      loadDetailTab("schedules", detailBatch.id);
    } catch {
      toast.error("Failed to remove schedule");
    }
  };

  const handleGenerateSessions = async () => {
    if (!detailBatch) return;
    setGeneratingSessions(true);
    try {
      const fromDate = detailBatch.startDate || new Date().toISOString().slice(0, 10);
      const toDate = detailBatch.endDate || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      const res = await generateBatchSessions(detailBatch.id, fromDate, toDate);
      toast.success(`${res.data?.length ?? 0} session(s) generated`);
    } catch {
      toast.error("Failed to generate sessions");
    } finally {
      setGeneratingSessions(false);
    }
  };

  const openScheduleForm = (schedule?: BatchSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleForm({ dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime, room: schedule.room ?? "" });
    } else {
      setEditingSchedule(null);
      setScheduleForm({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", room: "" });
    }
    setScheduleFormOpen(true);
  };

  const handleStatusChange = async (batch: Batch, newStatus: string) => {
    try {
      await updateBatchStatus(batch.id, newStatus);
      toast.success(`Batch status changed to ${newStatus}`);
      fetchBatches();
    } catch {
      toast.error("Failed to update batch status");
    }
  };

  const handleArchive = async (batch: Batch) => {
    try {
      await archiveBatch(batch.id);
      toast.success("Batch archived");
      fetchBatches();
      fetchMeta();
    } catch {
      toast.error("Failed to archive batch");
    }
  };

  const handleRestore = async (batch: Batch) => {
    try {
      await restoreBatch(batch.id);
      toast.success("Batch restored");
      setRestoreConfirm(null);
      fetchBatches();
      fetchMeta();
    } catch {
      toast.error("Failed to restore batch");
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || !duplicateName.trim()) return;
    try {
      await duplicateBatch(duplicateTarget.id, duplicateName.trim());
      toast.success("Batch duplicated");
      setDuplicateTarget(null);
      setDuplicateName("");
      fetchBatches();
    } catch {
      toast.error("Failed to duplicate batch");
    }
  };

  const handleAssignTrainer = async () => {
    if (!assignBatchId || !selectedTrainerId) return;
    try {
      await assignTrainerToBatch(selectedTrainerId, assignBatchId);
      toast.success("Trainer assigned to batch");
      setAssignTrainerOpen(false);
      setSelectedTrainerId("");
    } catch {
      toast.error("Failed to assign trainer");
    }
  };

  const loadStudentList = async () => {
    setStudentListLoading(true);
    try {
      const res = await getStudents({ pageSize: 500 });
      setStudentList(res.data ?? []);
    } catch {
      setStudentList([]);
    } finally {
      setStudentListLoading(false);
    }
  };

  const handleEnrollClick = () => {
    if (!enrollStudentNew) {
      loadStudentList();
    }
    setEnrollStudentId("");
    setEnrollName("");
    setEnrollPhone("");
    setEnrollEmail("");
    setSelectedStudentIds([]);
    setStudentSearch("");
    setEnrollStudentOpen(true);
  };

  const handleAddStudentToBatch = async () => {
    if (!detailBatch) return;
    if (!enrollStudentNew && selectedStudentIds.length === 0) { toast.error("Select at least one student"); return; }
    if (enrollStudentNew && !enrollName.trim()) { toast.error("Enter student name"); return; }
    setEnrolling(true);
    try {
      if (enrollStudentNew) {
        await enrollStudentInBatch(detailBatch.id, {
          name: enrollName.trim(),
          phone: enrollPhone.trim() || undefined,
          email: enrollEmail.trim() || undefined,
        });
        toast.success("Student enrolled");
      } else {
        const res = await bulkEnrollStudents(detailBatch.id, selectedStudentIds);
        const msg = `${res.data?.enrolled?.length ?? 0} enrolled, ${res.data?.skipped?.length ?? 0} skipped`;
        toast.success(msg);
      }
      setEnrollStudentOpen(false);
      setSelectedStudentIds([]);
      loadDetailTab("students", detailBatch.id);
    } catch {
      toast.error("Failed to enroll student(s)");
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudentFromBatch = async (studentId: string) => {
    if (!detailBatch) return;
    try {
      await removeStudentFromBatch(detailBatch.id, studentId);
      toast.success("Student removed");
      loadDetailTab("students", detailBatch.id);
    } catch {
      toast.error("Failed to remove student");
    }
  };

  const openDetail = async (batch: Batch) => {
    setDetailBatch(batch);
    setDetailTab("students");
    setDetailLoading(true);
    setDetailData({});
    try {
      const [students, schedules, capacity, detail] = await Promise.all([
        getBatchStudents(batch.id).catch(() => ({ data: [] })),
        getBatchSchedules(batch.id).catch(() => ({ data: [] })),
        getBatchCapacity(batch.id).catch(() => ({ data: null })),
        getBatch(batch.id).catch(() => ({ data: null })),
      ]);
      setDetailData({ students: students.data ?? [], schedules: schedules.data ?? [], capacity: capacity.data, trainers: detail.data?.trainers ?? [] });
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const loadDetailTab = async (tab: string, batchId: string) => {
    setDetailTab(tab);
    setDetailLoading(true);
    try {
      if (tab === "students") {
        const res = await getBatchStudents(batchId).catch(() => ({ data: [] }));
        setDetailData((prev) => ({ ...prev, students: res.data ?? [] }));
      } else if (tab === "schedules") {
        const res = await getBatchSchedules(batchId).catch(() => ({ data: [] }));
        setDetailData((prev) => ({ ...prev, schedules: res.data ?? [] }));
      } else if (tab === "attendance") {
        const res = await getBatchAttendance(batchId).catch(() => ({ data: null }));
        setDetailData((prev) => ({ ...prev, attendance: res.data }));
      } else if (tab === "progress") {
        const res = await getBatchProgress(batchId).catch(() => ({ data: [] }));
        setDetailData((prev) => ({ ...prev, progress: res.data ?? [] }));
      } else if (tab === "waitlist") {
        const res = await getBatchWaitlist(batchId).catch(() => ({ data: [] }));
        setDetailData((prev) => ({ ...prev, waitlist: res.data ?? [] }));
      } else if (tab === "capacity") {
        const res = await getBatchCapacity(batchId).catch(() => ({ data: null }));
        setDetailData((prev) => ({ ...prev, capacity: res.data }));
      } else if (tab === "trainers") {
        const res = await getBatch(batchId).catch(() => ({ data: null }));
        setDetailData((prev) => ({ ...prev, trainers: res.data?.trainers ?? [] }));
      }
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const statusVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
    ACTIVE: "success", UPCOMING: "info", COMPLETED: "warning", CANCELLED: "danger",
  };

  const occupancyColor = (enrolled: number, capacity: number) => {
    const rate = capacity > 0 ? enrolled / capacity : 0;
    if (rate >= 1) return "bg-danger";
    if (rate >= 0.75) return "bg-warning";
    return "bg-success";
  };

  const columns = [
    { key: "name", header: "Batch", sortable: true, render: (row: Batch) => (
      <button onClick={() => openDetail(row)} className="flex items-center gap-3 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
          <Layers size={14} className="text-primary" />
        </div>
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          {row.code && <p className="text-xs text-text-secondary">{row.code}</p>}
        </div>
      </button>
    )},
    { key: "course", header: "Program", render: (row: Batch) => (
      <span className="text-sm text-text-secondary">{row.course?.name || "-"}</span>
    )},
    { key: "capacity", header: "Capacity", sortable: true, render: (row: Batch) => {
      const enrolled = row._count?.enrollments ?? row.enrolled ?? 0;
      const occupancy = row.capacity > 0 ? Math.round((enrolled / row.capacity) * 100) : 0;
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 rounded-full bg-surface-overlay overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", occupancyColor(enrolled, row.capacity))} style={{ width: `${Math.min(occupancy, 100)}%` }} />
          </div>
          <span className="text-xs font-medium tabular-nums text-text-secondary">{enrolled}/{row.capacity}</span>
        </div>
      );
    }},
    { key: "status", header: "Status", sortable: true, render: (row: Batch) => (
      <UiSelect
        value={row.status}
        onChange={(val) => !val.startsWith("__") && handleStatusChange(row, val)}
        options={[
          { value: "__current", label: row.status, disabled: true },
          { value: "UPCOMING", label: "Upcoming" },
          { value: "ACTIVE", label: "Active" },
          { value: "COMPLETED", label: "Completed" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        className="w-32 h-7 text-xs"
      />
    )},
    { key: "startDate", header: "Duration", render: (row: Batch) => (
      <span className="text-xs text-text-secondary">
        {row.startDate ? new Date(row.startDate).toLocaleDateString() : "-"}
        {row.endDate ? ` - ${new Date(row.endDate).toLocaleDateString()}` : !row.startDate ? "Ongoing" : " - Ongoing"}
      </span>
    )},
    { key: "actions", header: "", className: "w-32", render: (row: Batch) => (
      <RowMenu
        row={row}
        onView={() => openDetail(row)}
        onAssign={() => {
          setAssignBatchId(row.id);
          setSelectedTrainerId("");
          setAssignTrainerOpen(true);
        }}
        onEdit={() => { setEditingBatch(row); setModalOpen(true); }}
        onDuplicate={() => { setDuplicateTarget(row); setDuplicateName(`${row.name} (Copy)`); }}
        onRestore={() => setRestoreConfirm(row)}
        onArchive={() => setDeleteConfirm(row)}
      />
    )},
  ];

  const filterDefs = [
    { key: "status", label: "Status", options: [
      { value: "ACTIVE", label: "Active" },
      { value: "UPCOMING", label: "Upcoming" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ]},
  ];

  return (
    <PageContainer
      title="Batches"
      subtitle="Manage training batches"
      actions={
        <Button size="sm" onClick={() => { setEditingBatch(null); setModalOpen(true); }}>
          <Plus size={16} /> New Batch
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Batches" value={stats?.total ?? batches.length} icon={<Layers size={18} />} />
        <StatCard title="Active" value={stats?.statusCounts?.["ACTIVE"] ?? batches.filter((b) => b.status === "ACTIVE").length} icon={<Layers size={18} />} />
        <StatCard title="Total Capacity" value={stats?.totalCapacity ?? batches.reduce((acc, b) => acc + b.capacity, 0)} icon={<Users size={18} />} />
        <StatCard title="Total Enrolled" value={stats?.totalEnrolled ?? batches.reduce((acc, b) => acc + (b._count?.enrollments ?? b.enrolled ?? 0), 0)} icon={<BarChart3 size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search batches…" className="max-w-xs" />
          <FilterBar filters={filterDefs} active={activeFilters} onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }} onClear={() => { setActiveFilters({}); setPage(1); }} />
        </div>
        {/* Desktop: Table */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={batches}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No batches found"
            emptyDescription="Create your first batch to get started"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
        {/* Mobile: Cards */}
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />
            ))
          ) : batches.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No batches found</p>
              <p className="text-xs text-text-secondary mt-1">Create your first batch to get started</p>
            </div>
          ) : (
            batches.map((batch) => {
              const enrolled = batch._count?.enrollments ?? batch.enrolled ?? 0;
              const occupancy = batch.capacity > 0 ? Math.round((enrolled / batch.capacity) * 100) : 0;
              return (
                <div
                  key={batch.id}
                  onClick={() => openDetail(batch)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openDetail(batch)}
                  className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                        <Layers size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">{batch.name}</p>
                        {batch.code && <p className="text-xs text-text-secondary truncate">{batch.code}</p>}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        row={batch}
                        onView={() => openDetail(batch)}
                        onAssign={() => {
                          setAssignBatchId(batch.id);
                          setSelectedTrainerId("");
                          setAssignTrainerOpen(true);
                        }}
                        onEdit={() => { setEditingBatch(batch); setModalOpen(true); }}
                        onDuplicate={() => { setDuplicateTarget(batch); setDuplicateName(`${batch.name} (Copy)`); }}
                        onRestore={() => setRestoreConfirm(batch)}
                        onArchive={() => setDeleteConfirm(batch)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-text-secondary">{batch.course?.name || "-"}</span>
                    <Badge variant={statusVariant[batch.status] ?? "outline"} size="sm">{batch.status}</Badge>
                    {batch.startDate && (
                      <span className="text-text-secondary">
                        {new Date(batch.startDate).toLocaleDateString()}
                        {batch.endDate ? ` - ${new Date(batch.endDate).toLocaleDateString()}` : " - Ongoing"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-surface-overlay overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", occupancyColor(enrolled, batch.capacity))} style={{ width: `${Math.min(occupancy, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-text-secondary">{enrolled}/{batch.capacity}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBatch(null); }}
        title={editingBatch ? "Edit Batch" : "Create Batch"}
        size="lg"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <BatchForm
          initialData={editingBatch}
          courses={courses}
          branches={branchesList}
          initialSchedules={editingBatch?.schedules as Array<{ dayOfWeek: string; startTime: string; endTime: string; room?: string }> | undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditingBatch(null); }}
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
        title="Archive Batch"
        description={`Are you sure you want to archive "${deleteConfirm?.name}"?`}
        confirmLabel="Archive"
        intent="warning"
      />

      <ConfirmModal
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={async () => {
          if (restoreConfirm) await handleRestore(restoreConfirm);
        }}
        title="Restore Batch"
        description={`Restore "${restoreConfirm?.name}"?`}
        confirmLabel="Restore"
        intent="info"
      />

      <Modal
        open={!!duplicateTarget}
        onClose={() => { setDuplicateTarget(null); setDuplicateName(""); }}
        title="Duplicate Batch"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Create a copy of &ldquo;{duplicateTarget?.name}&rdquo;</p>
          <Input
            label="New Batch Name"
            required
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setDuplicateTarget(null); setDuplicateName(""); }}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName.trim()}>Duplicate</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={assignTrainerOpen}
        onClose={() => setAssignTrainerOpen(false)}
        title="Assign Trainer to Batch"
        size="sm"
      >
        <div className="space-y-4">
          <UiSelect
            label="Select Trainer"
            placeholder="Choose a trainer"
            value={selectedTrainerId}
            onChange={(val) => setSelectedTrainerId(val)}
            options={trainers
              .filter((t) => t.status === "ACTIVE")
              .map((t) => ({ value: t.id, label: t.name }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAssignTrainerOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignTrainer} disabled={!selectedTrainerId}>Assign</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailBatch}
        onClose={() => setDetailBatch(null)}
        title={detailBatch?.name ?? "Batch Details"}
        size="xl"
      >
        {detailBatch && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-surface-raised">
              <Layers size={24} className="text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-lg font-semibold text-text-primary">{detailBatch.name}</p>
                <p className="text-sm text-text-secondary">
                  {detailBatch.code} • Capacity: {detailBatch.capacity} • Status: {detailBatch.status}
                </p>
              </div>
              <Badge variant={statusVariant[detailBatch.status] ?? "outline"}>{detailBatch.status}</Badge>
            </div>

            <div className="flex gap-1 rounded-[var(--radius-sm)] border border-border p-0.5 flex-wrap">
              {["students", "trainers", "schedules", "attendance", "progress", "waitlist", "capacity"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => loadDetailTab(tab, detailBatch.id)}
                  className={`flex items-center gap-1 rounded-[var(--radius-xs)] px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                    detailTab === tab ? "bg-primary text-primary-foreground" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {detailLoading ? (
              <Skeleton className="h-[200px] rounded-[var(--radius-md)]" />
            ) : detailTab === "students" ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-text-primary">Enrolled Students</p>
                  <Button size="xs" onClick={handleEnrollClick}>
                    <Plus size={12} /> Add Student
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {((detailData.students as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-secondary">No students enrolled</p>
                  ) : (
                    (detailData.students as Array<Record<string, unknown>>)?.map((s: Record<string, unknown>, i: number) => {
                      const sid = ((s.student as Record<string, unknown>)?.id as string) || (s.studentId as string) || "";
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-4 py-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {String((s.student as Record<string, unknown>)?.name || s.name || "?")?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{(s.student as Record<string, unknown>)?.name as string || s.name as string}</p>
                            <p className="text-xs text-text-secondary">{(s.student as Record<string, unknown>)?.email as string || s.email as string}</p>
                          </div>
                          <Badge size="sm" variant={(s.status as string) === "ACTIVE" ? "success" : "outline"}>{s.status as string}</Badge>
                          <Button size="xs" variant="ghost" onClick={() => handleRemoveStudentFromBatch(sid)} title="Remove student">
                            <Trash2 size={12} className="text-danger" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : detailTab === "trainers" ? (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {((detailData.trainers as BatchTrainer[]) ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">No trainers assigned</p>
                ) : (
                  (detailData.trainers as BatchTrainer[])?.map((bt: BatchTrainer) => (
                    <div key={bt.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-4 py-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {bt.trainer.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{bt.trainer.name}</p>
                        <p className="text-xs text-text-secondary">{bt.trainer.email}</p>
                      </div>
                      {bt.isPrimary && <Badge size="sm" variant="info">Primary</Badge>}
                      <span className="text-xs text-text-secondary">Assigned {new Date(bt.assignedAt).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            ) : detailTab === "schedules" ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-text-primary">Weekly Schedule</p>
                  <div className="flex gap-2">
                    <Button size="xs" variant="outline" onClick={handleGenerateSessions} loading={generatingSessions}>
                      <Play size={12} /> Generate Sessions
                    </Button>
                    <Button size="xs" onClick={() => openScheduleForm()}>
                      <Plus size={12} /> Add Schedule
                    </Button>
                  </div>
                </div>
                <div className="max-h-[260px] overflow-y-auto space-y-2">
                  {((detailData.schedules as BatchSchedule[]) ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-secondary">No weekly schedules defined. Add a schedule with day and time slot.</p>
                  ) : (
                    (detailData.schedules as BatchSchedule[])?.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-4 py-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Calendar size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{s.dayOfWeek.charAt(0) + s.dayOfWeek.slice(1).toLowerCase()}</p>
                          <p className="text-xs text-text-secondary">{s.startTime} - {s.endTime}{s.room ? ` • Room: ${s.room}` : ""}</p>
                        </div>
                        <Button size="xs" variant="ghost" onClick={() => openScheduleForm(s)} title="Edit">
                          <Edit3 size={12} />
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => handleDeleteSchedule(s)} title="Remove">
                          <Trash2 size={12} className="text-danger" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <Modal
                  open={scheduleFormOpen}
                  onClose={() => { setScheduleFormOpen(false); setEditingSchedule(null); }}
                  title={editingSchedule ? "Edit Schedule" : "Add Schedule"}
                  size="sm"
                >
                  <div className="space-y-4">
                    <UiSelect
                      label="Day of Week"
                      value={scheduleForm.dayOfWeek}
                      onChange={(val) => setScheduleForm((p) => ({ ...p, dayOfWeek: val }))}
                      options={["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => ({ value: d, label: d.charAt(0) + d.slice(1).toLowerCase() }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Start Time"
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, startTime: e.target.value }))}
                      />
                      <Input
                        label="End Time"
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, endTime: e.target.value }))}
                      />
                    </div>
                    <Input
                      label="Room (optional)"
                      value={scheduleForm.room}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, room: e.target.value }))}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => { setScheduleFormOpen(false); setEditingSchedule(null); }}>Cancel</Button>
                      <Button onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}>
                        <Save size={14} /> {editingSchedule ? "Update" : "Add"}
                      </Button>
                    </div>
                  </div>
                </Modal>
              </div>
            ) : detailTab === "attendance" ? (
              <p className="py-8 text-center text-sm text-text-secondary">Attendance records loaded. View in attendance section for detailed reporting.</p>
            ) : detailTab === "progress" ? (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {((detailData.progress as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">No progress records</p>
                ) : (
                  (detailData.progress as Array<Record<string, unknown>>)?.map((p: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{(p.student as Record<string, unknown>)?.name as string || "Student"}</p>
                        <p className="text-xs text-text-secondary">Score: {String(p.score ?? "N/A")} • {p.assessedAt as string ? new Date(p.assessedAt as string).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : detailTab === "waitlist" ? (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {((detailData.waitlist as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">No students on waitlist</p>
                ) : (
                  (detailData.waitlist as Array<Record<string, unknown>>)?.map((w: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-4 py-2.5">
                      <Clock size={16} className="text-text-secondary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{(w.student as Record<string, unknown>)?.name as string || w.studentName as string}</p>
                        <p className="text-xs text-text-secondary">Position: {i + 1}{(w as Record<string, unknown>).priority ? ` • Priority: ${w.priority as string}` : ""}</p>
                      </div>
                      <Badge size="sm" variant="warning">WAITING</Badge>
                    </div>
                  ))
                )}
              </div>
            ) : detailTab === "capacity" ? (
              <div className="grid grid-cols-3 gap-4">
                <StatCard title="Capacity" value={detailData.capacity ? (detailData.capacity as Record<string, unknown>).capacity as number : detailBatch.capacity} icon={<Users size={18} />} />
                <StatCard title="Enrolled" value={detailData.capacity ? (detailData.capacity as Record<string, unknown>).enrolled as number : 0} icon={<Users size={18} />} />
                <StatCard title="Available" value={detailData.capacity ? (detailData.capacity as Record<string, unknown>).available as number : 0} icon={<Users size={18} />} />
                <StatCard title="Waitlist" value={detailData.capacity ? (detailData.capacity as Record<string, unknown>).waitlistCount as number : 0} icon={<ListOrdered size={18} />} />
              </div>
            ) : null}
          </div>
        )}

        <Modal
          open={enrollStudentOpen}
          onClose={() => setEnrollStudentOpen(false)}
          title="Enroll Student(s)"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEnrollStudentNew(false); loadStudentList(); }}
                className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition-colors ${!enrollStudentNew ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary"}`}
              >
                Existing Students
              </button>
              <button
                onClick={() => setEnrollStudentNew(true)}
                className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition-colors ${enrollStudentNew ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary"}`}
              >
                New Student
              </button>
            </div>

            {enrollStudentNew ? (
              <div className="space-y-3">
                <Input label="Name" required value={enrollName} onChange={(e) => setEnrollName(e.target.value)} placeholder="Enter student name" />
                <Input label="Phone" value={enrollPhone} onChange={(e) => setEnrollPhone(e.target.value)} placeholder="Enter phone number" />
                <Input label="Email (optional)" value={enrollEmail} onChange={(e) => setEnrollEmail(e.target.value)} placeholder="Enter email" />
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-1 rounded-[var(--radius-sm)] border border-border p-1">
                  {studentListLoading ? (
                    <p className="py-4 text-center text-xs text-text-secondary">Loading...</p>
                  ) : studentList.length === 0 ? (
                    <p className="py-4 text-center text-xs text-text-secondary">No students found</p>
                  ) : (
                    studentList
                      .filter((s) => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.phone.includes(studentSearch))
                      .map((s) => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-surface-overlay"}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedStudentIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary">{s.name}</p>
                              <p className="text-xs text-text-secondary">{s.phone}{s.email ? ` · ${s.email}` : ""}</p>

                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
                <p className="text-xs text-text-secondary">{selectedStudentIds.length} student(s) selected</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEnrollStudentOpen(false)} disabled={enrolling}>Cancel</Button>
              <Button onClick={handleAddStudentToBatch} loading={enrolling}>
                {enrollStudentNew ? "Enroll" : `Enroll ${selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ""}`}
              </Button>
            </div>
          </div>
        </Modal>
      </Modal>
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={() => { setEditingBatch(null); setModalOpen(true); }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>
    </PageContainer>
  );
}