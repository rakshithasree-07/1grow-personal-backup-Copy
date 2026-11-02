import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError } from "axios";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not defined. Set it in your .env file.",
  );
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function getItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /** noop */
  }
}

function removeItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /** noop */
  }
}

export function getAccessToken(): string | null {
  return getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  setItem(ACCESS_TOKEN_KEY, accessToken);
  setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  removeItem(ACCESS_TOKEN_KEY);
  removeItem(REFRESH_TOKEN_KEY);
}

const TECHNICAL_PATTERNS: [RegExp, string][] = [
  [/property .+ should not exist/i, "Unexpected field. Please refresh and try again."],
  [/whitelist/i, "Unexpected field in request. Please refresh and try again."],
  [/forbiddenNonWhitelisted/i, "Unexpected field in request."],
  [/Validation failed/i, "Please check your input and try again."],
  [/is not a valid (enum|string|date|number)/i, "One or more fields have invalid values."],
  [/unique constraint/i, "This record already exists."],
  [/foreign key constraint/i, "This operation references a record that doesn't exist."],
  [/Cannot find/i, "The requested resource was not found."],
  [/ECONNREFUSED/i, "Unable to connect to the server. Please try again later."],
  [/ETIMEDOUT/i, "Connection timed out. Please check your network."],
  [/ENOTFOUND/i, "Server not found. Please check your connection."],
  [/ERR_NETWORK/i, "Network error. Please check your connection."],
  [/ERR_BAD_REQUEST/i, "Invalid request. Please check your input."],
  [/jwt (malformed|invalid|expired)/i, "Your session has expired. Please log in again."],
  [/Cannot read propert/i, "Something went wrong. Please try again."],
];

function humanize(raw: string): string {
  for (const [pattern, friendly] of TECHNICAL_PATTERNS) {
    if (pattern.test(raw)) return friendly;
  }
  return raw;
}

export function getMessage(error: unknown): string {
  const axiosError = error as AxiosError;
  const data = axiosError.response?.data as { message?: string | string[] } | undefined;
  if (data?.message) {
    const msg = Array.isArray(data.message) ? data.message.join("; ") : data.message;
    return humanize(msg);
  }
  if (!axiosError.response) return "Network error. Please check your connection.";
  if (axiosError.response.status === 404) return "Resource not found.";
  if (axiosError.response.status === 401) return "Your session has expired. Please log in again.";
  if (axiosError.response.status === 403) return "You don't have permission for this action.";
  if (axiosError.response.status >= 500) return "Server error. Please try again later.";
  return "Something went wrong. Please try again.";
}

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((item) => {
    if (token) {
      item.resolve(token);
    } else {
      item.reject(error);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");
    const isAuthEndpoint = originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearTokens();
          return Promise.reject(error);
        }

        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = getMessage(error);

    if (error.response?.status === 401 && !isRefreshRequest && !isAuthEndpoint && typeof window !== "undefined") {
      clearTokens();
      window.location.href = "/login";
    }

    return Promise.reject(new Error(message));
  },
);

export { apiClient };
