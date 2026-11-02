import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface Event {
  id: string;
  tenantId: string;
  eventNumber: string;
  title: string;
  description: string | null;
  eventTypeId: string | null;
  clientId: string | null;
  venue: string | null;
  address: string | null;
  eventDate: string;
  eventEndDate: string | null;
  startTime: string | null;
  endTime: string | null;
  expectedGuests: number | null;
  budget: number | null;
  actualCost: number | null;
  status: string;
  executionStatus: string;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt?: string;
  eventType?: { id: string; name: string } | null;
  client?: { id: string; name: string; phone: string } | null;
  _count?: { tasks: number; teamMembers: number; vendors: number };
}

export interface EventClient {
  id: string;
  tenantId?: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  leadId?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: { events: number };
}

export interface EventType {
  id: string;
  tenantId?: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface EventProposal {
  id: string;
  tenantId?: string;
  proposalNumber: string;
  title: string;
  eventId: string | null;
  scope: string | null;
  totalAmount: number;
  status: string;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  event?: { id: string; title: string } | null;
}

export interface EventQuotation {
  id: string;
  tenantId?: string;
  quotationNumber: string;
  title: string;
  eventId: string | null;
  items?: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  event?: { id: string; title: string } | null;
}

export interface EventTask {
  id: string;
  tenantId?: string;
  eventId: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt?: string;
  assignee?: { id: string; name: string } | null;
}

export interface EventVendor {
  id: string;
  tenantId?: string;
  eventId: string;
  vendorName: string;
  contactName: string | null;
  phone: string | null;
  email?: string | null;
  service: string;
  amount: number | null;
  status: string;
  notes: string | null;
  createdAt?: string;
}

export interface EventTeamMember {
  id: string;
  tenantId?: string;
  eventId: string;
  userId: string;
  role: string;
  assignedAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export interface EventTimelineEntry {
  slotId: string;
  id?: string;
  tenantId?: string;
  eventId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  isMilestone: boolean;
  status: string;
  isActive?: boolean;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dependencies?: TimelineDependency[];
  startedAt?: string | null;
  completedAt?: string | null;
  isCritical?: boolean;
  notes?: string | null;
  assignees?: {
    id: string;
    userId: string;
    role: string;
    user?: { id: string; name: string; email: string; phone?: string } | null;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventBudgetItem {
  id: string;
  tenantId?: string;
  eventId: string;
  category: string;
  description: string | null;
  budgetedAmount: number;
  actualAmount: number;
  notes: string | null;
  createdAt?: string;
}

export interface EventExecutionLog {
  id: string;
  tenantId?: string;
  eventId: string;
  userId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface EventStats {
  total: number;
  draft: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface EventListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  clientId?: string;
  eventTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: string;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalActual: number;
  variance: number;
  items: number;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function buildQuery(params: EventListParams): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.eventTypeId) search.set("eventTypeId", params.eventTypeId);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.sortBy) {
    search.set("sortBy", params.sortBy);
    if (params.sortDir) search.set("sortDir", params.sortDir);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* ─── Events ────────────────────────────────────────────────────────────────── */

export async function getEvents(params?: EventListParams): Promise<ApiResponse<Event[]>> {
  const { data } = await apiClient.get<ApiResponse<Event[]>>(
    `/events${params ? buildQuery(params) : ""}`,
  );
  return data;
}

export async function getEventStats(): Promise<ApiResponse<EventStats>> {
  const { data } = await apiClient.get<ApiResponse<EventStats>>("/events/stats");
  return data;
}

export async function getEvent(id: string): Promise<ApiResponse<Event>> {
  const { data } = await apiClient.get<ApiResponse<Event>>(`/events/${id}`);
  return data;
}

export async function createEvent(payload: Partial<Event>): Promise<ApiResponse<Event>> {
  const { data } = await apiClient.post<ApiResponse<Event>>("/events", payload);
  return data;
}

export async function updateEvent(id: string, payload: Partial<Event>): Promise<ApiResponse<Event>> {
  const { data } = await apiClient.patch<ApiResponse<Event>>(`/events/${id}`, payload);
  return data;
}

export async function updateEventStatus(id: string, status: string): Promise<ApiResponse<Event>> {
  const { data } = await apiClient.patch<ApiResponse<Event>>(`/events/${id}/status`, { status });
  return data;
}

export async function archiveEvent(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/events/${id}/archive`);
  return data;
}

export async function restoreEvent(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post<ApiResponse<void>>(`/events/${id}/restore`);
  return data;
}

/* ─── Event Clients ─────────────────────────────────────────────────────────── */

export async function getEventClients(params?: EventListParams): Promise<ApiResponse<EventClient[]>> {
  const { data } = await apiClient.get<ApiResponse<EventClient[]>>(
    `/events/clients${params ? buildQuery(params) : ""}`,
  );
  return data;
}

export async function createEventClient(payload: Partial<EventClient>): Promise<ApiResponse<EventClient>> {
  const { data } = await apiClient.post<ApiResponse<EventClient>>("/events/clients", payload);
  return data;
}

export async function updateEventClient(id: string, payload: Partial<EventClient>): Promise<ApiResponse<EventClient>> {
  const { data } = await apiClient.patch<ApiResponse<EventClient>>(`/events/clients/${id}`, payload);
  return data;
}

/* ─── Event Types ───────────────────────────────────────────────────────────── */

export async function getEventTypes(): Promise<ApiResponse<EventType[]>> {
  const { data } = await apiClient.get<ApiResponse<EventType[]>>("/events/types");
  return data;
}

export async function createEventType(payload: Partial<EventType>): Promise<ApiResponse<EventType>> {
  const { data } = await apiClient.post<ApiResponse<EventType>>("/events/types", payload);
  return data;
}

/* ─── Proposals ─────────────────────────────────────────────────────────────── */

export async function getEventProposals(params?: EventListParams): Promise<ApiResponse<EventProposal[]>> {
  const { data } = await apiClient.get<ApiResponse<EventProposal[]>>(
    `/events/proposals${params ? buildQuery(params) : ""}`,
  );
  return data;
}

export async function getEventProposal(id: string): Promise<ApiResponse<EventProposal>> {
  const { data } = await apiClient.get<ApiResponse<EventProposal>>(`/events/proposals/${id}`);
  return data;
}

export async function createEventProposal(payload: Partial<EventProposal>): Promise<ApiResponse<EventProposal>> {
  const { data } = await apiClient.post<ApiResponse<EventProposal>>("/events/proposals", payload);
  return data;
}

export async function updateEventProposal(id: string, payload: Partial<EventProposal>): Promise<ApiResponse<EventProposal>> {
  const { data } = await apiClient.patch<ApiResponse<EventProposal>>(`/events/proposals/${id}`, payload);
  return data;
}

export async function updateProposalStatus(id: string, status: string): Promise<ApiResponse<EventProposal>> {
  const { data } = await apiClient.patch<ApiResponse<EventProposal>>(`/events/proposals/${id}/status`, { status });
  return data;
}

/* ─── Quotations ────────────────────────────────────────────────────────────── */

export async function getEventQuotations(params?: EventListParams): Promise<ApiResponse<EventQuotation[]>> {
  const { data } = await apiClient.get<ApiResponse<EventQuotation[]>>(
    `/events/quotations${params ? buildQuery(params) : ""}`,
  );
  return data;
}

export async function createEventQuotation(payload: Partial<EventQuotation>): Promise<ApiResponse<EventQuotation>> {
  const { data } = await apiClient.post<ApiResponse<EventQuotation>>("/events/quotations", payload);
  return data;
}

export async function updateQuotationStatus(id: string, status: string): Promise<ApiResponse<EventQuotation>> {
  const { data } = await apiClient.patch<ApiResponse<EventQuotation>>(`/events/quotations/${id}/status`, { status });
  return data;
}

/* ─── Team ──────────────────────────────────────────────────────────────────── */

export async function getEventTeam(eventId: string): Promise<ApiResponse<EventTeamMember[]>> {
  const { data } = await apiClient.get<ApiResponse<EventTeamMember[]>>(`/events/${eventId}/team`);
  return data;
}

export async function assignTeamMember(eventId: string, payload: { userId: string; role: string }): Promise<ApiResponse<EventTeamMember>> {
  const { data } = await apiClient.post<ApiResponse<EventTeamMember>>(`/events/${eventId}/team`, payload);
  return data;
}

export async function removeTeamMember(eventId: string, memberId: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/events/${eventId}/team/${memberId}`);
  return data;
}

/* ─── Vendors ───────────────────────────────────────────────────────────────── */

export async function getEventVendors(eventId: string): Promise<ApiResponse<EventVendor[]>> {
  const { data } = await apiClient.get<ApiResponse<EventVendor[]>>(`/events/${eventId}/vendors`);
  return data;
}

export async function addEventVendor(eventId: string, payload: Partial<EventVendor>): Promise<ApiResponse<EventVendor>> {
  const { data } = await apiClient.post<ApiResponse<EventVendor>>(`/events/${eventId}/vendors`, payload);
  return data;
}

export async function updateEventVendor(eventId: string, vendorId: string, payload: Partial<EventVendor>): Promise<ApiResponse<EventVendor>> {
  const { data } = await apiClient.patch<ApiResponse<EventVendor>>(`/events/${eventId}/vendors/${vendorId}`, payload);
  return data;
}

/* ─── Tasks ─────────────────────────────────────────────────────────────────── */

export async function getEventTasks(eventId: string): Promise<ApiResponse<EventTask[]>> {
  const { data } = await apiClient.get<ApiResponse<EventTask[]>>(`/events/${eventId}/tasks`);
  return data;
}

export async function createEventTask(eventId: string, payload: Partial<EventTask>): Promise<ApiResponse<EventTask>> {
  const { data } = await apiClient.post<ApiResponse<EventTask>>(`/events/${eventId}/tasks`, payload);
  return data;
}

export async function updateEventTask(eventId: string, taskId: string, payload: Partial<EventTask>): Promise<ApiResponse<EventTask>> {
  const { data } = await apiClient.patch<ApiResponse<EventTask>>(`/events/${eventId}/tasks/${taskId}`, payload);
  return data;
}

/* ─── Timeline ──────────────────────────────────────────────────────────────── */

export interface TimelineTimeSlot {
  slotId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dependencies?: string[];
}

export interface TimelineDependency {
  slotId: string;
  title?: string | null;
}

export interface EventTimeline {
  eventId?: string;
  executionDate?: string | null;
  timeline: EventTimelineEntry[];
}

export async function getEventTimeline(eventId: string): Promise<ApiResponse<EventTimeline>> {
  const { data } = await apiClient.get<ApiResponse<EventTimeline>>(`/events/${eventId}/timeline`);
  return data;
}

export async function createTimelineSlot(eventId: string, payload: Partial<TimelineTimeSlot>): Promise<ApiResponse<EventTimelineEntry>> {
  const { data } = await apiClient.post<ApiResponse<EventTimelineEntry>>(`/events/${eventId}/timeline`, payload);
  return data;
}

export async function updateTimelineSlot(eventId: string, slotId: string, payload: Partial<TimelineTimeSlot>): Promise<ApiResponse<EventTimelineEntry>> {
  const { data } = await apiClient.patch<ApiResponse<EventTimelineEntry>>(`/events/${eventId}/timeline/${slotId}`, payload);
  return data;
}

export async function updateTimelineSlotStatus(eventId: string, slotId: string, isActive: boolean): Promise<ApiResponse<EventTimelineEntry>> {
  const { data } = await apiClient.patch<ApiResponse<EventTimelineEntry>>(`/events/${eventId}/timeline/${slotId}/status`, { isActive });
  return data;
}

/* ─── Budget ────────────────────────────────────────────────────────────────── */

export async function getEventBudget(eventId: string): Promise<ApiResponse<EventBudgetItem[]>> {
  const { data } = await apiClient.get<ApiResponse<EventBudgetItem[]>>(`/events/${eventId}/budget`);
  return data;
}

export async function getBudgetSummary(eventId: string): Promise<ApiResponse<BudgetSummary>> {
  const { data } = await apiClient.get<ApiResponse<BudgetSummary>>(`/events/${eventId}/budget/summary`);
  return data;
}

export async function addBudgetItem(eventId: string, payload: Partial<EventBudgetItem>): Promise<ApiResponse<EventBudgetItem>> {
  const { data } = await apiClient.post<ApiResponse<EventBudgetItem>>(`/events/${eventId}/budget`, payload);
  return data;
}

/* ─── Execution ─────────────────────────────────────────────────────────────── */

export async function getEventExecutionLogs(eventId: string): Promise<ApiResponse<EventExecutionLog[]>> {
  const { data } = await apiClient.get<ApiResponse<EventExecutionLog[]>>(`/events/${eventId}/execution`);
  return data;
}

export async function addExecutionLog(eventId: string, payload: Partial<EventExecutionLog>): Promise<ApiResponse<EventExecutionLog>> {
  const { data } = await apiClient.post<ApiResponse<EventExecutionLog>>(`/events/${eventId}/execution`, payload);
  return data;
}
