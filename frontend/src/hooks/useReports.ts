"use client";

import * as React from "react";
import { toast } from "sonner";
import { reportsService } from "@/services/reports.service";
import type { ExportFormat, ReportData, ReportQueryParams, ReportType } from "@/types/reports";

export function useReport(type: ReportType, params: ReportQueryParams | null) {
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetch = React.useCallback(async () => {
    if (!params) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportsService.getReport(type, params);
  console.log(result);
      switch (type) {
  case "enrollment":
    setData({ 
      title: "Enrollment Report",
      columns: [
        { key: "status", label: "Status" },
        { key: "count", label: "Count" },
      ],
      rows: result.statusBreakdown ?? [],
      chart: (result.statusBreakdown ?? []).map((item: any) => ({
        label: item.status,
        value: item.count,
      })),
      summary: {
        totalEnrollments: result.totalEnrollments,
      },
    });
    break;

  case "attendance":
    setData({
      title: "Attendance Report",
      columns: [
        { key: "status", label: "Status" },
        { key: "count", label: "Count" },
      ],
      rows: result.statusBreakdown ?? [],
      chart: (result.statusBreakdown ?? []).map((item: any) => ({
        label: item.status,
        value: item.count,
      })),
      summary: {
        totalSessions: result.totalSessions,
        totalRecords: result.totalRecords,
        presentRecords: result.presentRecords,
        absentRecords: result.absentRecords,
        attendanceRate: result.attendanceRate,
      },
    });
    break;
    case "student-progress":
  setData({
    title: "Student Progress",

    columns: [
      { key: "student", label: "Student" },
      { key: "percentage", label: "Progress %" },
      { key: "grade", label: "Grade" },
    ],

    rows: result.recentRecords ?? [],

    chart: (result.rangeBreakdown ?? []).map((item: any) => ({
      label: item.range,
      value: item.count,
    })),

    summary: {
      TotalRecords: result.totalRecords,
      AveragePercentage: result.averagePercentage,
    },
  });
  break;
  case "payment-due":
    setData({
      title: "Payment Due Report",
      columns: [
        { key: "invoiceNumber", label: "Invoice" },
        { key: "studentName", label: "Student" },
        { key: "dueAmount", label: "Due Amount" },
      ],
      rows: result.invoices ?? [],
      chart: [
        {
          label: "Pending Amount",
          value: result.pendingAmount ?? 0,
        },
        {
          label: "Paid Amount",
          value: (result.totalDue ?? 0) - (result.pendingAmount ?? 0),
        },
      ],
      summary: {
        totalDue: result.totalDue,
        pendingAmount: result.pendingAmount,
        totalInvoices: result.totalInvoices,
        totalPaid: result.totalPaid,
      },
    });
    break;
    case "trainer-performance":
  setData({
    title: "Trainer Performance",

    columns: [
      { key: "name", label: "Trainer" },
      { key: "totalBatches", label: "Batches" },
      { key: "totalStudents", label: "Students" },
    ],

    rows: result ?? [],

    chart: (result ?? []).map((trainer: any) => ({
      label: trainer.name,
      value: trainer.totalStudents,
    })),

    summary: {
      TotalTrainers: (result ?? []).length,
    },
  });
  break;

case "batch-utilization":
  setData({
    title: "Batch Utilization",

    columns: [
      { key: "name", label: "Batch" },
      { key: "capacity", label: "Capacity" },
      { key: "currentEnrollment", label: "Enrolled" },
      { key: "utilizationPercentage", label: "Utilization %" },
    ],

    rows: result.batches ?? [],

    chart: (result.branchBreakdown ?? []).map((item: any) => ({
      label: item.branchId,
      value: item.utilization,
    })),

    summary: {
      TotalBatches: result.totalBatches,
      TotalCapacity: result.totalCapacity,
      TotalEnrolled: result.totalEnrolled,
      OverallUtilization: result.overallUtilization,
    },
  });
  break;
case "revenue":
  setData({
    title: "Revenue Report",

    columns: [
      { key: "status", label: "Status" },
      { key: "count", label: "Count" },
    ],

    rows: result.statusBreakdown ?? [],

    chart: (result.monthlyTrend ?? []).map((item: any) => ({
      label: item.month,
      value: item.amount,
    })),

    summary: {
      TotalRevenue: result.totalRevenue,
      TotalPaid: result.totalPaid,
      TotalInvoices: result.totalInvoices,
    },
  });
  break;
  case "conversion":
  setData({
    title: "Conversion Report",

    columns: [
      { key: "source", label: "Source" },
      { key: "count", label: "Count" },
    ],

    rows: result.sourceBreakdown ?? [],

    chart: (result.monthlyTrend ?? []).map((item: any) => ({
      label: item.month,
      value: item.count,
    })),

    summary: {
      TotalLeads: result.totalLeads,
      ConvertedLeads: result.convertedLeads,
      ConversionRate: result.conversionRate,
    },
  });
  break;
  default:
    setData(result as any);
}
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load report";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [type, params]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useReportExport() {
  const [exporting, setExporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const exportReport = async (
    type: ReportType,
    params: ReportQueryParams & { format: ExportFormat },
  ) => {
    setExporting(true);
    setProgress(0);
    try {
      const blob = await reportsService.exportReport(type, params, setProgress);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-report.${params.format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
      throw err;
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return { exporting, progress, exportReport };
}
