"use client";

import { PageContainer } from "@/components/layout";
import { UserSupportView } from "@/features/support/components/UserSupportView";

export default function StaffSupportPage() {
  return (
    <PageContainer title="Support" subtitle="Get help and manage your support tickets">
      <UserSupportView basePath="/staff/support" />
    </PageContainer>
  );
}
