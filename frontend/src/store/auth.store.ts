import { create } from "zustand";
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
} from "@/services/auth.service";
import { authService } from "@/services/auth.service";
import { setTokenCookie, removeTokenCookie } from "@/lib/token-cookie";
import { useSubscriptionStore } from "./subscription.store";
import { useNotificationStore } from "./notification.store";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLogin: boolean;

  login: (payload: LoginPayload) => Promise<{ isFirstLogin?: boolean; onboardingRequired?: boolean }>;
  register: (payload: RegisterPayload) => Promise<{ isFirstLogin?: boolean }>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  handleOAuthCallback: (accessToken: string, refreshToken?: string) => Promise<AuthUser>;
  initialize: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  sendVerificationToken: (email: string) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isFirstLogin: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const res = await authService.login(payload);
      localStorage.setItem("accessToken", res.accessToken);
      setTokenCookie(res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem("refreshToken", res.refreshToken);
      }
      const isFirstLogin = res.isFirstLogin ?? false;
      const onboardingRequired = (res as any).onboardingRequired ?? false;
      set({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isAuthenticated: true,
        isFirstLogin,
        isLoading: false,
      });
      return { isFirstLogin, onboardingRequired };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const res = await authService.register(payload);
      localStorage.setItem("accessToken", res.accessToken);
      setTokenCookie(res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem("refreshToken", res.refreshToken);
      }
      set({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isAuthenticated: true,
        isFirstLogin: true,
        isLoading: false,
      });
      return { isFirstLogin: true };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    // Call server to revoke the refresh token (best-effort)
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Server-side token revocation is best-effort
      }
    }

    // Clear all browser storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.clear();

    // Clear cookies
    removeTokenCookie();

    // Clear brand theme CSS variables from document root
    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--secondary");
    root.style.removeProperty("--secondary-foreground");

    // Reset all dependent stores
    useSubscriptionStore.getState().reset();
    useNotificationStore.getState().reset();

    // Clear service worker caches if any
    if (typeof caches !== "undefined") {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Cache clearing is best-effort
      }
    }

    // Reset auth state
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isFirstLogin: false });
  },

  setUser: (user) => set({ user, isAuthenticated: true }),

  handleOAuthCallback: async (accessToken: string, refreshToken?: string) => {
    localStorage.setItem("accessToken", accessToken);
    setTokenCookie(accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    set({ isLoading: true });
    try {
      const user = await authService.me();
      set({
        user,
        accessToken,
        refreshToken: refreshToken ?? null,
        isAuthenticated: true,
        isFirstLogin: false,
        isLoading: false,
      });
      return user;
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      removeTokenCookie();
      set({ isLoading: false });
      throw new Error("Failed to verify session");
    }
  },

  initialize: async () => {
    const accessToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!accessToken) return;
    setTokenCookie(accessToken);
    set({ isLoading: true });
    try {
      // Try validating the current access token first
      try {
        const user = await authService.me();
        set({
          user,
          accessToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } catch {
        // Access token invalid, try refreshing
      }

      if (storedRefreshToken) {
        try {
          const refreshed = await authService.refresh(storedRefreshToken);
          localStorage.setItem("accessToken", refreshed.accessToken);
          localStorage.setItem("refreshToken", refreshed.refreshToken);
          setTokenCookie(refreshed.accessToken);
          set({
            user: refreshed.user,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch {
          // Refresh failed
        }
      }
      set({ isLoading: false });
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      removeTokenCookie();
      set({ isLoading: false });
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true });
    try {
      await authService.verifyEmail(token);
      set((state) => ({
        user: state.user ? { ...state.user, emailVerified: true } : null,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  sendVerificationToken: async (email) => {
    set({ isLoading: true });
    try {
      await authService.sendVerificationToken(email);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  forgotPassword: async (payload) => {
    set({ isLoading: true });
    try {
      await authService.forgotPassword(payload);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resetPassword: async (payload) => {
    set({ isLoading: true });
    try {
      await authService.resetPassword(payload);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (payload) => {
    set({ isLoading: true });
    try {
      await authService.changePassword(payload);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
