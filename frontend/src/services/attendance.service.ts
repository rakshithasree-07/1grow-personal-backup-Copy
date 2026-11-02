import { apiClient } from "./api-client";
import type {
  AttendanceBatch,
  AttendanceListParams,
  AttendanceSession,
  AttendanceSummary,
  AttendanceSummaryParams,
  BulkMarkAttendancePayload,
  CreateAttendancePayload,
  PaginatedMeta,
  UpdateAttendancePayload,
} from "@/types/attendance";

interface ApiEnvelope<T, M = never> {
  httpStatusCode: number;
  message: string;
  data: T;
  meta?: M;
  timestamp: string;
}

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data;
}

function unwrapPaginated<T>(
  response: { data: ApiEnvelope<T[], PaginatedMeta> },
): { data: T[]; meta: PaginatedMeta } {
  return {
    data: response.data.data ?? [],
    meta: response.data.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  };
}

export const attendanceService = {
  async list(params: AttendanceListParams = {}) {
    const response = await apiClient.get<ApiEnvelope<AttendanceSession[], PaginatedMeta>>(
      "/attendance",
      { params },
    );
    return unwrapPaginated<AttendanceSession>(response);
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiEnvelope<AttendanceSession>>(`/attendance/${id}`);
    return unwrap(response);
  },

  async create(payload: CreateAttendancePayload) {
    const response = await apiClient.post<ApiEnvelope<AttendanceSession>>("/attendance", payload);
    return unwrap(response);
  },

  async update(id: string, payload: UpdateAttendancePayload) {
    const response = await apiClient.patch<ApiEnvelope<AttendanceSession>>(
      `/attendance/${id}`,
      payload,
    );
    return unwrap(response);
  },

  async bulkMark(payload: BulkMarkAttendancePayload) {
    const response = await apiClient.post<ApiEnvelope<AttendanceSession>>(
      "/attendance/bulk",
      payload,
    );
    return unwrap(response);
  },

  async getSummary(params: AttendanceSummaryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<AttendanceSummary>>("/attendance/summary", {
      params,
    });
    return unwrap(response);
  },

  async getStudentsByBatch(batchId: string) {
    const response = await apiClient.get<ApiEnvelope<Array<{ studentId: string; studentName: string; phone: string | null }>>>(`/attendance/students/${batchId}`);
    return unwrap(response);
  },

  async getBatches(branchId?: string) {
    const params: Record<string, string> = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get<ApiEnvelope<AttendanceBatch[]>>("/attendance/batches", {
      params,
    });
    return unwrap(response);
  },


};
