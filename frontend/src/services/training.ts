import { apiClient } from "./api-client";
import { toast } from "sonner";
import type { ApiResponse } from "./types";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface Course {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: 'LONG_TERM' | 'SHORT_TERM';
  duration: number | null;
  startDate: string | null;
  endDate: string | null;
  fee: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface Batch {
  id: string;
  tenantId: string;
  branchId: string | null;
  courseId: string | null;
  name: string;
  code: string;
  capacity: number;
  enrolled?: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  course?: Course | null;
  trainers?: BatchTrainer[];
  schedules?: BatchSchedule[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { enrollments?: number; trainers?: number; sessions?: number };
}

export interface BatchTrainer {
  id: string;
  batchId: string;
  trainerId: string;
  isPrimary: boolean;
  assignedAt: string;
  trainer: { id: string; name: string; email: string };
}

export interface BatchStats {
  total: number;
  statusCounts: Record<string, number>;
  totalCapacity: number;
  totalEnrolled: number;
  enrollmentRate: number;
}

export interface CourseStats {
  total: number;
  active: number;
  archived: number;
  totalBatches: number;
  categoriesCount: number;
}

export interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { batchTrainers: number };
}

export interface BatchSchedule {
  id: string;
  batchId: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  endTime: string;
  room: string | null;
  isActive: boolean;
}

export interface WeeklySchedulePattern {
  id: string;
  batchId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  batch: { id: string; name: string; course?: { id: string; name: string } | null };
}

export interface ScheduleEvent {
  id: string;
  batchId: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  batch?: { id: string; name: string; course?: { id: string; name: string } | null };
}

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  studentId: string;
  batchId: string;
  status: string;
  waitlistPosition: number | null;
  remarks: string | null;
  promotedAt: string | null;
  enrolledAt: string;
  student: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  batch?: { id: string; name: string };
}

export interface AddToWaitlistPayload {
  batchId: string;
  studentId: string;
  notes?: string;
}

export interface TrainingDocument {
  id: string;
  tenantId: string;
  studentId: string | null;
  studentName: string | null;
  type: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "ARCHIVED";
  remarks: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; name: string } | null;
}

export interface TrainingFile {
  id: string;
  tenantId: string;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  category: string | null;
  fileUrl: string | null;
  isArchived: boolean;
  createdAt: string;
}

export interface TrainingStats {
  totalPrograms: number;
  activePrograms: number;
  totalBatches: number;
  activeBatches: number;
  activeTrainers: number;
  totalStudents: number;
  enrolledStudents: number;
  waitlistCount: number;
  pendingDocuments: number;
  todayClasses: number;
  upcomingSessions: number;
  occupancyRate: number;
  attendanceRate: number;
  completionRate: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function buildQuery(params: PaginationQuery): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.sortBy) {
    search.set("sortBy", params.sortBy);
    if (params.sortDir) search.set("sortDir", params.sortDir);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* ─── Courses (Programs) ────────────────────────────────────────────────────── */

export async function getCourses(query?: PaginationQuery): Promise<ApiResponse<Course[]>> {
  const { data } = await apiClient.get<ApiResponse<Course[]>>(`/training/courses${query ? buildQuery(query) : ""}`);
  return data;
}

export async function getCourse(id: string): Promise<ApiResponse<Course>> {
  const { data } = await apiClient.get<ApiResponse<Course>>(`/training/courses/${id}`);
  return data;
}

export async function createCourse(payload: Partial<Course>): Promise<ApiResponse<Course>> {
  const { data } = await apiClient.post<ApiResponse<Course>>("/training/courses", payload);
  return data;
}

export async function updateCourse(id: string, payload: Partial<Course>): Promise<ApiResponse<Course>> {
  const { data } = await apiClient.patch<ApiResponse<Course>>(`/training/courses/${id}`, payload);
  return data;
}

export async function duplicateCourse(id: string): Promise<ApiResponse<Course>> {
  const { data } = await apiClient.post<ApiResponse<Course>>(`/training/courses/${id}/duplicate`);
  return data;
}

export async function archiveCourse(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/courses/${id}/archive`);
  return data;
}

export async function restoreCourse(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/courses/${id}/restore`);
  return data;
}

export async function getCourseStats(): Promise<ApiResponse<CourseStats>> {
  const { data } = await apiClient.get<ApiResponse<CourseStats>>("/training/courses/stats");
  return data;
}

