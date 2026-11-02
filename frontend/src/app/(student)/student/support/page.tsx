"use client";

import { PageContainer } from "@/components/layout";
import { UserSupportView } from "@/features/support/components/UserSupportView";

export default function StudentSupportPage() {
  return (
    <PageContainer title="Support" subtitle="Get help and manage your support tickets">
      <UserSupportView basePath="/student/support" />
    </PageContainer>
  );
}
