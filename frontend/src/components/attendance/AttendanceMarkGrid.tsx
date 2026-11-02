"use client";

import * as React from "react";
import { CheckSquare, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EntitySearch } from "@/components/shared/EntitySearch";
import { AttendanceStatusToggle } from "./AttendanceStatusToggle";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";
import type { SearchResultItem } from "@/services/search.service";

export interface MarkGridRow {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface AttendanceMarkGridProps {
  rows: MarkGridRow[];
  loading?: boolean;
  readOnly?: boolean;
  onRowsChange: (rows: MarkGridRow[]) => void;
  onAddStudent?: (item: SearchResultItem) => void;
  batchId?: string;
}

export function AttendanceMarkGrid({
  rows,
  loading,
  readOnly,
  onRowsChange,
  onAddStudent,
  batchId,
}: AttendanceMarkGridProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setSelected(new Set());
  }, [rows.length]);

  const toggleSelect = (studentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.studentId)));
    }
  };

  const markSelected = (status: AttendanceStatus) => {
    onRowsChange(
      rows.map((row) =>
        selected.has(row.studentId) ? { ...row, status } : row,
      ),
    );
    setSelected(new Set());
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    onRowsChange(
      rows.map((row) => (row.studentId === studentId ? { ...row, status } : row)),
    );
  };

  const handleAddStudent = (item: SearchResultItem) => {
    if (rows.some((r) => r.studentId === item.id)) return;
    onAddStudent?.(item);
    onRowsChange([
      ...rows,
      { studentId: item.id, studentName: item.label, status: "PRESENT" },
    ]);
  };

  if (loading) return <SkeletonTable rows={6} />;

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {!readOnly && onAddStudent && (
          <div className="max-w-md">
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Add students
            </label>
            <EntitySearch
              searchType="students"
              onSelect={handleAddStudent}
              extraParams={batchId ? { batchId } : undefined}
            />
          </div>
        )}
        <EmptyState
          variant="no-data"
          icon={<Users size={48} className="text-text-disabled" />}
          title="No students in grid"
          description="Select a batch to load enrolled students."
        />
      </div>
    );
  }

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-4">
      {!readOnly && onAddStudent && (
        <div className="max-w-md">
          <EntitySearch
            searchType="students"
            onSelect={handleAddStudent}
            extraParams={batchId ? { batchId } : undefined}
            placeholder="Add student to grid…"
          />
        </div>
      )}

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-raised px-3 py-2">
          <span className="text-sm text-text-secondary">
            {selected.size} selected
          </span>
          <span className="text-text-disabled">|</span>
          <Button size="xs" variant="primary" onClick={() => markSelected("PRESENT")}>
            Mark Present
          </Button>
          <Button size="xs" variant="danger" onClick={() => markSelected("ABSENT")}>
            Mark Absent
          </Button>
          <Button size="xs" variant="secondary" onClick={() => markSelected("LATE")}>
            Mark Late
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="w-10 px-2 py-3 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-text-secondary hover:text-text-primary"
                  aria-label={selected.size === rows.length ? "Deselect all" : "Select all"}
                >
                  {selected.size === rows.length ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.studentId}
                className={`border-b border-border-subtle last:border-0 hover:bg-surface-raised ${
                  selected.has(row.studentId) ? "bg-primary/5" : ""
                }`}
              >
                <td className="w-10 px-2 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => toggleSelect(row.studentId)}
                    className="text-text-secondary hover:text-text-primary"
                    aria-label={`Select ${row.studentName}`}
                  >
                    {selected.has(row.studentId) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </td>
                <td className="px-4 py-3 font-medium text-text-primary">{row.studentName}</td>
                <td className="px-4 py-3">
                  <AttendanceStatusToggle
                    value={row.status}
                    onChange={(status) => updateStatus(row.studentId, status)}
                    disabled={readOnly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function recordsToGridRows(records: AttendanceRecord[]): MarkGridRow[] {
  return records.map((record) => ({
    studentId: record.studentId,
    studentName: record.student?.name ?? record.studentId.slice(0, 8),
    status: record.status,
    remarks: record.remarks ?? undefined,
  }));
}

export function gridRowsToRecords(rows: MarkGridRow[]): AttendanceRecord[] {
  return rows.map((row) => ({
    studentId: row.studentId,
    status: row.status,
    remarks: row.remarks,
  }));
}