/* ─── Batches ───────────────────────────────────────────────────────────────── */

export async function getBatches(query?: PaginationQuery): Promise<ApiResponse<Batch[]>> {
  const { data } = await apiClient.get<ApiResponse<Batch[]>>(`/training/batches${query ? buildQuery(query) : ""}`);
  return data;
}

export async function getBatch(id: string): Promise<ApiResponse<Batch>> {
  const { data } = await apiClient.get<ApiResponse<Batch>>(`/training/batches/${id}`);
  return data;
}

export async function createBatch(payload: Partial<Batch>): Promise<ApiResponse<Batch>> {
  const { data } = await apiClient.post<ApiResponse<Batch>>("/training/batches", payload);
  return data;
}

export async function updateBatch(id: string, payload: Partial<Batch>): Promise<ApiResponse<Batch>> {
  const { data } = await apiClient.patch<ApiResponse<Batch>>(`/training/batches/${id}`, payload);
  return data;
}

export async function updateBatchStatus(id: string, status: string): Promise<ApiResponse<Batch>> {
  const { data } = await apiClient.patch<ApiResponse<Batch>>(`/training/batches/${id}/status`, { status });
  return data;
}

export async function archiveBatch(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/batches/${id}/archive`);
  return data;
}

export async function restoreBatch(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/batches/${id}/restore`);
  return data;
}

export async function duplicateBatch(id: string, name?: string): Promise<ApiResponse<Batch>> {
  const { data } = await apiClient.post<ApiResponse<Batch>>(`/training/batches/${id}/duplicate`, name ? { name } : undefined);
  return data;
}

export async function getBatchStats(): Promise<ApiResponse<BatchStats>> {
  const { data } = await apiClient.get<ApiResponse<BatchStats>>("/training/batches/statistics");
  return data;
}

export async function getBatchStudents(batchId: string): Promise<ApiResponse<Array<{ id: string; studentId: string; status: string; enrolledAt: string; student: { id: string; name: string; email: string; phone: string } }>>> {
  const { data } = await apiClient.get<ApiResponse<Array<{ id: string; studentId: string; status: string; enrolledAt: string; student: { id: string; name: string; email: string; phone: string } }>>>(`/training/batches/${batchId}/students`);
  return data;
}

export async function getBatchSchedules(batchId: string): Promise<ApiResponse<BatchSchedule[]>> {
  const { data } = await apiClient.get<ApiResponse<BatchSchedule[]>>(`/training/batches/${batchId}/schedules`);
  return data;
}

export async function createBatchSchedule(batchId: string, payload: { dayOfWeek: string; startTime: string; endTime: string; room?: string }): Promise<ApiResponse<BatchSchedule>> {
  const { data } = await apiClient.post<ApiResponse<BatchSchedule>>(`/training/batches/${batchId}/schedules`, payload);
  return data;
}

export async function updateBatchSchedule(batchId: string, scheduleId: string, payload: Partial<{ dayOfWeek: string; startTime: string; endTime: string; room: string }>): Promise<ApiResponse<BatchSchedule>> {
  const { data } = await apiClient.patch<ApiResponse<BatchSchedule>>(`/training/batches/${batchId}/schedules/${scheduleId}`, payload);
  return data;
}

