import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_ORIGIN = (() => {
  try { return new URL(API_URL).origin; } catch { return API_URL; }
})();

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `connect-src 'self' ${API_ORIGIN} https://api.brevo.com https://accounts.google.com`,
  "frame-src https://accounts.google.com",
].join("; ");

const protectedRoutes = [
  "/onboarding",
  "/dashboard",
  "/super-admin",
  "/owner",
  "/branch-manager",
  "/staff",
  "/student",
  "/client",
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", CSP);

  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const token = request.cookies.get("accessToken")?.value;

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|icons/logo.png).*)",
};
