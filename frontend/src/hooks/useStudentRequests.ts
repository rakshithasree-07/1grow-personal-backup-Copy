"use client";

import * as React from "react";
import { getMyAccessRequests } from "@/services/onboarding";

export function useStudentRequests() {
  const [hasRequests, setHasRequests] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkRequests = async () => {
      try {
        const res = await getMyAccessRequests();
        setHasRequests((res.data ?? []).length > 0);
      } catch {
        setHasRequests(false);
      } finally {
        setLoading(false);
      }
    };

    checkRequests();
  }, []);

  return { hasRequests, loading };
}
