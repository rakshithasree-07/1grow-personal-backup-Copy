"use client";

import * as React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/EmptyState";
import { AttendanceNav } from "./AttendanceNav";
import {
  AttendanceMarkGrid,
  recordsToGridRows,
  type MarkGridRow,
} from "./AttendanceMarkGrid";
import {
  useAttendanceBatches,
  useAttendanceMutations,
} from "@/hooks/useAttendance";
import { attendanceService } from "@/services/attendance.service";
import { getBranches } from "@/services/branches";
import type { Branch } from "@/services/branches";
import type { BulkMarkFormValues } from "@/validations/attendance";

interface AttendanceMarkViewProps {
  basePath: string;
}

export function AttendanceMarkView({ basePath }: AttendanceMarkViewProps) {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchId, setBranchId] = React.useState("");
  const [batchId, setBatchId] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<MarkGridRow[]>([]);
  const [loadingGrid, setLoadingGrid] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = React.useState(true);

  const { batches, loading: batchesLoading } = useAttendanceBatches(branchId || undefined);
  const { saving, create, update, bulkMark } = useAttendanceMutations();

  React.useEffect(() => {
    getBranches()
      .then((res) => setBranches(res.data ?? []))
      .catch(() => {})
      .finally(() => setBranchesLoading(false));
  }, []);

  const loadStudents = React.useCallback(async (bId: string) => {
    setLoadingGrid(true);
    setLoadError(null);
    setSessionId(null);
    try {
      const students = await attendanceService.getStudentsByBatch(bId);
      setRows(
        students.map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          status: "PRESENT" as const,
        })),
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  const loadExistingSession = React.useCallback(async (bId: string, d: string) => {
    setLoadingGrid(true);
    setLoadError(null);
    try {
      const result = await attendanceService.list({
        batchId: bId,
        dateFrom: d,
        dateTo: d,
        page: 1,
        pageSize: 1,
      });
      if (result.data[0]) {
        setSessionId(result.data[0].id);
        const detail = await attendanceService.getById(result.data[0].id);
        setRows(recordsToGridRows(detail.records ?? []));
      }
    } catch {
      // No existing session for this date
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  React.useEffect(() => {
    if (batchId) {
      loadStudents(batchId);
    }
  }, [batchId, loadStudents]);

  React.useEffect(() => {
    if (batchId && date) {
      loadExistingSession(batchId, date);
    }
  }, [date, batchId, loadExistingSession]);

  const handleSave = async () => {
    if (rows.length === 0) return;
    const records = rows.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      remarks: r.remarks ?? undefined,
    }));

    if (sessionId) {
      await update(sessionId, { records });
    } else {
      const created = await create({ batchId, date, records });
      setSessionId(created.id);
    }
  };

  const handleBulkSubmit = async (values: BulkMarkFormValues) => {
    const result = await bulkMark({
      batchId: values.batchId,
      classSessionId: values.classSessionId || undefined,
      date: values.date,
      defaultStatus: values.defaultStatus,
    });
    setSessionId(result.id);
    setRows(recordsToGridRows(result.records ?? []));
  };

  if (loadError) {
    return (
      <PageContainer title="Mark Attendance" subtitle="Record attendance for a batch session.">
        <AttendanceNav basePath={basePath} />
        <ErrorState
          code={500}
          title="Unable to load students"
          description={loadError}
          action={{ label: "Retry", onClick: () => batchId && loadStudents(batchId) }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Mark Attendance"
      subtitle="Record attendance for a batch session."
      actions={
        <div className="flex flex-wrap gap-2">
          {batchId && (
            <Button size="sm" onClick={handleSave} loading={saving} disabled={rows.length === 0}>
              Save Attendance
            </Button>
          )}
        </div>
      }
    >
      <AttendanceNav basePath={basePath} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 pt-0 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Branch</label>
            {branchesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <select
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setBatchId(""); setRows([]); }}
                className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Batch</label>
            {batchesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={!branchId}
                className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">{branchId ? "Select Batch" : "Select branch first"}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.studentCount} students)
                  </option>
                ))}
              </select>
            )}
          </div>
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </CardBody>
      </Card>

      {batchId && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Grid</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <AttendanceMarkGrid
              rows={rows}
              loading={loadingGrid}
              onRowsChange={setRows}
              onAddStudent={() => undefined}
              batchId={batchId}
            />
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
}
