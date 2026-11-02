"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users, ExternalLink, Trash2, ChevronDown, ChevronRight, CreditCard, DollarSign, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Modal, Input, SearchBar, Badge, Pagination, Card, Skeleton, Select } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { getBatches, getBatchStudents, enrollStudentInBatch, bulkEnrollStudents, removeStudentFromBatch, type Batch } from "@/services/training";
import { getStudents } from "@/services/students";
import { createEnrollment, type CreateEnrollmentRequest } from "@/services/enrollments";
import { getFeePlans, type FeePlan } from "@/services/finance";

interface BatchWithStudents extends Batch {
  enrolledStudents: Array<{
    id: string;
    student: { id: string; name: string; email: string };
    status: string;
  }>;
}

export default function EnrollmentsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 10;

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollBatchId, setEnrollBatchId] = useState<string | null>(null);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [studentList, setStudentList] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentListLoading, setStudentListLoading] = useState(false);

  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [selectedFeePlanId, setSelectedFeePlanId] = useState("");
  const [customFeeAmount, setCustomFeeAmount] = useState("");
  const [editFeeAmount, setEditFeeAmount] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBatches({ page, pageSize, search, status: "ACTIVE" });
      const raw = res.data ?? [];
      const withStudents: BatchWithStudents[] = await Promise.all(
        raw.map(async (b: Batch) => {
          try {
            const studentsRes = await getBatchStudents(b.id);
            return { ...b, enrolledStudents: (studentsRes.data ?? []).map((s: any) => ({
              id: s.id,
              student: s.student ?? { id: s.studentId, name: s.studentName ?? "Unknown", email: s.studentEmail ?? "" },
              status: s.status,
            })) };
          } catch {
            return { ...b, enrolledStudents: [] };
          }
        })
      );
      setBatches(withStudents);
      setTotal(res.meta?.total ?? raw.length);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

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

  const loadFeePlans = async (courseId?: string) => {
    try {
      const res = await getFeePlans({ pageSize: 100, status: "active", courseId: courseId || undefined });
      setFeePlans(res.data.items ?? []);
    } catch {
      setFeePlans([]);
    }
  };

  const openEnrollModal = (batchId: string) => {
    setEnrollBatchId(batchId);
    setIsNewStudent(false);
    setStudentName("");
    setStudentPhone("");
    setStudentEmail("");
    setSelectedStudentIds([]);
    setStudentSearch("");
    setSelectedFeePlanId("");
    setCustomFeeAmount("");
    setEditFeeAmount(false);
    loadStudentList();
    const batch = batches.find((b) => b.id === batchId);
    loadFeePlans(batch?.course?.id);
    setEnrollModalOpen(true);
  };

  const getBatchCourseId = (): string => {
    const batch = batches.find((b) => b.id === enrollBatchId);
    return batch?.course?.id ?? "";
  };

  const handleEnroll = async () => {
    if (!enrollBatchId) return;
    if (!isNewStudent && selectedStudentIds.length === 0) { toast.error("Select at least one student"); return; }
    if (isNewStudent && !studentName.trim()) { toast.error("Enter student name"); return; }
    if (isNewStudent && !studentPhone.trim()) { toast.error("Enter student phone number"); return; }
    setEnrolling(true);
    try {
      if (isNewStudent) {
        await enrollStudentInBatch(enrollBatchId, {
          name: studentName.trim(),
          phone: studentPhone.trim() || undefined,
          email: studentEmail.trim() || undefined,
        });
        toast.success("Student enrolled successfully");
      } else if (selectedFeePlanId) {
        const courseId = getBatchCourseId();
        const fp = feePlans.find((p) => p.id === selectedFeePlanId);
        const feeAmount = editFeeAmount && customFeeAmount
          ? Number(customFeeAmount)
          : fp?.totalAmount;
        await Promise.all(
          selectedStudentIds.map((studentId) =>
            createEnrollment({
              studentId,
              batchId: enrollBatchId,
              ...(courseId ? { courseId } : {}),
              feePlanId: selectedFeePlanId,
              fee: feeAmount,
            } as CreateEnrollmentRequest)
          )
        );
        toast.success(`${selectedStudentIds.length} student(s) enrolled with fee plan`);
      } else {
        const res = await bulkEnrollStudents(enrollBatchId, selectedStudentIds);
        toast.success(`${res.data?.enrolled?.length ?? 0} enrolled, ${res.data?.skipped?.length ?? 0} skipped`);
      }
      setEnrollModalOpen(false);
      fetchBatches();
    } catch {
      toast.error("Failed to enroll student");
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudent = async (batchId: string, studentId: string) => {
    try {
      await removeStudentFromBatch(batchId, studentId);
      toast.success("Student removed from batch");
      fetchBatches();
    } catch {
      toast.error("Failed to remove student");
    }
  };

  return (
    <PageContainer
      title="Enrollments"
      subtitle="Batch-centric student enrollment management"
    >
      <div className="mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search batches..." className="max-w-xs" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />)}
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          title="No active batches"
          description="Create batches in the Batches section to start enrolling students"
        />
      ) : (
        <>
          <div className="space-y-3">
            {batches.map((batch) => {
              const isExpanded = expandedId === batch.id;
              return (
                <Card key={batch.id} variant="default" className="overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : batch.id)}
                    className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-overlay transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-text-secondary shrink-0" /> : <ChevronRight size={16} className="text-text-secondary shrink-0" />}
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
                      <Users size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{batch.name}</p>
                      <p className="text-xs text-text-secondary">
                        {batch.course?.name ?? "No program"} — {batch.enrolledStudents.length}/{batch.capacity} enrolled
                      </p>
                    </div>
                    <Badge variant={batch.status === "ACTIVE" ? "success" : "outline"} size="sm">{batch.status}</Badge>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="p-4 space-y-2">
                        {batch.enrolledStudents.length === 0 ? (
                          <p className="py-4 text-center text-sm text-text-secondary">No students enrolled</p>
                        ) : (
                          batch.enrolledStudents.map((es) => (
                            <div key={es.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {es.student.name?.charAt(0) ?? "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary">{es.student.name}</p>
                                <p className="text-xs text-text-secondary">{es.student.email}</p>
                              </div>
                              <Badge size="sm" variant={es.status === "ACTIVE" ? "success" : "outline"}>{es.status}</Badge>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => router.push(`./enrollments/${es.id}`)}
                                title="View enrollment details"
                              >
                                <ExternalLink size={12} />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleRemoveStudent(batch.id, es.student.id)}
                                title="Remove student"
                              >
                                <Trash2 size={12} className="text-danger" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 px-4 pb-4">
                        <Button size="sm" onClick={() => openEnrollModal(batch.id)}>
                          <Plus size={14} /> Add Student
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} className="mt-4" />
        </>
      )}

      <Modal
        open={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Enroll Student(s) in Batch"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEnrollModalOpen(false)} disabled={enrolling}>Cancel</Button>
            <Button onClick={handleEnroll} loading={enrolling}>
              {isNewStudent ? "Enroll" : `Enroll ${selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ""}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsNewStudent(false); loadStudentList(); }}
              className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition-colors ${!isNewStudent ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary"}`}
            >
              Existing Students
            </button>
            <button
              onClick={() => setIsNewStudent(true)}
              className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition-colors ${isNewStudent ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary"}`}
            >
              New Student
            </button>
          </div>

          {isNewStudent ? (
            <div className="space-y-3">
              <Input label="Name" required value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Enter student name" />
              <Input label="Phone" required value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="Enter phone number" />
              <Input label="Email (optional)" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Enter email" />
            </div>
          ) : (
            <>
              {/* Fee Plan Selector */}
                  {feePlans.length > 0 && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Fee Plan <span className="text-text-disabled">(optional — enables invoice auto-generation)</span>
                      </label>
                      <Select
                        value={selectedFeePlanId}
                        onChange={(val) => {
                          setSelectedFeePlanId(val);
                          setEditFeeAmount(false);
                          setCustomFeeAmount("");
                        }}
                        className="w-full"
                        options={[
                          { value: "", label: "No fee plan (enroll only)" },
                          ...feePlans.map((fp) => ({ value: fp.id, label: `${fp.planName} — ₹${fp.totalAmount}` })),
                        ]}
                      />
                      {selectedFeePlanId && (() => {
                        const fp = feePlans.find((p) => p.id === selectedFeePlanId);
                        if (!fp) return null;
                        return (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2">
                              <div>
                                <p className="text-xs text-text-secondary">Plan Amount</p>
                                <p className="text-sm font-semibold tabular-nums">
                                  ₹{fp.totalAmount.toLocaleString()} {fp.currency}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditFeeAmount(!editFeeAmount)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Pencil size={12} />
                                Override
                              </button>
                            </div>
                            {editFeeAmount && (
                              <Input
                                label="Custom Fee Amount"
                                type="number"
                                value={customFeeAmount}
                                onChange={(e) => setCustomFeeAmount(e.target.value)}
                                placeholder={String(fp.totalAmount)}
                              />
                            )}
                            <p className="text-xs text-success flex items-center gap-1">
                              <CreditCard size={12} />
                              Invoice will be auto-generated for selected students
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

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
            </>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
