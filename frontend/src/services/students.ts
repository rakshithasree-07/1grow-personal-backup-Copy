import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  parentName: string | null;
  parentPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  photoUrl: string | null;
  medicalNotes: string | null;
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  enrollments?: {
    id: string;
    batchId: string;
    status: string;
    enrolledAt: string;
    batch: {
      id: string;
      name: string;
      status?: string;
      branchId: string | null;
      branch: { id: string; name: string } | null;
      course?: { id: string; name: string; code: string | null } | null;
    };
    feePlan?: { id: string; name: string; feeType: string; totalAmount: number } | null;
  }[];
  progress?: {
    id: string;
    module: string | null;
    percentage: number;
    grade: string | null;
    assessedAt: string;
    batch?: { id: string; name: string } | null;
    trainer?: { id: string; name: string } | null;
  }[];
  attendance?: {
    id: string;
    status: string;
    session: { id: string; date: string; batchId: string | null };
  }[];
  invoices?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    issueDate: string;
    dueDate: string;
    paidAt: string | null;
  }[];
  attendanceSummary?: {
    total: number;
    present: number;
    absent: number;
    rate: number;
  };
}

export interface StudentQuery {
  search?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export async function createStudent(payload: { name: string; phone: string; email?: string }): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.post<ApiResponse<Student>>("/students", payload);
  return data;
}

export async function getStudents(
  query?: StudentQuery,
): Promise<ApiResponse<Student[]>> {
  const { data } = await apiClient.get<ApiResponse<Student[]>>(
    "/students",
    { params: query },
  );
  return data;
}

export async function getStudent(id: string): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.get<ApiResponse<Student>>(
    `/students/${id}`,
  );
  return data;
}

export async function updateStudent(id: string, payload: Partial<Student>): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.patch<ApiResponse<Student>>(
    `/students/${id}`,
    payload,
  );
  return data;
}

export async function inviteStudent(id: string): Promise<ApiResponse<{
  userId: string;
  email: string;
  status: string;
  inviteLink: string;
}>> {
  const { data } = await apiClient.post(`/students/${id}/invite`);
  return data;
}

// ─── My Courses ──────────────────────────────────────────────────────────────

export interface MyCourseSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string | null;
}

export interface MyCourseInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

export interface MyCourseEnrollment {
  id: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseName: string;
  courseCode: string | null;
  feePlanId: string | null;
  feePlanName: string | null;
  feePlanAmount: number;
  currency: string;
  upcomingSessions: MyCourseSession[];
}

export interface MyCoursesResponse {
  enrollments: MyCourseEnrollment[];
  invoices: MyCourseInvoice[];
}

export async function getMyCourses(): Promise<ApiResponse<MyCoursesResponse>> {
  const { data } = await apiClient.get<ApiResponse<MyCoursesResponse>>("/dashboard/my-courses");
  return data;
}
