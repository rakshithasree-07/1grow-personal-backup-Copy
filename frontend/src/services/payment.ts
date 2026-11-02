import { apiClient } from "./api-client";
import type { ApiResponse, PaginatedData } from "./types";

// ─── Billing Types ──────────────────────────────────────────────────────────

export type BillingPaymentType =
  | "STUDENT_FEE"
  | "CLIENT_PAYMENT"
  | "REGISTRATION_FEE"
  | "SECURITY_DEPOSIT"
  | "ADVANCE_PAYMENT"
  | "LATE_FEE"
  | "PARTIAL_PAYMENT"
  | "INSTALLMENT"
  | "TENANT_SUBSCRIPTION"
  | "OTHER";

export type PaymentOrderStatus =
  | "PENDING"
  | "INITIATED"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type RazorpayOrderStatus = "CREATED" | "ATTEMPTED" | "PAID" | "EXPIRED";

export type RefundStatus = "PENDING" | "PROCESSED" | "FAILED" | "CANCELLED";

export interface CreatePaymentOrderRequest {
  invoiceId?: string;
  installmentId?: string;
  enrollmentId?: string;
  paymentType: BillingPaymentType;
  amountOverridePaise?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  paymentOrderId: string;
}

export interface InitiateRefundRequest {
  paymentOrderId: string;
  amountPaise: number;
  reason?: string;
  speed?: "normal" | "optimum";
}

export interface CreatePaymentOrderResponse {
  paymentOrder: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentOrderStatus;
    paymentType: BillingPaymentType;
    description: string | null;
    invoiceId: string | null;
    installmentId: string | null;
    createdAt: string;
  };
  razorpayOrder: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: RazorpayOrderStatus;
  };
  keyId: string;
}

export interface VerifyPaymentResponse {
  paymentOrder: {
    id: string;
    status: PaymentOrderStatus;
    amount: number;
    currency: string;
    invoiceId: string | null;
  };
  transaction: {
    id: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    method: string | null;
    status: string;
    paidAt: string | null;
  };
}

export interface PaymentOrder {
  id: string;
  tenantId: string;
  branchId: string | null;
  userId: string;
  invoiceId: string | null;
  installmentId: string | null;
  razorpayOrderId: string | null;
  paymentType: BillingPaymentType;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  description: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
  } | null;
  razorpayOrder?: {
    razorpayOrderId: string;
    status: RazorpayOrderStatus;
  } | null;
  transactions?: Array<{
    id: string;
    razorpayPaymentId: string;
    amount: number;
    status: string;
    method: string | null;
    paidAt: string | null;
  }>;
  refunds?: Array<{
    id: string;
    amount: number;
    status: RefundStatus;
    reason: string | null;
    createdAt: string;
  }>;
}

export interface PaymentSummary {
  summary: {
    totalRevenue: number;
    totalRefundedPaise: number;
    totalPayments: number;
    pendingPayments: number;
    successfulPayments: number;
    failedPayments: number;
    refundedPayments: number;
  };
  recentPayments: PaymentOrder[];
}

export interface BillingConfig {
  id: string;
  tenantId: string;
  currency: string;
  taxPercent: number;
  lateFeeType: string;
  lateFeeValue: number;
  lateFeeGraceDays: number;
  autoLateFee: boolean;
  allowPartialPayment: boolean;
  allowInstallments: boolean;
  invoicePrefix: string;
  receiptPrefix: string;
  paymentDueDays: number;
  autoSendInvoice: boolean;
  autoSendReceipt: boolean;
}

export interface RecordManualPaymentRequest {
  invoiceId?: string;
  enrollmentId?: string;
  amount: number;
  paymentMode: "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";
  reference?: string;
  description?: string;
}

export interface PaymentListQuery {
  page?: number;
  limit?: number;
  status?: string;
  paymentType?: string;
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  studentId?: string;
  search?: string;
}

// ─── Razorpay Checkout Result ────────────────────────────────────────────

export interface RazorpayCheckoutOptions {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => {
      on: (event: string, handler: (response: any) => void) => void;
      open: () => void;
    };
  }
}

// ─── Billing Service ────────────────────────────────────────────────────────

