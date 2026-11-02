"use client";

import * as React from "react";
import { Pause, Play, RotateCcw, XCircle, IndianRupee, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { EnrollmentStatusBadge } from "./StatusBadge";
import {
  getEnrollment,
  updateEnrollment,
  pauseEnrollment,
  resumeEnrollment,
  reactivateEnrollment,
  cancelEnrollment,
  type Enrollment,
} from "@/services/enrollments";
import { getFeePlans, type FeePlan } from "@/services/finance";

export default function EnrollmentDetailsPage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null);

  const [actionConfirm, setActionConfirm] = React.useState<{
    open: boolean;
    action: "pause" | "resume" | "reactivate" | "cancel" | null;
  }>({ open: false, action: null });
  const [actionSaving, setActionSaving] = React.useState(false);

  // ─── Fee Plan Edit ──────────────────────────────────────────────────
  const [feePlanModalOpen, setFeePlanModalOpen] = React.useState(false);
  const [feePlans, setFeePlans] = React.useState<FeePlan[]>([]);
  const [editFeePlanId, setEditFeePlanId] = React.useState("");
  const [feePlanSaving, setFeePlanSaving] = React.useState(false);

  React.useEffect(() => {
    if (!feePlanModalOpen || !enrollment) return;
    (async () => {
      try {
        const res = await getFeePlans({ pageSize: 100, status: "active", courseId: enrollment.courseId || undefined });
        setFeePlans(res.data.items ?? []);
        setEditFeePlanId(enrollment.feePlanId ?? "");
      } catch {
        setFeePlans([]);
      }
    })();
  }, [feePlanModalOpen, enrollment]);

  const handleFeePlanSave = async () => {
    if (!enrollment) return;
    setFeePlanSaving(true);
    try {
      await updateEnrollment(enrollment.id, { feePlanId: editFeePlanId || undefined });
      toast.success("Fee plan updated");
      setFeePlanModalOpen(false);
      await fetchEnrollment();
    } catch {
      toast.error("Failed to update fee plan");
    } finally {
      setFeePlanSaving(false);
    }
  };

  const fetchEnrollment = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getEnrollment(id);
      setEnrollment(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchEnrollment();
  }, [fetchEnrollment]);

  const statusActionConfig: Record<string, { handler: (id: string) => Promise<unknown>; label: string; intent: "danger" | "info" | "warning" }> = {
    pause: { handler: pauseEnrollment, label: "Pause", intent: "warning" },
    resume: { handler: resumeEnrollment, label: "Resume", intent: "info" },
    reactivate: { handler: reactivateEnrollment, label: "Reactivate", intent: "info" },
    cancel: { handler: cancelEnrollment, label: "Cancel", intent: "danger" },
  };

  const confirmAction = async () => {
    if (!enrollment || !actionConfirm.action) return;
    const config = statusActionConfig[actionConfirm.action];
    setActionSaving(true);
    try {
      await config.handler(enrollment.id);
      setActionConfirm({ open: false, action: null });
      await fetchEnrollment();
    } catch {
      // Toast is handled in the hook
    } finally {
      setActionSaving(false);
    }
  };

  const availableActions = enrollment
    ? {
        active: [
          { action: "pause" as const, label: "Pause", icon: <Pause size={14} />, variant: "outline" as const },
          { action: "cancel" as const, label: "Cancel", icon: <XCircle size={14} />, variant: "danger" as const },
        ],
        paused: [
          { action: "resume" as const, label: "Resume", icon: <Play size={14} />, variant: "primary" as const },
          { action: "cancel" as const, label: "Cancel", icon: <XCircle size={14} />, variant: "danger" as const },
        ],
        cancelled: [
          { action: "reactivate" as const, label: "Reactivate", icon: <RotateCcw size={14} />, variant: "primary" as const },
        ],
        completed: [],
      }[enrollment.status] ?? []
    : [];

  if (error) {
    return (
      <PageContainer
        title="Enrollment Details"
        back={() => router.push("../enrollments")}
      >
        <ErrorState
          code={500}
          action={{ label: "Retry", onClick: fetchEnrollment }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Enrollment Details"
      back={() => router.push("../enrollments")}
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : enrollment ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">{enrollment.studentName}</h2>
            <EnrollmentStatusBadge status={enrollment.status} />
          </div>

          {availableActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableActions.map((a) => (
                <Button
                  key={a.action}
                  variant={a.variant}
                  size="sm"
                  leftIcon={a.icon}
                  onClick={() => setActionConfirm({ open: true, action: a.action })}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Course</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-text-primary">{enrollment.courseName}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Batch</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-text-primary">{enrollment.batchName}</p>
              </CardBody>
            </Card>
            {enrollment.feePlanName && (
              <Card>
                <CardHeader>
                  <CardTitle>Fee Plan</CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="text-sm font-medium text-text-primary">{enrollment.feePlanName}</p>
                  {enrollment.feePlanAmount != null && (
                    <p className="text-lg font-semibold text-text-primary flex items-center gap-1">
                      <IndianRupee size={16} />
                      {enrollment.feePlanAmount.toLocaleString()}
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Start Date</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-text-primary">
                  {new Date(enrollment.startDate).toLocaleDateString()}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>End Date</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-text-primary">
                  {new Date(enrollment.endDate).toLocaleDateString()}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Student</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-text-primary">{enrollment.studentName}</p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={16} />
                Fee Plan
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {enrollment.feePlanName ? (
                <>
                  <p className="text-sm text-text-secondary">
                    This enrollment has fee plan <strong>{enrollment.feePlanName}</strong> (₹{enrollment.feePlanAmount?.toLocaleString() ?? "N/A"}).
                    Invoices and payment history can be viewed from the{" "}
                    <button
                      onClick={() => router.push("../fees")}
                      className="text-primary underline underline-offset-2 hover:no-underline"
                    >
                      Fees page
                    </button>
                    .
                  </p>
                  <Button
                    variant="outline"
                    size="xs"
                    leftIcon={<Pencil size={12} />}
                    onClick={() => setFeePlanModalOpen(true)}
                    className="mt-3"
                  >
                    Change Fee Plan
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary">
                    No fee plan assigned. Assign a fee plan to enable invoice auto-generation.
                  </p>
                  <Button
                    variant="primary"
                    size="xs"
                    leftIcon={<Pencil size={12} />}
                    onClick={() => setFeePlanModalOpen(true)}
                    className="mt-3"
                  >
                    Assign Fee Plan
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Created</span>
                  <span>{new Date(enrollment.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Last Updated</span>
                  <span>{new Date(enrollment.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Modal
            open={feePlanModalOpen}
    onClose={() => setFeePlanModalOpen(false)}
            title="Change Fee Plan"
            size="sm"
            footer={
              <>
                <Button variant="outline" onClick={() => setFeePlanModalOpen(false)} disabled={feePlanSaving}>
                  Cancel
                </Button>
                <Button onClick={handleFeePlanSave} loading={feePlanSaving}>
                  Save
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Select a new fee plan for <strong>{enrollment?.studentName}</strong>. An invoice will be auto-generated if a fee plan is assigned.
              </p>
              <Select
                label="Fee Plan"
                value={editFeePlanId}
                onChange={(val) => setEditFeePlanId(val)}
                options={[
                  { value: "", label: "No fee plan" },
                  ...feePlans.map((fp) => ({ value: fp.id, label: `${fp.planName} — ₹${fp.totalAmount}` })),
                ]}
              />
              {editFeePlanId && (() => {
                const fp = feePlans.find((p) => p.id === editFeePlanId);
                if (!fp) return null;
                return (
                  <div className="rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2">
                    <p className="text-xs text-text-secondary">Plan Amount</p>
                    <p className="text-sm font-semibold tabular-nums">
                      ₹{fp.totalAmount.toLocaleString()} {fp.currency}
                    </p>
                    <p className="mt-1 text-xs text-success">
                      Invoice will be auto-generated
                    </p>
                  </div>
                );
              })()}

            </div>
          </Modal>

          <ConfirmModal
            open={actionConfirm.open}
            onClose={() => setActionConfirm({ open: false, action: null })}
            onConfirm={confirmAction}
            title={
              actionConfirm.action
                ? `${actionConfirm.action.charAt(0).toUpperCase() + actionConfirm.action.slice(1)} Enrollment`
                : ""
            }
            description={`Are you sure you want to ${actionConfirm.action ?? ""} this enrollment for ${enrollment.studentName}?`}
            intent={actionConfirm.action ? statusActionConfig[actionConfirm.action].intent : "info"}
            confirmLabel={actionConfirm.action ? actionConfirm.action.charAt(0).toUpperCase() + actionConfirm.action.slice(1) : "Confirm"}
            loading={actionSaving}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