export async function deleteBatchSchedule(batchId: string, scheduleId: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/training/batches/${batchId}/schedules/${scheduleId}`);
  return data;
}

export async function generateBatchSessions(batchId: string, dateFrom: string, dateTo: string): Promise<ApiResponse<Array<{ date: string; startTime: string; endTime: string }>>> {
  const { data } = await apiClient.post<ApiResponse<Array<{ date: string; startTime: string; endTime: string }>>>(`/training/batches/${batchId}/schedules/generate`, { dateFrom, dateTo });
  return data;
}

export async function getBatchAttendance(batchId: string): Promise<ApiResponse<unknown>> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(`/training/batches/${batchId}/attendance`);
  return data;
}

export async function getBatchProgress(batchId: string): Promise<ApiResponse<unknown>> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(`/training/batches/${batchId}/progress`);
  return data;
}

export async function getBatchWaitlist(batchId: string): Promise<ApiResponse<Array<{ id: string; studentId: string; status: string; priority?: string; waitlistPosition?: number; enrolledAt: string; student: { id: string; name: string; email: string; phone: string } }>>> {
  const { data } = await apiClient.get<ApiResponse<Array<{ id: string; studentId: string; status: string; priority?: string; waitlistPosition?: number; enrolledAt: string; student: { id: string; name: string; email: string; phone: string } }>>>(`/training/batches/${batchId}/waitlist`);
  return data;
}

export async function getBatchCapacity(batchId: string): Promise<ApiResponse<{ capacity: number; enrolled: number; available: number; waitlistCount: number }>> {
  const { data } = await apiClient.get<ApiResponse<{ capacity: number; enrolled: number; available: number; waitlistCount: number }>>(`/training/batches/${batchId}/capacity`);
  return data;
}

/* ─── Trainers ──────────────────────────────────────────────────────────────── */

export async function getTrainers(query?: PaginationQuery): Promise<ApiResponse<Trainer[]>> {
  const { data } = await apiClient.get<ApiResponse<Trainer[]>>(`/training/trainers${query ? buildQuery(query) : ""}`);
  return data;
}

export async function getTrainer(id: string): Promise<ApiResponse<Trainer>> {
  const { data } = await apiClient.get<ApiResponse<Trainer>>(`/training/trainers/${id}`);
  return data;
}

export async function createTrainer(payload: Partial<Trainer>): Promise<ApiResponse<Trainer>> {
  const { data } = await apiClient.post<ApiResponse<Trainer>>("/training/trainers", payload);
  return data;
}

export async function updateTrainer(id: string, payload: Partial<Trainer>): Promise<ApiResponse<Trainer>> {
  const { data } = await apiClient.patch<ApiResponse<Trainer>>(`/training/trainers/${id}`, payload);
  return data;
}

export async function updateTrainerStatus(id: string, isActive: boolean): Promise<ApiResponse<Trainer>> {
  const { data } = await apiClient.patch<ApiResponse<Trainer>>(`/training/trainers/${id}/status`, { isActive });
  return data;
}

export async function archiveTrainer(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/trainers/${id}/archive`);
  return data;
}

export async function restoreTrainer(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/trainers/${id}/restore`);
  return data;
}

export async function getTrainerBatches(trainerId: string): Promise<ApiResponse<Batch[]>> {
  const { data } = await apiClient.get<ApiResponse<Array<{ batch: Batch }>>>(`/training/trainers/${trainerId}/batches`);
  return { ...data, data: data.data?.map((bt) => bt.batch) ?? [] };
}

export async function getTrainerSchedule(trainerId: string): Promise<ApiResponse<ScheduleEvent[]>> {
  const { data } = await apiClient.get<ApiResponse<ScheduleEvent[]>>(`/training/trainers/${trainerId}/schedule`);
  return data;
}

export async function getTrainerAttendance(trainerId: string): Promise<ApiResponse<unknown>> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(`/training/trainers/${trainerId}/attendance`);
  return data;
}

export async function getTrainerWorkload(trainerId: string): Promise<ApiResponse<{ batchCount: number; upcomingSessions: number; totalStudents: number }>> {
  const { data } = await apiClient.get<ApiResponse<{ batchCount: number; upcomingSessions: number; totalStudents: number }>>(`/training/trainers/${trainerId}/workload`);
  return data;
}

export async function assignTrainerToBatch(trainerId: string, batchId: string, isPrimary?: boolean): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/batches/${batchId}/assign-trainer`, { trainerId, isPrimary });
  return data;
}

export async function removeTrainerFromBatch(trainerId: string, batchId: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/batches/${batchId}/remove-trainer`, { trainerId });
  return data;
}

/* ─── Schedule ──────────────────────────────────────────────────────────────── */

export async function getSchedules(query?: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; batchId?: string; status?: string }): Promise<ApiResponse<ScheduleEvent[]>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query?.dateTo) params.set("dateTo", query.dateTo);
  if (query?.batchId) params.set("batchId", query.batchId);
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  const { data } = await apiClient.get<ApiResponse<ScheduleEvent[]>>(`/training/schedules${qs ? `?${qs}` : ""}`);
  return data;
}

export async function getSchedule(id: string): Promise<ApiResponse<ScheduleEvent>> {
  const { data } = await apiClient.get<ApiResponse<ScheduleEvent>>(`/training/schedules/${id}`);
  return data;
}

export interface CalendarResponse {
  sessions: Record<string, ScheduleEvent[]>;
  weeklyPatterns: WeeklySchedulePattern[];
}

export async function getCalendar(query?: { month?: number; year?: number; batchId?: string }): Promise<ApiResponse<CalendarResponse>> {
  const params = new URLSearchParams();
  if (query?.month) params.set("month", String(query.month));
  if (query?.year) params.set("year", String(query.year));
  if (query?.batchId) params.set("batchId", query.batchId);
  const qs = params.toString();
  const { data } = await apiClient.get<ApiResponse<CalendarResponse>>(`/training/schedules/calendar${qs ? `?${qs}` : ""}`);
  return data;
}

export async function createSchedule(payload: Partial<ScheduleEvent>): Promise<ApiResponse<ScheduleEvent>> {
  const { data } = await apiClient.post<ApiResponse<ScheduleEvent>>("/training/schedules", payload);
  return data;
}

export async function updateSchedule(id: string, payload: Partial<ScheduleEvent>): Promise<ApiResponse<ScheduleEvent>> {
  const { data } = await apiClient.patch<ApiResponse<ScheduleEvent>>(`/training/schedules/${id}`, payload);
  return data;
}

export async function cancelSchedule(id: string, payload?: { reason?: string }): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/schedules/${id}/cancel`, payload ?? {});
  return data;
}

