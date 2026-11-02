const ROLE_PATH_PREFIXES = [
  "/super-admin",
  "/branch-manager",
  "/owner",
  "/staff",
  "/student",
  "/client",
] as const;

export type RolePathPrefix = (typeof ROLE_PATH_PREFIXES)[number];

/** Derive the active role route prefix from the current pathname (e.g. `/staff/leads` → `/staff`). */
export function getRolePrefixFromPathname(pathname: string): RolePathPrefix {
  const match = ROLE_PATH_PREFIXES.find((prefix) => pathname.startsWith(prefix));
  return match ?? "/owner";
}

/** Build a role-scoped path using the current route prefix. */
export function rolePath(prefix: string, segment: string): string {
  const normalized = segment.startsWith("/") ? segment : `/${segment}`;
  return `${prefix}${normalized}`;
}
