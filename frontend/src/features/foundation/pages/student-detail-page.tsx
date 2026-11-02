"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRolePath } from "@/hooks/useRolePrefix";
import {
  ArrowLeft, Phone, Mail, Calendar, MapPin, User, Building2, GraduationCap,
  Activity, CreditCard, BookOpen, Clock, Heart, Edit3, CheckCircle, XCircle, LogIn, Plus, Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Card, CardHeader, CardBody, Badge, Skeleton, Modal, Input, Select, Textarea, Avatar } from "@/components/ui";
import { getStudent, updateStudent, inviteStudent, type Student } from "@/services/students";
import { attendanceService } from "@/services/attendance.service";
import { createEnrollment } from "@/services/enrollments";
import { getBranches } from "@/services/branches";
import type { Branch } from "@/services/branches";
import { getFeePlans } from "@/services/finance";
import type { FeePlan } from "@/services/finance";
import { apiClient } from "@/services/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface StudentDetailPageProps {
  studentId: string;
  basePath?: string;
}

export function StudentDetailPage({ studentId, basePath = "/owner/students" }: StudentDetailPageProps) {
  const router = useRouter();
  const rolePath = useRolePath();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "enrollments" | "progress" | "invoices">("overview");

  /* Edit modal */
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", parentName: "", parentPhone: "",
    address: "", city: "", state: "", pincode: "", medicalNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  /* Invite modal */
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteLink: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  /* Add enrollment modal */
  const [addEnrollModal, setAddEnrollModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [selectedFeePlan, setSelectedFeePlan] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudent(studentId);
      setStudent(res.data);
    } catch {
      toast.error("Failed to load student");
      router.push(rolePath("/students"));
    } finally {
      setLoading(false);
    }
  }, [studentId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEditModal = () => {
    if (!student) return;
    setEditForm({
      name: student.name ?? "",
      email: student.email ?? "",
      phone: student.phone ?? "",
      parentName: student.parentName ?? "",
      parentPhone: student.parentPhone ?? "",
      address: student.address ?? "",
      city: student.city ?? "",
      state: student.state ?? "",
      pincode: student.pincode ?? "",
      medicalNotes: student.medicalNotes ?? "",
    });
    setEditModal(true);
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      await updateStudent(studentId, editForm as any);
      toast.success("Student updated successfully");
      setEditModal(false);
      fetchData();
    } catch {
      toast.error("Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!student) return;
    try {
      await updateStudent(studentId, { isActive: !student.isActive } as any);
      toast.success(student.isActive ? "Student deactivated" : "Student activated");
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await inviteStudent(studentId);
      setInviteResult({ inviteLink: res.data.inviteLink });
      toast.success("Invitation created successfully");
    } catch {
      toast.error("Failed to create invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const openAddEnrollModal = async () => {
    try {
      const [branchesRes, feePlansRes] = await Promise.all([
        getBranches(),
        getFeePlans(),
      ]);
      setBranches(branchesRes.data ?? []);
      setFeePlans(feePlansRes.data?.items ?? []);
      setSelectedBranch("");
      setSelectedBatch("");
      setSelectedFeePlan("");
      setBatches([]);
      setAddEnrollModal(true);
    } catch {
      toast.error("Failed to load branches");
    }
  };

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranch(branchId);
    setSelectedBatch("");
    if (!branchId) { setBatches([]); return; }
    try {
      const batches = await attendanceService.getBatches(branchId);
      setBatches(batches.map((b) => ({ id: b.id, name: b.name })));
    } catch {
      setBatches([]);
    }
  };

  if (loading) {
    return (
      <PageContainer back={() => router.push(rolePath("/students"))}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-72 rounded-[var(--radius-sm)]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2"><Skeleton className="h-[400px] rounded-[var(--radius-md)]" /></div>
            <Skeleton className="h-[400px] rounded-[var(--radius-md)]" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!student) return null;

  const activeEnrollments = student.enrollments?.filter((e) => e.status === "ACTIVE") ?? [];
  const allEnrollments = student.enrollments ?? [];
  const attendanceSummary = student.attendanceSummary;

  return (
    <PageContainer back={() => router.push(rolePath("/students"))}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar src={student.photoUrl} name={student.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">{student.name}</h1>
              <Badge size="sm" variant={student.isActive ? "success" : "danger"}>
                {student.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {student.phone}{student.email ? ` · ${student.email}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" onClick={openEditModal}>
            <Edit3 size={16} /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setInviteResult(null); setInviteModal(true); }}>
            <LogIn size={16} /> Invite to Login
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={student.isActive ? "text-danger" : "text-success"}
            onClick={handleToggleActive}
          >
            {student.isActive ? <><XCircle size={16} /> Deactivate</> : <><CheckCircle size={16} /> Activate</>}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center mb-1"><GraduationCap size={16} className="text-primary" /></div>
          <p className="text-lg font-bold text-text-primary">{activeEnrollments.length}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Active Enrollments</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center mb-1"><Activity size={16} className="text-success" /></div>
          <p className="text-lg font-bold text-text-primary">{attendanceSummary?.rate ?? 0}%</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Attendance Rate</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center mb-1"><BookOpen size={16} className="text-info" /></div>
          <p className="text-lg font-bold text-text-primary">{student.progress?.length ?? 0}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Assessments</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center mb-1"><CreditCard size={16} className="text-warning" /></div>
          <p className="text-lg font-bold text-text-primary">{student.invoices?.length ?? 0}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Invoices</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border">
            {[
              { key: "overview", label: "Overview", icon: User },
              { key: "enrollments", label: "Enrollments", icon: GraduationCap },
              { key: "progress", label: "Progress", icon: Activity },
              { key: "invoices", label: "Invoices", icon: CreditCard },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <Card>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Phone", value: student.phone, icon: Phone },
                    { label: "Email", value: student.email || "-", icon: Mail },
                    { label: "Date of Birth", value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-", icon: Calendar },
                    { label: "Gender", value: student.gender || "-", icon: User },
                    { label: "Parent/Guardian", value: student.parentName || "-", icon: User },
                    { label: "Parent Phone", value: student.parentPhone || "-", icon: Phone },
                    { label: "City", value: student.city || "-", icon: MapPin },
                    { label: "Address", value: student.address || "-", icon: MapPin },
                    { label: "Joined", value: new Date(student.joinedAt).toLocaleDateString(), icon: Calendar },
                    { label: "Medical Notes", value: student.medicalNotes || "-", icon: Heart },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-surface-raised">
                      <item.icon size={16} className="text-text-secondary shrink-0" />
                      <div>
                        <p className="text-xs text-text-secondary">{item.label}</p>
                        <p className="text-sm font-medium text-text-primary">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Enrollments Tab */}
          {activeTab === "enrollments" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={openAddEnrollModal}>
                  <Plus size={14} /> Add Enrollment
                </Button>
              </div>
              {allEnrollments.length === 0 ? (
                <Card><CardBody>
                  <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                    <GraduationCap size={28} className="mb-2 text-text-disabled" />
                    <p className="text-sm font-medium">No enrollments</p>
                    <p className="text-xs mt-1">This student has no enrollments yet</p>
                  </div>
                </CardBody></Card>
              ) : (
                allEnrollments.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-text-primary">
                              {enrollment.batch?.course?.name || enrollment.batch?.name || "Unknown Batch"}
                            </h4>
                            <Badge size="sm" variant={enrollment.status === "ACTIVE" ? "success" : enrollment.status === "COMPLETED" ? "info" : "danger"}>
                              {enrollment.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary mt-2">
                            {enrollment.batch?.name && (
                              <span className="flex items-center gap-1"><BookOpen size={10} /> {enrollment.batch.name}</span>
                            )}
                            {enrollment.batch?.branch?.name && (
                              <span className="flex items-center gap-1"><Building2 size={10} /> {enrollment.batch.branch.name}</span>
                            )}
                            {enrollment.feePlan && (
                              <span className="flex items-center gap-1"><CreditCard size={10} /> {enrollment.feePlan.name} — ₹{enrollment.feePlan.totalAmount}</span>
                            )}
                            {enrollment.enrolledAt && (
                              <span className="flex items-center gap-1"><Calendar size={10} /> Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === "progress" && (
            <div className="space-y-3">
              {(!student.progress || student.progress.length === 0) ? (
                <Card><CardBody>
                  <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                    <Activity size={28} className="mb-2 text-text-disabled" />
                    <p className="text-sm font-medium">No progress records</p>
                  </div>
                </CardBody></Card>
              ) : (
                student.progress.map((p) => (
                  <Card key={p.id}>
                    <CardBody className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{p.module || "General"}</p>
                          <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                            {p.batch && <span>{p.batch.name}</span>}
                            {p.trainer && <span>by {p.trainer.name}</span>}
                            <span>{new Date(p.assessedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-text-primary">{p.percentage}%</p>
                          </div>
                          {p.grade && (
                            <Badge size="sm" variant={
                              p.grade === "A+" || p.grade === "A" ? "success" :
                              p.grade === "B" ? "info" : "warning"
                            }>
                              {p.grade}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            p.percentage >= 80 ? "bg-success" : p.percentage >= 60 ? "bg-warning" : "bg-danger",
                          )}
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <Card>
              <CardBody>
                {(!student.invoices || student.invoices.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                    <CreditCard size={28} className="mb-2 text-text-disabled" />
                    <p className="text-sm font-medium">No invoices</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {student.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{inv.invoiceNumber}</p>
                          <p className="text-xs text-text-secondary">
                            Issued {new Date(inv.issueDate).toLocaleDateString()} · Due {new Date(inv.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-text-primary">₹{Number(inv.totalAmount).toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {Number(inv.paidAmount) > 0 && Number(inv.paidAmount) < Number(inv.totalAmount) && (
                              <span className="text-[10px] text-text-secondary">Paid ₹{Number(inv.paidAmount).toLocaleString()}</span>
                            )}
                            <Badge size="sm" variant={
                              inv.status === "PAID" ? "success" :
                              inv.status === "OVERDUE" ? "danger" :
                              inv.status === "PARTIALLY_PAID" ? "warning" : "outline"
                            }>
                              {inv.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Attendance Summary */}
          {attendanceSummary && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-text-primary">Attendance Summary</h3></CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Present</span>
                    <span className="text-sm font-semibold text-success">{attendanceSummary.present}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Absent</span>
                    <span className="text-sm font-semibold text-danger">{attendanceSummary.absent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Total Sessions</span>
                    <span className="text-sm font-semibold text-text-primary">{attendanceSummary.total}</span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        attendanceSummary.rate >= 80 ? "bg-success" : attendanceSummary.rate >= 60 ? "bg-warning" : "bg-danger",
                      )}
                      style={{ width: `${attendanceSummary.rate}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-text-secondary">{attendanceSummary.rate}% attendance rate</p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Active Courses */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-text-primary">Active Courses</h3></CardHeader>
            <CardBody className="pt-0">
              {activeEnrollments.length === 0 ? (
                <p className="text-xs text-text-secondary">No active enrollments</p>
              ) : (
                <div className="space-y-2">
                  {activeEnrollments.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 py-1.5">
                      <BookOpen size={14} className="text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-text-primary">{e.batch?.course?.name || e.batch?.name}</p>
                        {e.batch?.branch?.name && (
                          <p className="text-[10px] text-text-secondary">{e.batch.branch.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-text-primary">Quick Info</h3></CardHeader>
            <CardBody className="pt-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Joined</span>
                <span className="font-medium text-text-primary">{new Date(student.joinedAt).toLocaleDateString()}</span>
              </div>
              {student.parentName && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Guardian</span>
                  <span className="font-medium text-text-primary">{student.parentName}</span>
                </div>
              )}
              {student.city && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">City</span>
                  <span className="font-medium text-text-primary">{student.city}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Student" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name *" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            <Input label="Phone *" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
            <Input label="Email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} type="email" />
            <Input label="Parent/Guardian" value={editForm.parentName} onChange={(e) => setEditForm((p) => ({ ...p, parentName: e.target.value }))} />
            <Input label="Parent Phone" value={editForm.parentPhone} onChange={(e) => setEditForm((p) => ({ ...p, parentPhone: e.target.value }))} />
            <Input label="City" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} />
            <Input label="State" value={editForm.state} onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value }))} />
            <Input label="Pincode" value={editForm.pincode} onChange={(e) => setEditForm((p) => ({ ...p, pincode: e.target.value }))} />
          </div>
          <Input label="Address" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
          <Textarea label="Medical Notes" value={editForm.medicalNotes} onChange={(e) => setEditForm((p) => ({ ...p, medicalNotes: e.target.value }))} rows={2} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdate} loading={submitting}>Update Student</Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Student" size="md">
        <div className="space-y-4">
          {inviteResult ? (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] bg-success/10 border border-success/20 p-4">
                <p className="text-sm font-medium text-success">Invitation created!</p>
                <p className="text-xs text-text-secondary mt-1">Share the link below with the student to set up their account.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">Invite Link</label>
                <div className="flex gap-2">
                  <Input value={inviteResult.inviteLink} readOnly />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(inviteResult.inviteLink); toast.success("Link copied!"); }}>
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                This will create a login account for <strong>{student?.name}</strong> using their email ({student?.email || "none"}) and phone ({student?.phone}).
              </p>
              {!student?.email && !student?.phone && (
                <p className="text-xs text-danger">Student needs an email or phone to be invited.</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setInviteModal(false)}>Cancel</Button>
                <Button onClick={handleInvite} loading={inviteLoading}>
                  Create Invitation
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Enrollment Modal */}
      <Modal open={addEnrollModal} onClose={() => setAddEnrollModal(false)} title="Add Enrollment" size="md">
        <div className="space-y-4">
          <Select
            label="Branch"
            value={selectedBranch}
            onChange={(val) => handleBranchChange(val)}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Select branch"
          />
          <Select
            label="Batch"
            value={selectedBatch}
            onChange={(val) => setSelectedBatch(val)}
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
            placeholder={selectedBranch ? "Select batch" : "Select branch first"}
            disabled={!selectedBranch || batches.length === 0}
          />
          <Select
            label="Fee Plan (optional)"
            value={selectedFeePlan}
            onChange={(val) => setSelectedFeePlan(val)}
            options={[
              { value: "", label: "No fee plan" },
              ...feePlans.map((fp) => ({ value: fp.id, label: `${fp.planName} — ₹${fp.totalAmount}` })),
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddEnrollModal(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedBatch) { toast.error("Select a batch"); return; }
                try {
                  await createEnrollment({
                    studentId,
                    batchId: selectedBatch,
                    ...(selectedFeePlan ? { feePlanId: selectedFeePlan } : {}),
                  });
                  toast.success("Enrollment added");
                  setAddEnrollModal(false);
                  fetchData();
                } catch {
                  toast.error("Failed to add enrollment");
                }
              }}
            >
              Enroll
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