export async function rescheduleEvent(id: string, payload: { date?: string; startTime?: string; endTime?: string; reason?: string }): Promise<ApiResponse<ScheduleEvent>> {
  const { data } = await apiClient.post<ApiResponse<ScheduleEvent>>(`/training/schedules/${id}/reschedule`, payload);
  return data;
}

export async function getTodaySchedule(): Promise<ApiResponse<ScheduleEvent[]>> {
  const { data } = await apiClient.get<ApiResponse<ScheduleEvent[]>>("/training/schedules/today");
  return data;
}

export async function getUpcomingSchedule(): Promise<ApiResponse<ScheduleEvent[]>> {
  const { data } = await apiClient.get<ApiResponse<ScheduleEvent[]>>("/training/schedules/upcoming");
  return data;
}

/* ─── Waitlist ──────────────────────────────────────────────────────────────── */

export async function getWaitlist(query?: { page?: number; pageSize?: number; batchId?: string; studentId?: string }): Promise<ApiResponse<WaitlistEntry[]>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.batchId) params.set("batchId", query.batchId);
  if (query?.studentId) params.set("studentId", query.studentId);
  const qs = params.toString();
  const { data } = await apiClient.get<ApiResponse<WaitlistEntry[]>>(`/training/waitlists${qs ? `?${qs}` : ""}`);
  return data;
}

export async function getWaitlistEntry(id: string): Promise<ApiResponse<WaitlistEntry>> {
  const { data } = await apiClient.get<ApiResponse<WaitlistEntry>>(`/training/waitlists/${id}`);
  return data;
}

export async function createWaitlistEntry(payload: AddToWaitlistPayload): Promise<ApiResponse<WaitlistEntry>> {
  const { data } = await apiClient.post<ApiResponse<WaitlistEntry>>("/training/waitlists", payload);
  return data;
}

export async function updateWaitlistEntry(id: string, payload: { remarks?: string }): Promise<ApiResponse<WaitlistEntry>> {
  const { data } = await apiClient.patch<ApiResponse<WaitlistEntry>>(`/training/waitlists/${id}`, payload);
  return data;
}

export async function promoteWaitlistEntry(id: string): Promise<ApiResponse<WaitlistEntry>> {
  const { data } = await apiClient.post<ApiResponse<WaitlistEntry>>(`/training/waitlists/${id}/promote`);
  return data;
}

export async function withdrawWaitlistEntry(id: string): Promise<ApiResponse<WaitlistEntry>> {
  const { data } = await apiClient.post<ApiResponse<WaitlistEntry>>(`/training/waitlists/${id}/withdraw`);
  return data;
}

/* ─── Documents ─────────────────────────────────────────────────────────────── */

export async function getDocuments(query?: PaginationQuery & { studentId?: string; type?: string }): Promise<ApiResponse<TrainingDocument[]>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.studentId) params.set("studentId", query.studentId);
  if (query?.type) params.set("type", query.type);
  const qs = params.toString();
  const { data } = await apiClient.get<ApiResponse<TrainingDocument[]>>(`/training/documents${qs ? `?${qs}` : ""}`);
  return data;
}

export async function getDocument(id: string): Promise<ApiResponse<TrainingDocument>> {
  const { data } = await apiClient.get<ApiResponse<TrainingDocument>>(`/training/documents/${id}`);
  return data;
}

