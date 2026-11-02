import { apiClient } from "./api-client";
import type { ApiResponse, PaginatedData } from "./types";

export type EnrollmentStatus = "active" | "paused" | "cancelled" | "completed";

export interface Enrollment {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  studentName: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseName: string;
  status: EnrollmentStatus;
  startDate: string;
  endDate: string;
  fee: number;
  feePlanId?: string;
  feePlanName?: string;
  feePlanAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnrollmentRequest {
  studentId: string;
  batchId: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
  fee?: number;
  feePlanId?: string;
  remarks?: string;
}

export interface UpdateEnrollmentRequest {
  batchId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
  fee?: number;
  feePlanId?: string;
}

export interface EnrollmentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EnrollmentStatus;
  batchId?: string;
  courseId?: string;
  studentId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

interface RawEnrollment {
  id: string;
  tenantId: string;
  branchId: string | null;
  studentId: string;
  batchId: string;
  status: string;
  startDate: string;
  endDate: string;
  fee: string | number | null;
  feePlanId?: string | null;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string; email: string | null; phone: string };
  batch: { id: string; name: string; course: { id: string; name: string } | null };
  feePlan?: { id: string; name: string; totalAmount: number; currency: string } | null;
}

function mapEnrollment(raw: RawEnrollment): Enrollment {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    branchId: raw.branchId ?? "",
    studentId: raw.studentId,
    studentName: raw.student?.name ?? "",
    batchId: raw.batchId,
    batchName: raw.batch?.name ?? "",
    courseId: raw.batch?.course?.id ?? "",
    courseName: raw.batch?.course?.name ?? "",
    status: raw.status.toLowerCase() as EnrollmentStatus,
    startDate: raw.startDate,
    endDate: raw.endDate,
    fee: Number(raw.fee) || 0,
    feePlanId: raw.feePlanId ?? undefined,
    feePlanName: raw.feePlan?.name ?? undefined,
    feePlanAmount: raw.feePlan ? Number(raw.feePlan.totalAmount) : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function getEnrollments(
  params?: EnrollmentListParams,
): Promise<ApiResponse<PaginatedData<Enrollment>>> {
  const response = await apiClient.get<ApiResponse<RawEnrollment[]>>(
    "/enrollments",
    { params },
  );
  const { data, meta } = response.data;
  const items = (data ?? []).map(mapEnrollment);
  return {
    httpStatusCode: response.data.httpStatusCode,
    message: response.data.message,
    timestamp: response.data.timestamp,
    data: {
      items,
      total: meta?.total ?? items.length,
      page: meta?.page ?? 1,
      pageSize: meta?.pageSize ?? items.length,
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

export async function getEnrollment(
  id: string,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.get<ApiResponse<RawEnrollment>>(
    `/enrollments/${id}`,
  );
  const raw = response.data.data;
  return {
    ...response.data,
    data: mapEnrollment(raw),
  };
}

export async function createEnrollment(
  data: CreateEnrollmentRequest,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.post<ApiResponse<Enrollment>>(
    "/enrollments",
    data,
  );
  return response.data;
}

export async function updateEnrollment(
  id: string,
  data: UpdateEnrollmentRequest,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.patch<ApiResponse<Enrollment>>(
    `/enrollments/${id}`,
    data,
  );
  return response.data;
}

export async function pauseEnrollment(
  id: string,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.post<ApiResponse<Enrollment>>(
    `/enrollments/${id}/pause`,
  );
  return response.data;
}

export async function resumeEnrollment(
  id: string,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.post<ApiResponse<Enrollment>>(
    `/enrollments/${id}/resume`,
  );
  return response.data;
}

export async function reactivateEnrollment(
  id: string,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.post<ApiResponse<Enrollment>>(
    `/enrollments/${id}/reactivate`,
  );
  return response.data;
}

export async function cancelEnrollment(
  id: string,
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.post<ApiResponse<Enrollment>>(
    `/enrollments/${id}/cancel`,
  );
  return response.data;
}

export async function transferEnrollment(
  id: string,
  data: { toBatchId: string; reason: string },
): Promise<ApiResponse<Enrollment>> {
  const response = await apiClient.post<ApiResponse<Enrollment>>(
    `/enrollments/${id}/transfer`,
    data,
  );
  return response.data;
}
