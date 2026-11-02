import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

// ── Types ──────────────────────────────────────────────────

export interface OnboardingSession {
  id: string;
  userId: string;
  selectedRole: string | null;
  currentStep: string;
  completedSections: string[];
  isCompleted: boolean;
  completionPct: number;
  lastVisitedStep: string | null;
  skippedFields: string[];
  completedAt: string | null;
  lastActivityAt: string | null;
  deviceInfo: string | null;
  metadata: Record<string, unknown> | null;
}

export interface OnboardingProgress {
  session: OnboardingSession;
  user: {
    status: string;
    role: string;
    email: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    tenantId: string | null;
  };
  isFirstLogin: boolean;
}

export interface SelectRoleRequest {
  role: string;
}

export interface ProfileSetupRequest {
  fullName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  bio?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  aadhaarDocUrl?: string;
  panDocUrl?: string;
  businessDocUrl?: string;
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  employmentType?: string;
  qualifications?: string;
  experienceYears?: number;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  guardianEmail?: string;
  schoolName?: string;
  grade?: string;
}

export interface TenantSetupRequest {
  businessName: string;
  legalName?: string;
  businessType?: string;
  businessTypes?: string[];
  logo?: string;
  coverImage?: string;
  tagline?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  legalDocumentUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  businessHours?: Record<string, unknown>;
}

export interface SearchTenantRequest {
  name?: string;
  businessType?: string;
  location?: string;
  tenantCode?: string;
  phone?: string;
}

export interface SearchTenantResult {
  id: string;
  name: string;
  slug: string;
  tenantCode: string | null;
  industry: string[];
  status: string;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  description: string | null;
  branches: { id: string; name: string; city: string | null; state: string | null; isDefault: boolean }[];
}

export interface RequestAccessPayload {
  tenantId: string;
  preferredBranchId?: string;
  notes?: string;
  skills?: string[];
  specialization?: string;
  courseId?: string;
}

export interface InviteBusinessOwnerPayload {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  notes?: string;
}

export interface AccessRequest {
  id: string;
  tenantId: string;
  branchId: string | null;
  userId: string;
  role: string;
  status: string;
  notes: string | null;
  preferredBranchId: string | null;
  skills: string[];
  specialization: string | null;
  courseId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string | null; role: string };
  tenant: { id: string; name: string };
  branch: { id: string; name: string } | null;
  reviewer: { id: string; name: string; email: string } | null;
}

export interface ApproveAccessRequest {
  requestId: string;
  branchId?: string;
  role?: string;
}

export interface RejectAccessRequest {
  requestId: string;
  reason?: string;
}

export interface TenantClaimRequest {
  id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface TenantInvitationResult {
  invitationId: string;
  suggestedRole: string;
  expiresAt: string;
  invitedAt: string;
  tenant: SearchTenantResult;
}

// ── API Functions ──────────────────────────────────────────

export async function getOnboardingProgress(): Promise<ApiResponse<OnboardingProgress>> {
  const response = await apiClient.get<ApiResponse<OnboardingProgress>>("/onboarding/progress");
  return response.data;
}

export async function selectRole(data: SelectRoleRequest): Promise<ApiResponse<{ role: string; nextStep: string }>> {
  const response = await apiClient.post<ApiResponse<{ role: string; nextStep: string }>>("/onboarding/role", data);
  return response.data;
}

export async function setupProfile(data: ProfileSetupRequest): Promise<ApiResponse<{ nextStep: string; completed?: boolean; redirectTo?: string }>> {
  const response = await apiClient.post<ApiResponse<{ nextStep: string; completed?: boolean; redirectTo?: string }>>("/onboarding/profile", data);
  return response.data;
}

export async function saveSection(section: string, data: Record<string, unknown>): Promise<ApiResponse<{ section: string; saved: boolean }>> {
  const response = await apiClient.post<ApiResponse<{ section: string; saved: boolean }>>("/onboarding/save-section", { section, data });
  return response.data;
}

export async function setupTenant(data: TenantSetupRequest): Promise<ApiResponse<{
  tenant: { id: string; name: string; slug: string; code: string };
  headOffice: { id: string; name: string };
  subscription: { status: string; trialDays: number };
  token: { accessToken: string; user: Record<string, unknown> };
  redirectTo: string;
}>> {
  const response = await apiClient.post<ApiResponse<{
    tenant: { id: string; name: string; slug: string; code: string };
    headOffice: { id: string; name: string };
    subscription: { status: string; trialDays: number };
    token: { accessToken: string; user: Record<string, unknown> };
    redirectTo: string;
  }>>("/onboarding/tenant", data);
  return response.data;
}

export async function searchTenants(data: SearchTenantRequest): Promise<ApiResponse<SearchTenantResult[]>> {
  const response = await apiClient.post<ApiResponse<SearchTenantResult[]>>("/onboarding/tenants/search", data);
  return response.data;
}

export async function requestAccess(data: RequestAccessPayload): Promise<ApiResponse<{ status: string; tokens?: { accessToken: string; refreshToken: string; user: Record<string, unknown> } }>> {
  const response = await apiClient.post<ApiResponse<{ status: string; tokens?: { accessToken: string; refreshToken: string; user: Record<string, unknown> } }>>("/onboarding/request-access", data);
  return response.data;
}

export async function inviteBusinessOwner(data: InviteBusinessOwnerPayload): Promise<ApiResponse<{ id: string; status: string }>> {
  const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>("/onboarding/invite-owner", data);
  return response.data;
}

export async function getMyInviteRequests(): Promise<ApiResponse<TenantClaimRequest[]>> {
  const response = await apiClient.get<ApiResponse<TenantClaimRequest[]>>("/onboarding/my-invite-requests");
  return response.data;
}

export async function completeClientOnboarding(): Promise<ApiResponse<{ redirectTo: string }>> {
  const response = await apiClient.post<ApiResponse<{ redirectTo: string }>>("/onboarding/complete-client");
  return response.data;
}

export async function listAccessRequests(status?: string): Promise<ApiResponse<AccessRequest[]>> {
  const params = status ? { status } : {};
  const response = await apiClient.get<ApiResponse<AccessRequest[]>>("/onboarding/access-requests", { params });
  return response.data;
}

export async function approveAccessRequest(data: ApproveAccessRequest): Promise<ApiResponse<{ status: string }>> {
  const response = await apiClient.post<ApiResponse<{ status: string }>>("/onboarding/access-requests/approve", data);
  return response.data;
}

export async function rejectAccessRequest(data: RejectAccessRequest): Promise<ApiResponse<{ status: string }>> {
  const response = await apiClient.post<ApiResponse<{ status: string }>>("/onboarding/access-requests/reject", data);
  return response.data;
}

export async function getMyAccessRequests(): Promise<ApiResponse<AccessRequest[]>> {
  const response = await apiClient.get<ApiResponse<AccessRequest[]>>("/onboarding/my-access-requests");
  return response.data;
}

export async function getMyTenantInvitations(): Promise<ApiResponse<TenantInvitationResult[]>> {
  const response = await apiClient.get<ApiResponse<TenantInvitationResult[]>>("/onboarding/my-invitations");
  return response.data;
}
