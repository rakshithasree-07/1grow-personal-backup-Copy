import { apiClient as http } from "./api-client";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "PAUSED";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  interval: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  trialDays: number;
  maxUsers: number | null;
  maxBranches: number | null;
  maxStudents: number | null;
  isActive: boolean;
  sortOrder: number;
  features: PlanFeature[];
  modules: PlanModule[];
}

export interface PlanFeature {
  id: string;
  feature: string;
  value: string | null;
  isEnabled: boolean;
}

export interface PlanModule {
  id: string;
  module: string;
  isActive: boolean;
}

export interface CurrentSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  autoRenew: boolean;
  plan: Plan;
  daysRemaining: number | null;
}

export interface RazorpaySubscriptionSetup {
  shortUrl: string | null;
  razorpaySubscriptionId: string;
  keyId: string;
}

export interface SubscriptionHistory {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface SubscriptionInvoicePayment {
  id: string;
  amount: number;
  status: string;
  gatewayRef: string | null;
  paidAt: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
  pdfUrl: string | null;
  payments: SubscriptionInvoicePayment[];
  createdAt: string;
}

export interface ActivatePlanPayload {
  planId: string;
}

export const subscriptionService = {
  async getCurrent(): Promise<CurrentSubscription | null> {
    const res = await http.get("/subscriptions/current");
    const data = res.data?.data;
    if (!data || (typeof data === "object" && Object.keys(data).length === 0)) return null;
    return data as CurrentSubscription;
  },

  async getPlans(): Promise<Plan[]> {
    const res = await http.get<{ data: Plan[] }>("/subscriptions/plans");
    return res.data?.data ?? [];
  },

  async activate(planId: string): Promise<CurrentSubscription> {
    const payload: ActivatePlanPayload = { planId };
    const res = await http.post<{ data: CurrentSubscription }>(
      "/subscriptions/activate",
      payload,
    );
    return res.data.data;
  },

  async switchPlan(newPlanId: string): Promise<CurrentSubscription> {
    const res = await http.post<{ data: CurrentSubscription }>(
      "/subscriptions/switch",
      { planId: newPlanId },
    );
    return res.data.data;
  },

  async setupRazorpaySubscription(planId: string): Promise<RazorpaySubscriptionSetup> {
    const res = await http.post<{ data: RazorpaySubscriptionSetup }>(
      "/subscriptions/razorpay-setup",
      { planId },
    );
    return res.data.data;
  },

  async cancel(): Promise<CurrentSubscription> {
    const res = await http.post<{ data: CurrentSubscription }>(
      "/subscriptions/cancel",
    );
    return res.data.data;
  },

  async pause(): Promise<CurrentSubscription> {
    const res = await http.post<{ data: CurrentSubscription }>(
      "/subscriptions/pause",
    );
    return res.data.data;
  },

  async resume(): Promise<CurrentSubscription> {
    const res = await http.post<{ data: CurrentSubscription }>(
      "/subscriptions/resume",
    );
    return res.data.data;
  },

  async getHistory(): Promise<SubscriptionHistory[]> {
    const res = await http.get<{ data: SubscriptionHistory[] }>(
      "/subscriptions/history",
    );
    return res.data?.data ?? [];
  },

  async getInvoices(): Promise<SubscriptionInvoice[]> {
    const res = await http.get<{ data: SubscriptionInvoice[] }>(
      "/subscriptions/invoices",
    );
    return res.data?.data ?? [];
  },

  async syncStatus(): Promise<CurrentSubscription> {
    const res = await http.post<{ data: CurrentSubscription }>(
      "/subscriptions/sync",
    );
    return res.data.data;
  },
};
