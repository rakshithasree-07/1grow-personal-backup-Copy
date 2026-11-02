"use client";

import { PageContainer } from "@/components/layout";
import { AdminSupportView } from "@/features/support/components/AdminSupportView";

export default function SuperAdminSupportPage() {
  return (
    <PageContainer title="Support Center" subtitle="Manage support tickets and customer inquiries">
      <AdminSupportView />
    </PageContainer>
  );
}