export async function createDocument(payload: { studentId?: string; type?: string; name: string; fileUrl?: string; fileSize?: number; mimeType?: string }): Promise<ApiResponse<TrainingDocument>> {
  const { data } = await apiClient.post<ApiResponse<TrainingDocument>>("/training/documents", payload);
  return data;
}

export async function updateDocument(id: string, payload: Partial<TrainingDocument>): Promise<ApiResponse<TrainingDocument>> {
  const { data } = await apiClient.patch<ApiResponse<TrainingDocument>>(`/training/documents/${id}`, payload);
  return data;
}

export async function uploadDocument(formData: FormData): Promise<ApiResponse<TrainingDocument>> {
  const { data } = await apiClient.post<ApiResponse<TrainingDocument>>("/training/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function verifyDocument(id: string): Promise<ApiResponse<TrainingDocument>> {
  const { data } = await apiClient.post<ApiResponse<TrainingDocument>>(`/training/documents/${id}/verify`, { status: "VERIFIED" });
  return data;
}

export async function rejectDocument(id: string, notes: string): Promise<ApiResponse<TrainingDocument>> {
  const { data } = await apiClient.post<ApiResponse<TrainingDocument>>(`/training/documents/${id}/verify`, { status: 'REJECTED', notes });
  return data;
}

export async function archiveDocument(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/documents/${id}/archive`);
  return data;
}

export async function restoreDocument(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/documents/${id}/restore`);
  return data;
}

/* ─── Files ─────────────────────────────────────────────────────────────────── */

export async function getFiles(query?: PaginationQuery & { category?: string; isArchived?: boolean }): Promise<ApiResponse<TrainingFile[]>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.search) params.set("search", query.search);
  if (query?.category) params.set("category", query.category);
  if (query?.isArchived !== undefined) params.set("isArchived", String(query.isArchived));
  const qs = params.toString();
  const { data } = await apiClient.get<ApiResponse<TrainingFile[]>>(`/training/files${qs ? `?${qs}` : ""}`);
  return data;
}

export async function uploadFile(file: File, category: string): Promise<ApiResponse<TrainingFile>> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  const { data } = await apiClient.post<ApiResponse<TrainingFile>>("/training/files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function archiveFile(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/files/${id}/archive`);
  return data;
}

export async function restoreFile(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/training/files/${id}/restore`);
  return data;
}

export function getFileDownloadUrl(id: string): string {
  return `${apiClient.defaults.baseURL}/training/files/${id}/download`;
}

export function getDocumentDownloadUrl(id: string): string {
  return `${apiClient.defaults.baseURL}/training/documents/${id}/download`;
}

export async function downloadFile(id: string, type: "files" | "documents", filename: string): Promise<void> {
  try {
    const response = await apiClient.get(`/training/${type}/${id}/download`, { responseType: "blob" });
    const disposition = response.headers["content-disposition"];
    let name = filename;
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"'\n;]+)/i);
      if (match) name = decodeURIComponent(match[1]);
    }
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    toast.error(message);
  }
}

export async function getFileBlobUrl(id: string, type: "files" | "documents"): Promise<string> {
  const response = await apiClient.get(`/training/${type}/${id}/download`, { responseType: "blob" });
  const blob = new Blob([response.data]);
  return URL.createObjectURL(blob);
}

/* ─── Batch Enrollments ─────────────────────────────────────────────────────── */

export async function enrollStudentInBatch(
  batchId: string,
  payload: { studentId?: string; name?: string; phone?: string; email?: string },
): Promise<ApiResponse<unknown>> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(`/training/batches/${batchId}/enroll`, payload);
  return data;
}

export async function bulkEnrollStudents(
  batchId: string,
  studentIds: string[],
): Promise<ApiResponse<{ enrolled: Array<{ studentId: string; name: string; status: string }>; skipped: Array<{ studentId: string; reason: string }> }>> {
  const { data } = await apiClient.post(`/training/batches/${batchId}/bulk-enroll`, { studentIds });
  return data;
}

export async function removeStudentFromBatch(batchId: string, studentId: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/training/batches/${batchId}/students/${studentId}`);
  return data;
}

/* ─── Dashboard Stats ───────────────────────────────────────────────────────── */

export async function getTrainingStats(): Promise<ApiResponse<TrainingStats>> {
  const { data } = await apiClient.get<ApiResponse<TrainingStats>>("/training/stats");
  return data;
}
