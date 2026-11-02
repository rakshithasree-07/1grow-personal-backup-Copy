import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  branches: { id: string; name: string }[];
  primaryBranch: { id: string; name: string } | null;
}

export interface StaffQuery {
  search?: string;
  branchId?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface TenantUserQuery {
  search?: string;
  role?: string;
  status?: string;
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

export async function getStaff(
  query?: StaffQuery,
): Promise<ApiResponse<PaginatedResponse<StaffMember>>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<StaffMember>>>(
    "/rbac/staff",
    { params: query },
  );
  return data;
}

export async function getTenantUsers(
  query?: TenantUserQuery,
): Promise<ApiResponse<StaffMember[]>> {
  const { data } = await apiClient.get<ApiResponse<StaffMember[]>>(
    "/rbac/tenant-users",
    { params: query },
  );
  return data;
}

export async function getUser(id: string): Promise<ApiResponse<StaffMember & { userRoleMappings?: unknown[] }>> {
  const { data } = await apiClient.get<ApiResponse<StaffMember & { userRoleMappings?: unknown[] }>>(
    `/rbac/users/${id}`,
  );
  return data;
}

export async function updateUserStatus(id: string, status: string): Promise<ApiResponse<StaffMember>> {
  const { data } = await apiClient.put<ApiResponse<StaffMember>>(
    `/rbac/users/${id}/status`,
    { status },
  );
  return data;
}

export async function updateUserRole(id: string, role: string): Promise<ApiResponse<StaffMember>> {
  const { data } = await apiClient.put<ApiResponse<StaffMember>>(
    `/rbac/users/${id}/role`,
    { role },
  );
  return data;
}

export async function createStaffUser(payload: {
  name: string;
  phone: string;
  email?: string;
  branchId?: string;
}): Promise<ApiResponse<{ userId: string; name: string; email: string; phone: string; status: string; inviteLink: string }>> {
  const { data } = await apiClient.post("/rbac/users/staff", payload);
  return data;
}

export async function removeUserBranch(userId: string, branchId: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete(`/rbac/users/${userId}/branches/${branchId}`);
  return data;
}
