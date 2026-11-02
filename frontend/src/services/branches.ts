import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

export interface Branch {
  id: string;
  tenantId: string;
  managerId: string | null;
  name: string;
  code: string;
  addressLine1: string | null;
  addressLine2: string | null;
  address: string;
  city: string;
  district: string | null;
  state: string;
  country: string | null;
  pincode: string;
  phone: string;
  email: string;
  whatsapp: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager?: { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null } | null;
}

export interface CreateBranchRequest {
  name: string;
  code: string;
  managerId?: string;
  addressLine1?: string;
  addressLine2?: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  country?: string;
  pincode: string;
  phone: string;
  email: string;
  whatsapp?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateBranchRequest {
  name?: string;
  code?: string;
  managerId?: string | null;
  addressLine1?: string;
  addressLine2?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateBranchStatusRequest {
  isActive: boolean;
}

export async function getBranches(pageSize = 100): Promise<ApiResponse<Branch[]>> {
  const response = await apiClient.get<ApiResponse<Branch[]>>(
    "/training/branches",
    { params: { pageSize } },
  );
  return response.data;
}

export async function createBranch(
  data: CreateBranchRequest,
): Promise<ApiResponse<Branch>> {
  const response = await apiClient.post<ApiResponse<Branch>>(
    "/training/branches",
    data,
  );
  return response.data;
}

export async function getBranch(
  id: string,
): Promise<ApiResponse<Branch>> {
  const response = await apiClient.get<ApiResponse<Branch>>(
    `/training/branches/${id}`,
  );
  return response.data;
}

export async function updateBranch(
  id: string,
  data: UpdateBranchRequest,
): Promise<ApiResponse<Branch>> {
  const response = await apiClient.patch<ApiResponse<Branch>>(
    `/training/branches/${id}`,
    data,
  );
  return response.data;
}

export async function updateBranchStatus(
  id: string,
  data: UpdateBranchStatusRequest,
): Promise<ApiResponse<Branch>> {
  const response = await apiClient.patch<ApiResponse<Branch>>(
    `/training/branches/${id}/status`,
    data,
  );
  return response.data;
}
