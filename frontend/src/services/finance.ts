import { apiClient } from "./api-client";
import type { ApiResponse, PaginatedData } from "./types";

/* ─── Fee Plan Types ──────────────────────────────────────────────────── */

export type FeePlanStatus = "active" | "inactive";

export interface FeePlanFeature {
  label: string;
  included: boolean;
}

export interface FeePlanDiscount {
  id: string;
  name: string;
  type: string;
  value: number;
  code: string | null;
}

export interface FeePlanCourse {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface FeePlan {
  id: string;
  tenantId: string;
  module: "TRAINING" | "RENTAL" | "EVENT";
  sourceId: string | null;
  branchId: string;
  planName: string;
  template: string | null;
  imageUrl: string | null;
  pdfUrl: string | null;
  courseId: string | null;
  rentalItemId: string | null;
  eventId: string | null;
  source?: unknown;
  sourceName: string;
  courseName: string;
  description: string | null;
  features: FeePlanFeature[] | null;
  benefits: string[];
  hookWords: string[];
  highlightFields: Record<string, unknown> | null;
  feeType: string;
  totalAmount: number;
  currency: string;
  installments: number;
  durationMonths: number | null;
  status: FeePlanStatus;
  isPublic: boolean;
  publicVisible: boolean;
  publicStatus: string;
  greeting: string | null;
  studentsAssigned: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFeePlanRequest {
  name?: string;
  courseId?: string;
  rentalItemId?: string;
  eventId?: string;
  module?: "TRAINING" | "RENTAL" | "EVENT";
  template?: string;
  imageUrl?: string;
  pdfUrl?: string;
  feeType?: string;
  totalAmount?: number;
  installments?: number;
  durationMonths?: number;
  description?: string;
  features?: FeePlanFeature[];
  benefits?: string[];
  hookWords?: string[];
  highlightFields?: Record<string, unknown>;
  isPublic?: boolean;
  publicVisible?: boolean;
  publicStatus?: string;
  greeting?: string;
}

export interface FeePlanListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: FeePlanStatus;
  courseId?: string;
  rentalItemId?: string;
  eventId?: string;
  module?: "TRAINING" | "RENTAL" | "EVENT";
  publicStatus?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/* ─── Invoice Types ───────────────────────────────────────────────────── */

export type InvoiceStatus = "paid" | "partial" | "overdue" | "pending" | "draft" | "cancelled";

export interface Invoice {
  id: string;
  tenantId: string;
  branchId: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  batchName: string;
  feePlanId: string;
  feePlanName: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: Array<{
    id: string;
    amount: number;
    createdAt: string;
  }>;
}

export interface CreateInvoiceRequest {
  studentId: string;
  feePlanId: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
}

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: InvoiceStatus;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/* ─── Payment Types ───────────────────────────────────────────────────── */

export type PaymentStatus = "completed" | "pending" | "failed" | "refunded";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "cheque" | "online";

export interface Payment {
  id: string;
  tenantId: string;
  branchId: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId: string | null;
  status: PaymentStatus;
  collectedById: string;
  collectedByName: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentRequest {
  studentId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  invoiceId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/* ─── Fee Plan API ────────────────────────────────────────────────────── */

export async function getFeePlans(
  params?: FeePlanListParams,
): Promise<ApiResponse<PaginatedData<FeePlan>>> {
  const response = await apiClient.get<ApiResponse<PaginatedData<FeePlan>>>(
    "/fee-plans",
    { params },
  );
  return response.data;
}

export async function getFeePlan(
  id: string,
): Promise<ApiResponse<FeePlan>> {
  const response = await apiClient.get<ApiResponse<FeePlan>>(
    `/fee-plans/${id}`,
  );
  return response.data;
}

export async function updateFeePlan(
  id: string,
  data: UpdateFeePlanRequest,
): Promise<ApiResponse<FeePlan>> {
  const response = await apiClient.patch<ApiResponse<FeePlan>>(
    `/fee-plans/${id}`,
    data,
  );
  return response.data;
}

/* ─── Invoice API ─────────────────────────────────────────────────────── */

export async function getInvoices(
  params?: InvoiceListParams,
): Promise<ApiResponse<PaginatedData<Invoice>>> {
  const response = await apiClient.get<ApiResponse<PaginatedData<Invoice>>>(
    "/invoices",
    { params },
  );
  return response.data;
}

export async function getInvoice(
  id: string,
): Promise<ApiResponse<Invoice>> {
  const response = await apiClient.get<ApiResponse<Invoice>>(
    `/invoices/${id}`,
  );
  return response.data;
}

export async function createInvoice(
  data: CreateInvoiceRequest,
): Promise<ApiResponse<Invoice>> {
  const response = await apiClient.post<ApiResponse<Invoice>>(
    "/invoices",
    data,
  );
  return response.data;
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<ApiResponse<Invoice>> {
  const response = await apiClient.patch<ApiResponse<Invoice>>(
    `/invoices/${id}/status`,
    { status },
  );
  return response.data;
}

export async function downloadInvoiceData(
  id: string,
): Promise<ApiResponse<unknown>> {
  const response = await apiClient.get<ApiResponse<unknown>>(
    `/invoices/${id}/download`,
  );
  return response.data;
}

/* ─── Payment API ─────────────────────────────────────────────────────── */

export async function getPayments(
  params?: PaymentListParams,
): Promise<ApiResponse<PaginatedData<Payment>>> {
  const response = await apiClient.get<ApiResponse<PaginatedData<Payment>>>(
    "/payments",
    { params },
  );
  return response.data;
}

export async function getPayment(
  id: string,
): Promise<ApiResponse<Payment>> {
  const response = await apiClient.get<ApiResponse<Payment>>(
    `/payments/${id}`,
  );
  return response.data;
}

export async function recordPayment(
  data: RecordPaymentRequest,
): Promise<ApiResponse<Payment>> {
  const response = await apiClient.post<ApiResponse<Payment>>(
    "/payments",
    data,
  );
  return response.data;
}

export async function refundPayment(
  id: string,
): Promise<ApiResponse<Payment>> {
  const response = await apiClient.post<ApiResponse<Payment>>(
    `/payments/${id}/refund`,
  );
  return response.data;
}

/* ─── Catalog / Public API ──────────────────────────────────────────── */

export interface CatalogTenant {
  name: string;
  slug: string;
  industry: string[];
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  brand: {
    primaryColor: string | null;
    secondaryColor: string | null;
    tagline: string | null;
  } | null;
}

export interface CatalogFeePlan {
  id: string;
  name: string;
  description: string | null;
  features: FeePlanFeature[] | null;
  feeType: string;
  totalAmount: number;
  currency: string;
  installments: number;
  durationMonths: number | null;
  greeting: string | null;
  course: FeePlanCourse | null;
  discounts: FeePlanDiscount[];
}

export interface CatalogInquiryRequest {
  name: string;
  phone: string;
  email?: string;
  feePlanId: string;
  message?: string;
}

export async function getPublicFeePlans(
  slug: string,
): Promise<ApiResponse<{ tenant: CatalogTenant; feePlans: CatalogFeePlan[] }>> {
  const response = await apiClient.get(
    `/catalog/${slug}/classes`,
  );
  return response.data;
}

export async function getPublicFeePlanDetail(
  slug: string,
  planId: string,
): Promise<ApiResponse<{ tenant: CatalogTenant; feePlan: CatalogFeePlan }>> {
  const response = await apiClient.get(
    `/catalog/${slug}/classes/${planId}`,
  );
  return response.data;
}

export async function submitCatalogInquiry(
  slug: string,
  data: CatalogInquiryRequest,
): Promise<ApiResponse<{ leadId: string; planName: string; tenantName: string }>> {
  const response = await apiClient.post(
    `/catalog/${slug}/inquiry`,
    data,
  );
  return response.data;
}
