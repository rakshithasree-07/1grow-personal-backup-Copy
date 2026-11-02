"use client";

import * as React from "react";
import { getBranding } from "@/services/branding";
import { useAuthStore } from "@/store/auth.store";

// ─── localStorage key ─────────────────────────────────────────────────────────
export const BRAND_CACHE_KEY = "ka_brand";

export interface BrandCache {
  primary: string;
  secondary: string;
}

export function readBrandCache(): BrandCache | null {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrandCache;
  } catch {
    return null;
  }
}

function writeBrandCache(primary: string, secondary: string) {
  try {
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify({ primary, secondary }));
  } catch {}
}

export function clearBrandCache() {
  try {
    localStorage.removeItem(BRAND_CACHE_KEY);
  } catch {}
}

// ─── CSS var helper ───────────────────────────────────────────────────────────

function getLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function applyCSSVars(primary: string, secondary: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", getLuminance(primary) > 0.5 ? "#0f172a" : "#ffffff");
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--secondary-foreground", getLuminance(secondary) > 0.5 ? "#0f172a" : "#ffffff");
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface BrandThemeContextValue {
  primaryColor: string | null;
  secondaryColor: string | null;
  applyBrandTheme: (primary: string, secondary: string) => void;
  clearBrandTheme: () => void;
}

const BrandThemeContext = React.createContext<BrandThemeContextValue>({
  primaryColor: null,
  secondaryColor: null,
  applyBrandTheme: () => {},
  clearBrandTheme: () => {},
});

export function useBrandTheme() {
  return React.useContext(BrandThemeContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

function removeCSSVars() {
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--primary-foreground");
  root.style.removeProperty("--secondary");
  root.style.removeProperty("--secondary-foreground");
}

export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Initialise state from cache so it's already correct by the time React renders.
  const [primaryColor, setPrimaryColor] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readBrandCache()?.primary ?? null;
  });
  const [secondaryColor, setSecondaryColor] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readBrandCache()?.secondary ?? null;
  });

  const applyBrandTheme = React.useCallback((primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    applyCSSVars(primary, secondary);
    writeBrandCache(primary, secondary);
  }, []);

  const clearBrandTheme = React.useCallback(() => {
    setPrimaryColor(null);
    setSecondaryColor(null);
    removeCSSVars();
  }, []);

  // const clearBrandTheme = React.useCallback(() => {
  //   setPrimaryColor(null);
  //   setSecondaryColor(null);
  //   removeCSSVars();
  // }, []);

  // On mount: apply cached colours immediately (the blocking script already did
  // this before paint, but this keeps React state in sync), then fetch fresh
  // from the API to pick up any admin changes.
  React.useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      clearBrandTheme();
      return;

    // Apply cache immediately so there is no flash even if the effect fires
    // slightly after the inline script.
    // const cached = readBrandCache();
    // if (cached) {
    //   applyCSSVars(cached.primary, cached.secondary);
    //   setPrimaryColor(cached.primary);
    //   setSecondaryColor(cached.secondary);
    // }

    // Fetch fresh branding — silently update cache if changed.
    }
    getBranding()
      .then((res) => {
        const p = res.data.primaryColor;
        const s = res.data.secondaryColor;
        if (p) {
          applyBrandTheme(p, s ?? p);
        } else {
          clearBrandTheme();
        }
      })
      .catch(() => {
        clearBrandTheme();
      });
  }, [isAuthenticated, applyBrandTheme, clearBrandTheme]);

  return (
    <BrandThemeContext.Provider value={{ primaryColor, secondaryColor, applyBrandTheme, clearBrandTheme }}>
      {children}
    </BrandThemeContext.Provider>
  );
}
