import type { AuthUser } from "@/services/auth.service";

const RESTRICTED_ROLES = ["STAFF", "STUDENT", "BRANCH_MANAGER", "CLIENT"];

/** User is waiting for approval from org admin */
export function isPendingApproval(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.status === "ACCESS_REQUESTED" || user.status === "PENDING_APPROVAL";
}

/** User's request was rejected — can re-request to another org */
export function isRejected(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.status === "PROFILE_COMPLETED" && RESTRICTED_ROLES.includes(user.role);
}

/** User cannot access full app — either pending or rejected */
export function isAccessRestricted(user: AuthUser | null | undefined): boolean {
  return isPendingApproval(user) || isRejected(user);
}
