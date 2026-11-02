"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { PageContainer } from "@/components/layout";
import { CertificateTemplateDesigner } from "@/features/super-admin/components/CertificateTemplateDesigner";
import { certificatesService } from "@/services/certificates.service";
import { toast } from "sonner";

export default function EditCertificateTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await certificatesService.getTemplate(id);
        setTemplate(data);
      } catch {
        toast.error("Failed to load template");
        router.push("/super-admin/certificate-templates");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleSave = async (data: { name: string; fields: any[]; backgroundUrl?: string; htmlContent: string; cssStyles?: string }) => {
    setSaving(true);
    try {
      await certificatesService.updateTemplate(id, {
        name: data.name,
        fields: data.fields as any,
        backgroundUrl: data.backgroundUrl,
        htmlContent: data.htmlContent,
        cssStyles: data.cssStyles,
      });
      toast.success("Template updated");
    } catch {
      toast.error("Failed to update template");
      throw new Error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Edit Template" subtitle="Loading...">
        <Skeleton className="h-96 rounded-[var(--radius-md)]" />
      </PageContainer>
    );
  }

  if (!template) return null;

  return (
    <PageContainer title={`Edit: ${template.name}`} subtitle="Modify certificate template design">
      <CertificateTemplateDesigner
        initialName={template.name}
        initialFields={template.fields ?? []}
        initialBackgroundUrl={template.backgroundUrl ?? ""}
        onSave={handleSave}
        saving={saving}
      />
    </PageContainer>
  );
}
