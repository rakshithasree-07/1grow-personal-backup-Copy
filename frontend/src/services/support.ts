import { apiClient } from "./api-client";
import type { ApiResponse, PaginatedMeta } from "./types";

/* ─── Types ─────────────────────────────────────────────────── */

export interface SupportCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface TicketUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  attachments?: Record<string, unknown>[] | null;
  createdAt: string;
  updatedAt?: string | null;
  isDeleted?: boolean;
  sender: TicketUser;
}

export interface SupportTicket {
  id: string;
  categoryId?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  ticketNo: string;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
  assignedTo?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: SupportCategory | null;
  user?: TicketUser | null;
  assignee?: TicketUser | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
  module?: string | null;
  screenshots?: string[] | null;
}

export interface SupportStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
}

/* ─── Service ────────────────────────────────────────────────── */

function unwrapPaginated<T>(response: { data: ApiResponse<T[]> }): { data: T[]; meta: PaginatedMeta } {
  return {
    data: response.data.data ?? [],
    meta: response.data.meta ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  };
}

export const supportService = {
  async createTicket(payload: {
    subject: string;
    description: string;
    categoryId?: string;
    priority?: string;
    module?: string;
    screenshots?: string[];
  }) {
    const response = await apiClient.post<ApiResponse<SupportTicket>>("/support/tickets", payload);
    return response.data.data;
  },

  async listTickets(params?: { page?: number; pageSize?: number; status?: string; priority?: string; categoryId?: string }) {
    const response = await apiClient.get<ApiResponse<SupportTicket[]>>("/support/tickets", { params });
    return unwrapPaginated(response);
  },

  async getTicket(id: string) {
    const response = await apiClient.get<ApiResponse<SupportTicket>>(`/support/tickets/${id}`);
    return response.data.data;
  },

  async addMessage(ticketId: string, payload: { message: string; attachments?: Record<string, unknown>[] }) {
    const response = await apiClient.post<ApiResponse<TicketMessage>>(`/support/tickets/${ticketId}/messages`, payload);
    return response.data.data;
  },

  async updateStatus(ticketId: string, payload: { status: string; assignedTo?: string }) {
    const response = await apiClient.patch<ApiResponse<SupportTicket>>(`/support/tickets/${ticketId}/status`, payload);
    return response.data.data;
  },

  async getStats() {
    const response = await apiClient.get<ApiResponse<SupportStats>>("/support/tickets/stats");
    return response.data.data;
  },

  async getCategories() {
    const response = await apiClient.get<ApiResponse<SupportCategory[]>>("/support/categories");
    return response.data.data;
  },

  async updateMessage(ticketId: string, messageId: string, payload: { message: string }) {
    const response = await apiClient.patch<ApiResponse<TicketMessage>>(`/support/tickets/${ticketId}/messages/${messageId}`, payload);
    return response.data.data;
  },

  async deleteMessage(ticketId: string, messageId: string) {
    const response = await apiClient.delete<ApiResponse<void>>(`/support/tickets/${ticketId}/messages/${messageId}`);
    return response.data.data;
  },
};
