import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  industry: string[];
  status: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  tagline: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  gstin: string | null;
  pan: string | null;
  msmeUdyamNumber: string | null;
  invoicePrefix: string | null;
  taxEnabled: boolean;
  taxPercentage: number | null;
  billingEmail: string | null;
  billingPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  tenantCode: string | null;
  legalDocumentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimTenantRequest {
  businessName: string;
  industry?: string;
  phone?: string;
  email?: string;
}

export interface ClaimTenantResponse {
  token: {
    accessToken: string;
    user: {
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
    };
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    industry: string[];
  };
  branch: {
    id: string;
    name: string;
    isDefault: boolean;
  };
}

export interface UpdateTenantRequest {
  name?: string;
  legalName?: string;
  industry?: string;
  industries?: string[];
  logoUrl?: string;
  coverImageUrl?: string;
  tagline?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  gstin?: string;
  pan?: string;
  msmeUdyamNumber?: string;
  invoicePrefix?: string;
  taxEnabled?: boolean;
  taxPercentage?: number;
  billingEmail?: string;
  billingPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  legalDocumentUrl?: string;
}

export async function claimTenant(
  data: ClaimTenantRequest,
): Promise<ApiResponse<ClaimTenantResponse>> {
  const response = await apiClient.post<ApiResponse<ClaimTenantResponse>>(
    "/training/onboarding/claim",
    data,
  );
  return response.data;
}

export async function getTenant(): Promise<ApiResponse<Tenant>> {
  const response = await apiClient.get<ApiResponse<Tenant>>(
    "/training/tenant",
  );
  return response.data;
}

export async function updateTenant(
  data: UpdateTenantRequest,
): Promise<ApiResponse<Tenant>> {
  const response = await apiClient.patch<ApiResponse<Tenant>>(
    "/training/tenant",
    data,
  );
  return response.data;
}
