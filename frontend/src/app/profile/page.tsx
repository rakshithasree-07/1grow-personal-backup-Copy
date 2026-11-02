"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Loader2 } from "lucide-react";

const ROLE_TO_PREFIX: Record<string, string> = {
  OWNER: "/owner",
  STAFF: "/staff",
  STUDENT: "/student",
  CLIENT: "/client",
  SUPER_ADMIN: "/super-admin",
  BRANCH_MANAGER: "/branch-manager",
  TRAINER: "/trainer",
};

export default function ProfileRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;
    const params = searchParams.toString();
    const qs = params ? `?${params}` : "";

    if (!user) {
      router.replace(`/login${qs}`);
      return;
    }

    const prefix = ROLE_TO_PREFIX[user.role] ?? "/owner";
    router.replace(`${prefix}/profile${qs}`);
  }, [user, isLoading, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
