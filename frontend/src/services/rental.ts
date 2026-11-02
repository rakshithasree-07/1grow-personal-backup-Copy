import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface RentalItem {
  id: string;
  tenantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  quantity: number;
  availableQty: number;
  rentalPrice: number;
  depositAmount: number;
  condition: string;
  status: string;
  imageUrl: string | null;
  images: string[] | null;
  isArchived: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
}

export interface RentalCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { items: number };
}

export interface RentalEnquiry {
  id: string;
  tenantId: string;
  customerName: string;
  phone: string;
  email: string | null;
  itemId: string | null;
  requirements: string | null;
  eventDate: string | null;
  eventEndDate: string | null;
  quantity: number | null;
  source: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  item?: { id: string; name: string } | null;
}

export interface RentalBooking {
  id: string;
  tenantId: string;
  bookingNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  depositAmount: number;
  discountAmount: number;
  taxAmount: number;
  paidAmount: number;
  status: string;
  notes: string | null;
  venue: string | null;
  isArchived: boolean;
  createdAt: string;
  items?: RentalBookingItem[];
}

export interface RentalBookingItem {
  id: string;
  bookingId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  item?: { id: string; name: string; sku: string | null } | null;
}

export interface RentalDispatch {
  id: string;
  tenantId: string;
  bookingId: string;
  dispatchNumber: string;
  dispatchDate: string;
  expectedReturn: string | null;
  actualReturn: string | null;
  dispatchedBy: string | null;
  receivedBy: string | null;
  condition: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  booking?: { id: string; bookingNumber: string; customerName: string } | null;
}

export interface RentalReturn {
  id: string;
  tenantId: string;
  bookingId: string;
  returnNumber: string;
  returnDate: string;
  inspectedBy: string | null;
  condition: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  booking?: { id: string; bookingNumber: string; customerName: string } | null;
}

export interface RentalMaintenance {
  id: string;
  tenantId: string;
  itemId: string;
  type: string;
  description: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  cost: number;
  status: string;
  notes: string | null;
  createdAt: string;
  item?: { id: string; name: string } | null;
}

export interface RentalDamage {
  id: string;
  tenantId: string;
  bookingId: string | null;
  itemId: string;
  severity: string;
  description: string | null;
  penaltyAmount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  item?: { id: string; name: string } | null;
  booking?: { id: string; bookingNumber: string } | null;
}

export interface RentalStats {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  damaged: number;
  retired: number;
}

export interface BookingStats {
  total: number;
  enquiry: number;
  confirmed: number;
  dispatched: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface EnquiryStats {
  total: number;
  new_: number;
  contacted: number;
  quotationSent: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

/* ─── Pagination Query ──────────────────────────────────────────────────────── */

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  categoryId?: string;
  condition?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildQuery(params: PaginationQuery): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.condition) search.set("condition", params.condition);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.sortBy) {
    search.set("sortBy", params.sortBy);
    if (params.sortDir) search.set("sortDir", params.sortDir);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* ─── Rental Items ──────────────────────────────────────────────────────────── */

export async function getRentalItems(query?: PaginationQuery): Promise<ApiResponse<RentalItem[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalItem[]>>(`/rental/items${query ? buildQuery(query) : ""}`);
  return data;
}

export async function getRentalItemStats(): Promise<ApiResponse<RentalStats>> {
  const { data } = await apiClient.get<ApiResponse<RentalStats>>("/rental/items/stats");
  return data;
}

export async function createRentalItem(payload: Partial<RentalItem>): Promise<ApiResponse<RentalItem>> {
  const { data } = await apiClient.post<ApiResponse<RentalItem>>("/rental/items", payload);
  return data;
}

export async function updateRentalItem(id: string, payload: Partial<RentalItem>): Promise<ApiResponse<RentalItem>> {
  const { data } = await apiClient.patch<ApiResponse<RentalItem>>(`/rental/items/${id}`, payload);
  return data;
}

export async function archiveRentalItem(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/rental/items/${id}/archive`);
  return data;
}

export async function restoreRentalItem(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/rental/items/${id}/restore`);
  return data;
}

