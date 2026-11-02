"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { getRolePrefixFromPathname, rolePath, type RolePathPrefix } from "@/lib/role-prefix";

export function useRolePrefix(): RolePathPrefix {
  const pathname = usePathname();
  return getRolePrefixFromPathname(pathname);
}

/** Returns a helper to build paths under the current role prefix. */
export function useRolePath() {
  const prefix = useRolePrefix();
  return useCallback((segment: string) => rolePath(prefix, segment), [prefix]);
}
