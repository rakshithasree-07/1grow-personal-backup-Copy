"use client";

import Link from "next/link";
import { Calendar, Clock, Users, FileText } from "lucide-react";
import { Table, type Column } from "@/components/ui/Table";
import { SessionLockIndicator } from "./SessionLockIndicator";
import { Button } from "@/components/ui/Button";
import type { AttendanceSession } from "@/types/attendance";

interface AttendanceTableProps {
  sessions: AttendanceSession[];
  loading?: boolean;
  markPath?: string;
  detailPath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const detailUrl = (session: AttendanceSession, path: string) =>
  `${path}?sessionId=${session.id}`;

export function AttendanceTable({
  sessions,
  loading,
  markPath,
  detailPath,
  emptyTitle = "No attendance sessions found",
  emptyDescription = "Attendance records will appear here once sessions are marked.",
}: AttendanceTableProps) {
  const actionPath = detailPath ?? markPath;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns: Column<AttendanceSession>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="whitespace-nowrap font-medium">
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: "batch",
      header: "Batch",
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.batch?.name ?? row.batchId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "records",
      header: "Students",
      render: (row) => (
        <span className="whitespace-nowrap">
          {row._count?.records ?? row.records?.length ?? 0} marked
        </span>
      ),
    },
    {
      key: "isLocked",
      header: "Status",
      render: (row) => <SessionLockIndicator isLocked={!!row.isLocked} />,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) =>
        row.createdAt ? (
          <span className="whitespace-nowrap text-text-secondary text-sm">
            {formatDate(row.createdAt)}
          </span>
        ) : (
          "—"
        ),
    },
    ...(actionPath
      ? [
          {
            key: "id" as const,
            header: "",
            className: "text-right",
            render: (row: AttendanceSession) => (
              <Link
                href={detailUrl(row, actionPath)}
                className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
              >
                {row.isLocked ? "View" : "Edit"}
              </Link>
            ),
          },
        ]
      : []),
  ];

  if (!loading && sessions.length === 0) {
    return (
      <Table
        columns={columns}
        data={sessions}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table
          columns={columns}
          data={sessions}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-md)] border border-border p-4 animate-pulse space-y-2"
              >
                <div className="h-4 w-24 bg-surface-raised rounded" />
                <div className="h-3 w-32 bg-surface-raised rounded" />
                <div className="h-3 w-20 bg-surface-raised rounded" />
              </div>
            ))
          : sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-[var(--radius-md)] border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-text-secondary shrink-0" />
                    <span className="font-semibold text-text-primary">
                      {formatDate(session.date)}
                    </span>
                  </div>
                  <SessionLockIndicator isLocked={!!session.isLocked} />
                </div>

                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <FileText size={14} className="shrink-0" />
                  <span>
                    {session.batch?.name ?? session.batchId.slice(0, 8)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Users size={14} className="shrink-0" />
                  <span>
                    {session._count?.records ?? session.records?.length ?? 0} students
                  </span>
                </div>

                {session.createdAt && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock size={14} className="shrink-0" />
                    <span>Marked {formatTime(session.createdAt)}</span>
                  </div>
                )}

                {actionPath && (
                  <div className="pt-1">
                    <Link href={detailUrl(session, actionPath)}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        {session.isLocked ? "View Details" : "Edit Attendance"}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
      </div>
    </>
  );
}
