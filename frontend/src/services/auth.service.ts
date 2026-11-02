import { apiClient as http } from "./api-client";

export interface LoginPayload {
  type: "email" | "phone";
  email?: string;
  phone?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthUser {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  tenantSlug: string | null;
  industries?: string[];
  avatarUrl?: string | null;
  onboardingRequired?: boolean;
  currentOnboardingStep?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  rememberMe?: boolean;
  isFirstLogin?: boolean;
  onboardingRequired?: boolean;
}

export interface VerifyEmailResponse {
  emailVerified: boolean;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface SetPasswordPayload {
  newPassword: string;
}

export interface SetPasswordByTokenPayload {
  token: string;
  newPassword: string;
}

export interface UserProfileData {
  id: string;
  tenantId: string | null;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  hasPassword: boolean;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string | null;
  specialties: string | null;
  notes: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  emailVerified: boolean;
  preferences: Record<string, unknown> | null;
  profile: {
    dateOfBirth: string | null;
    gender: string | null;
    whatsappNumber: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    formattedAddress: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    emergencyRelation: string | null;
    bio: string | null;
  } | null;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  mobileNumber?: string;
  avatarUrl?: string;
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
  formattedAddress?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  whatsappNumber?: string;
  specialties?: string;
  notes?: string;
  bio?: string;
}

export interface LinkedAccount {
  provider: string;
  connected: boolean;
  email: string | null;
  linkedAt: string | null;
  canUnlink: boolean;
}

export interface AuthErrorLogPayload {
  errorCode: string;
  errorMessage: string;
  provider?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await http.post("/auth/login", payload);
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await http.post("/auth/register", payload);
    return data.data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get("/auth/me");
    return data.data;
  },

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const { data } = await http.post("/auth/verify-email", { token });
    return data.data;
  },

  async sendVerificationToken(email: string): Promise<void> {
    await http.post("/auth/send-verification-token", { email });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await http.post("/auth/forgot-password", payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await http.post("/auth/reset-password", payload);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await http.post("/auth/change-password", payload);
  },

  async setPassword(payload: SetPasswordPayload): Promise<void> {
    await http.post("/auth/me/password", payload);
  },

  async setPasswordByToken(payload: SetPasswordByTokenPayload): Promise<void> {
    await http.post("/auth/set-password", payload);
  },

  async getProfile(): Promise<UserProfileData> {
    const { data } = await http.get("/auth/profile");
    return data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfileData> {
    const { data } = await http.put("/auth/profile", payload);
    return data.data;
  },

  async refresh(refreshToken: string): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const { data } = await http.post("/auth/refresh", { refreshToken });
    return data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await http.post("/auth/logout", { refreshToken });
  },

  async getPreferences(): Promise<Record<string, unknown>> {
    const { data } = await http.get("/auth/preferences");
    return data.data;
  },

  async updatePreferences(preferences: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await http.put("/auth/preferences", { preferences });
    return data.data;
  },

  async logAuthError(payload: AuthErrorLogPayload): Promise<void> {
    await http.post("/auth/error-log", payload);
  },

  async getLinkedAccounts(): Promise<LinkedAccount[]> {
    const { data } = await http.get("/auth/linked-accounts");
    return data.data;
  },

  async getGoogleLinkUrl(returnTo?: string): Promise<string> {
    const params = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    const { data } = await http.get(`/auth/google/link-url${params}`);
    return data.data.url;
  },

  async unlinkProvider(provider: string): Promise<LinkedAccount[]> {
    const { data } = await http.delete(`/auth/linked-accounts/${provider.toLowerCase()}`);
    return data.data;
  },
};

export function getOnboardingRedirect(role: string, status: string, tenantId?: string | null): string | null {
  // OWNER without tenant needs onboarding
  if (role === "OWNER" && !tenantId) return "/onboarding";
  // Non-CLIENT roles with incomplete onboarding
  if (role !== "CLIENT" && (status === "NEW_USER" || status === "REGISTERED" || status === "PROFILE_COMPLETED")) {
    return "/onboarding";
  }
  // Users waiting for access approval should go to dashboard (pending state)
  if (status === "ACCESS_REQUESTED" || status === "PENDING_APPROVAL") {
    return "/dashboard";
  }
  return null;
}
