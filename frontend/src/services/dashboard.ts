import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";
import type { DashboardMetric } from "@/types/dashboard";

export interface DashboardSummary {
  totalStudents: number;
  activeBranches: number;
  revenueMTD: number;
  pendingPayments: number;
  activeBatches: number;
  totalEnrollments: number;
}

export interface DashboardMetrics {
  metrics?: DashboardMetric[];
  newStudentsThisMonth: number;
  totalLeads: number;
  newLeadsThisMonth: number;
  convertedLeads: number;
  conversionRate: number;
  attendanceRate: number;
  totalAttendanceRecords: number;
  avgBatchUtilization: number;
}

export interface UpcomingSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  status: string;
  batch: { id: string; name: string } | null;
  attendanceSession: { id: string } | null;
}

export interface UpcomingTask {
  id: string;
  title: string;
  type: string;
  status: string;
  dueDate: string | null;
  batch: { id: string; name: string } | null;
}

export interface UpcomingFollowup {
  id: string;
  name: string;
  phone: string;
  course: string | null;
  status: string;
  nextFollowUp: string | null;
}

export interface DashboardUpcoming {
  sessions: UpcomingSession[];
  tasks: UpcomingTask[];
  followups: UpcomingFollowup[];
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  student: { id: string; name: string; phone: string } | null;
  status: string;
}

export interface OverdueTask {
  id: string;
  title: string;
  type: string;
  status: string;
  dueDate: string | null;
  batch: { id: string; name: string } | null;
}

export interface PendingFollowup {
  id: string;
  name: string;
  phone: string;
  course: string | null;
  status: string;
  nextFollowUp: string | null;
  createdAt: string;
}

export interface DashboardAlerts {
  overdueInvoices: OverdueInvoice[];
  pendingFollowups: PendingFollowup[];
  overdueTasks: OverdueTask[];
}

export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>("/dashboard/summary");
  return response.data;
}

export async function getDashboardMetrics(params?: { branchId?: string }): Promise<ApiResponse<DashboardMetrics>> {
  const response = await apiClient.get<ApiResponse<DashboardMetrics>>("/dashboard/metrics", { params });
  return response.data;
}

export async function getDashboardUpcoming(): Promise<ApiResponse<DashboardUpcoming>> {
  const response = await apiClient.get<ApiResponse<DashboardUpcoming>>("/dashboard/upcoming");
  return response.data;
}

export async function getDashboardAlerts(): Promise<ApiResponse<DashboardAlerts>> {
  const response = await apiClient.get<ApiResponse<DashboardAlerts>>("/dashboard/alerts");
  return response.data;
}

/* ─── Per-industry Dashboard ───────────────────────────────────────────── */

export interface IndustryStats {
  students?: number;
  activeBatches?: number;
  totalEnrollments?: number;
  newStudentsThisMonth?: number;
  totalBookings?: number;
  activeBookings?: number;
  totalItems?: number;
  pendingReturns?: number;
  totalEvents?: number;
  upcomingEvents?: number;
  revenueMTD?: number;
}

export interface DashboardIndustry {
  industries: string[];
  leads: { totalLeads: number; convertedLeads: number; newLeadsThisMonth: number };
  byIndustry: Record<string, IndustryStats>;
}

export async function getDashboardIndustry(): Promise<ApiResponse<DashboardIndustry>> {
  const response = await apiClient.get<ApiResponse<DashboardIndustry>>("/dashboard/industry");
  return response.data;
}

/* ─── Student Dashboard ────────────────────────────────────────────────── */

export interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: string;
}

export interface StudentEnrollment {
  id: string;
  batchName: string;
  courseName: string;
  feePlanName: string;
  feePlanAmount: number;
}

export interface StudentRecentPayment {
  id: string;
  amount: number;
  invoiceNumber: string;
  createdAt: string;
}

export interface StudentDashboardData {
  enrolledCourses: number;
  totalInvoices: number;
  upcomingBills: StudentInvoice[];
  overdueBills: StudentInvoice[];
  paidBills: StudentInvoice[];
  recentPayments: StudentRecentPayment[];
  enrollments: StudentEnrollment[];
}

export async function getStudentDashboard(): Promise<ApiResponse<StudentDashboardData>> {
  const response = await apiClient.get<ApiResponse<StudentDashboardData>>("/dashboard/student");
  return response.data;
}
