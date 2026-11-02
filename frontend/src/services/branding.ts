import { apiClient } from "./api-client";
import type { ApiResponse } from "./types";

export interface BusinessHours {
  [day: string]: { open: string; close: string; closed: boolean };
}

export interface Branding {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  tagline: string | null;
  description: string | null;
  customDomain: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
  businessHours: BusinessHours | null;
}

export interface UpdateBrandingRequest {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  tagline?: string;
  description?: string;
  customDomain?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialYoutube?: string;
  businessHours?: BusinessHours;
}

export async function getBranding(): Promise<ApiResponse<Branding>> {
  const response = await apiClient.get<ApiResponse<Branding>>(
    "/training/branding",
  );
  return response.data;
}

export async function updateBranding(
  data: UpdateBrandingRequest,
): Promise<ApiResponse<Branding>> {
  const response = await apiClient.patch<ApiResponse<Branding>>(
    "/training/branding",
    data,
  );
  return response.data;
}
