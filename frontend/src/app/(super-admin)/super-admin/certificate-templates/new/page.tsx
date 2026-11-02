"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { CertificateTemplateDesigner } from "@/features/super-admin/components/CertificateTemplateDesigner";
import { certificatesService } from "@/services/certificates.service";
import { toast } from "sonner";

export default function NewCertificateTemplatePage() {
  const router = useRouter();

  const handleSave = async (data: { name: string; fields: any[]; backgroundUrl?: string; htmlContent: string; cssStyles?: string }) => {
    try {
      const result = await certificatesService.createTemplate({
        name: data.name,
        htmlContent: data.htmlContent,
        cssStyles: data.cssStyles,
        fields: data.fields as any,
        backgroundUrl: data.backgroundUrl,
      });
      toast.success("Template created");
      router.push(`/super-admin/certificate-templates/${result.id}`);
    } catch {
      toast.error("Failed to create template");
      throw new Error("Failed to save");
    }
  };

  return (
    <PageContainer title="New Certificate Template" subtitle="Design a certificate template using the visual designer">
      <CertificateTemplateDesigner onSave={handleSave} />
    </PageContainer>
  );
}