export const paymentService = {
  // ─── Payment Orders ──────────────────────────────────────────────────────

  async createPaymentOrder(data: CreatePaymentOrderRequest) {
    const res = await apiClient.post<ApiResponse<CreatePaymentOrderResponse>>(
      "/billing/payments/orders",
      data,
    );
    return res.data.data;
  },

  async verifyPayment(data: VerifyPaymentRequest) {
    const res = await apiClient.post<ApiResponse<VerifyPaymentResponse>>(
      "/billing/payments/verify",
      data,
    );
    return res.data.data;
  },

  async listPayments(query?: PaymentListQuery) {
    const res = await apiClient.get<ApiResponse<PaginatedData<PaymentOrder>>>(
      "/billing/payments",
      { params: query },
    );
    return res.data;
  },

  async getPaymentDetails(id: string) {
    const res = await apiClient.get<ApiResponse<PaymentOrder>>(
      `/billing/payments/${id}`,
    );
    return res.data.data;
  },

  async getPaymentSummary() {
    const res = await apiClient.get<ApiResponse<PaymentSummary>>(
      "/billing/payments/summary",
    );
    return res.data.data;
  },

  // ─── Manual Payments ────────────────────────────────────────────────────

  async recordManualPayment(data: RecordManualPaymentRequest) {
    const res = await apiClient.post<ApiResponse<unknown>>(
      "/billing/payments/manual",
      data,
    );
    return res.data.data;
  },

  // ─── Refunds ─────────────────────────────────────────────────────────────

  async initiateRefund(data: InitiateRefundRequest) {
    const res = await apiClient.post<ApiResponse<unknown>>(
      "/billing/payments/refund",
      data,
    );
    return res.data.data;
  },

  // ─── Billing Config ──────────────────────────────────────────────────────

  async getBillingConfig() {
    const res = await apiClient.get<ApiResponse<BillingConfig>>(
      "/billing/config",
    );
    return res.data.data;
  },

  async updateBillingConfig(data: Partial<BillingConfig>) {
    const res = await apiClient.patch<ApiResponse<BillingConfig>>(
      "/billing/config",
      data,
    );
    return res.data.data;
  },

  async getPublicKey() {
    const res = await apiClient.get<ApiResponse<{ keyId: string }>>(
      "/billing/key",
    );
    return res.data.data;
  },

  // ─── Razorpay Checkout ──────────────────────────────────────────────────────

  /**
   * Opens Razorpay Checkout for a payment order.
   * 1. Gets the public key from the backend
   * 2. Loads the Razorpay script dynamically
   * 3. Opens the checkout with the order details
   */
  async openRazorpayCheckout(
    paymentOrderData: CreatePaymentOrderResponse,
    options: {
      name: string;
      description: string;
      prefill?: { name?: string; email?: string; contact?: string };
      themeColor?: string;
    },
  ): Promise<{
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }> {
    const { keyId } = await this.getPublicKey();

    await this.loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: keyId,
        amount: paymentOrderData.razorpayOrder.amount,
        currency: paymentOrderData.razorpayOrder.currency,
        name: options.name,
        description: options.description,
        order_id: paymentOrderData.razorpayOrder.id,
        prefill: options.prefill,
        theme: { color: options.themeColor ?? "#6366f1" },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled by user")),
        },
      });

      rzp.on("payment.success", (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        resolve({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      });

      rzp.on("payment.error", (response: { error: { description: string } }) => {
        reject(new Error(response.error.description ?? "Payment failed"));
      });

      rzp.open();
    });
  },

  /**
   * Opens Razorpay Checkout for subscription mandate registration (AutoPay).
   * Uses subscription_id instead of order_id to show mandate setup flow.
   */
  async openRazorpaySubscriptionCheckout(
    subscriptionId: string,
    options: {
      name: string;
      description: string;
      prefill?: { name?: string; email?: string; contact?: string };
      themeColor?: string;
    },
  ): Promise<void> {
    const { keyId } = await this.getPublicKey();

    await this.loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: options.name,
        description: options.description,
        prefill: options.prefill,
        theme: { color: options.themeColor ?? "#6366f1" },
        modal: {
          ondismiss: () => reject(new Error("AutoPay setup cancelled by user")),
        },
      });

      rzp.on("subscription.registration", () => {
        resolve();
      });

      rzp.on("payment.error", (response: { error: { description: string } }) => {
        reject(new Error(response.error.description ?? "AutoPay setup failed"));
      });

      rzp.open();
    });
  },

  /**
   * Dynamically loads the Razorpay checkout script
   */
  async loadRazorpayScript(): Promise<void> {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.head.appendChild(script);
    });
  },

  /**
   * Complete payment flow: create order → open checkout → verify
   */
  async payWithRazorpay(
    createOrderData: CreatePaymentOrderRequest,
    options: {
      name: string;
      description: string;
      prefill?: { name?: string; email?: string; contact?: string };
      themeColor?: string;
    },
  ) {
    const paymentOrderData = await this.createPaymentOrder(createOrderData);

    const razorpayResponse = await this.openRazorpayCheckout(
      paymentOrderData,
      options,
    );

    const verificationResult = await this.verifyPayment({
      razorpayPaymentId: razorpayResponse.razorpayPaymentId,
      razorpayOrderId: razorpayResponse.razorpayOrderId,
      razorpaySignature: razorpayResponse.razorpaySignature,
      paymentOrderId: paymentOrderData.paymentOrder.id,
    });

    return verificationResult;
  },
};

export default paymentService;