/* ─── Rental Categories ─────────────────────────────────────────────────────── */

export async function getRentalCategories(): Promise<ApiResponse<RentalCategory[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalCategory[]>>("/rental/categories");
  return data;
}

export async function createRentalCategory(payload: Partial<RentalCategory>): Promise<ApiResponse<RentalCategory>> {
  const { data } = await apiClient.post<ApiResponse<RentalCategory>>("/rental/categories", payload);
  return data;
}

export async function updateRentalCategory(id: string, payload: Partial<RentalCategory>): Promise<ApiResponse<RentalCategory>> {
  const { data } = await apiClient.patch<ApiResponse<RentalCategory>>(`/rental/categories/${id}`, payload);
  return data;
}

export async function deleteRentalCategory(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/rental/categories/${id}/delete`);
  return data;
}

/* ─── Rental Enquiries ──────────────────────────────────────────────────────── */

export async function getRentalEnquiries(query?: PaginationQuery): Promise<ApiResponse<RentalEnquiry[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalEnquiry[]>>(`/rental/enquiries${query ? buildQuery(query) : ""}`);
  return data;
}

export async function getRentalEnquiryStats(): Promise<ApiResponse<EnquiryStats>> {
  const { data } = await apiClient.get<ApiResponse<EnquiryStats>>("/rental/enquiries/stats");
  return data;
}

export async function createRentalEnquiry(payload: Partial<RentalEnquiry>): Promise<ApiResponse<RentalEnquiry>> {
  const { data } = await apiClient.post<ApiResponse<RentalEnquiry>>("/rental/enquiries", payload);
  return data;
}

export async function updateRentalEnquiry(id: string, payload: Partial<RentalEnquiry>): Promise<ApiResponse<RentalEnquiry>> {
  const { data } = await apiClient.patch<ApiResponse<RentalEnquiry>>(`/rental/enquiries/${id}`, payload);
  return data;
}

export interface EnquiryConversion {
  enquiry: RentalEnquiry;
  booking: RentalBooking;
}

export async function convertEnquiryToBooking(
  id: string,
  payload?: { startDate?: string; endDate?: string; items?: Array<{ itemId: string; quantity: number }> },
): Promise<ApiResponse<EnquiryConversion>> {
  const { data } = await apiClient.post<ApiResponse<EnquiryConversion>>(`/rental/enquiries/${id}/convert`, payload);
  return data;
}

/* ─── Rental Bookings ───────────────────────────────────────────────────────── */

export async function getRentalBookings(query?: PaginationQuery): Promise<ApiResponse<RentalBooking[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalBooking[]>>(`/rental/bookings${query ? buildQuery(query) : ""}`);
  return data;
}

export async function getRentalBookingStats(): Promise<ApiResponse<BookingStats>> {
  const { data } = await apiClient.get<ApiResponse<BookingStats>>("/rental/bookings/stats");
  return data;
}

export async function getRentalBooking(id: string): Promise<ApiResponse<RentalBooking>> {
  const { data } = await apiClient.get<ApiResponse<RentalBooking>>(`/rental/bookings/${id}`);
  return data;
}

export interface CreateRentalBookingPayload {
  customerName: string;
  phone: string;
  email?: string | null;
  startDate: string;
  endDate: string;
  venue?: string | null;
  notes?: string | null;
  totalAmount?: number;
  depositAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  paidAmount?: number;
  items?: Array<{ itemId: string; quantity: number; unitPrice: number; totalPrice: number }>;
}

export async function createRentalBooking(payload: CreateRentalBookingPayload): Promise<ApiResponse<RentalBooking>> {
  const { data } = await apiClient.post<ApiResponse<RentalBooking>>("/rental/bookings", payload);
  return data;
}

export async function updateRentalBooking(id: string, payload: Partial<RentalBooking>): Promise<ApiResponse<RentalBooking>> {
  const { data } = await apiClient.patch<ApiResponse<RentalBooking>>(`/rental/bookings/${id}`, payload);
  return data;
}

export async function updateBookingStatus(id: string, payload: { status: string; notes?: string }): Promise<ApiResponse<RentalBooking>> {
  const { data } = await apiClient.patch<ApiResponse<RentalBooking>>(`/rental/bookings/${id}/status`, payload);
  return data;
}

/* ─── Dispatch ──────────────────────────────────────────────────────────────── */

export async function getDispatchList(query?: PaginationQuery): Promise<ApiResponse<RentalDispatch[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalDispatch[]>>(`/rental/dispatch${query ? buildQuery(query) : ""}`);
  return data;
}

export async function createDispatch(payload: Partial<RentalDispatch>): Promise<ApiResponse<RentalDispatch>> {
  const { data } = await apiClient.post<ApiResponse<RentalDispatch>>("/rental/dispatch", payload);
  return data;
}

export async function updateDispatch(id: string, payload: Partial<RentalDispatch>): Promise<ApiResponse<RentalDispatch>> {
  const { data } = await apiClient.patch<ApiResponse<RentalDispatch>>(`/rental/dispatch/${id}`, payload);
  return data;
}

/* ─── Returns ───────────────────────────────────────────────────────────────── */

export async function getReturnList(query?: PaginationQuery): Promise<ApiResponse<RentalReturn[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalReturn[]>>(`/rental/returns${query ? buildQuery(query) : ""}`);
  return data;
}

export async function createReturn(payload: Partial<RentalReturn>): Promise<ApiResponse<RentalReturn>> {
  const { data } = await apiClient.post<ApiResponse<RentalReturn>>("/rental/returns", payload);
  return data;
}

export async function updateReturn(id: string, payload: Partial<RentalReturn>): Promise<ApiResponse<RentalReturn>> {
  const { data } = await apiClient.patch<ApiResponse<RentalReturn>>(`/rental/returns/${id}`, payload);
  return data;
}

/* ─── Maintenance ───────────────────────────────────────────────────────────── */

export async function getMaintenanceList(query?: PaginationQuery): Promise<ApiResponse<RentalMaintenance[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalMaintenance[]>>(`/rental/maintenance${query ? buildQuery(query) : ""}`);
  return data;
}

export async function createMaintenance(payload: Partial<RentalMaintenance>): Promise<ApiResponse<RentalMaintenance>> {
  const { data } = await apiClient.post<ApiResponse<RentalMaintenance>>("/rental/maintenance", payload);
  return data;
}

export async function updateMaintenance(id: string, payload: Partial<RentalMaintenance>): Promise<ApiResponse<RentalMaintenance>> {
  const { data } = await apiClient.patch<ApiResponse<RentalMaintenance>>(`/rental/maintenance/${id}`, payload);
  return data;
}

/* ─── Damage ────────────────────────────────────────────────────────────────── */

export async function getDamageList(query?: PaginationQuery): Promise<ApiResponse<RentalDamage[]>> {
  const { data } = await apiClient.get<ApiResponse<RentalDamage[]>>(`/rental/damage${query ? buildQuery(query) : ""}`);
  return data;
}

export async function createDamage(payload: Partial<RentalDamage>): Promise<ApiResponse<RentalDamage>> {
  const { data } = await apiClient.post<ApiResponse<RentalDamage>>("/rental/damage", payload);
  return data;
}

export async function updateDamage(id: string, payload: Partial<RentalDamage>): Promise<ApiResponse<RentalDamage>> {
  const { data } = await apiClient.patch<ApiResponse<RentalDamage>>(`/rental/damage/${id}`, payload);
  return data;
}
