"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, Copy, Trash2, Eye } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Card, CardBody, Badge, Skeleton, EmptyState } from "@/components/ui";
import { certificatesService } from "@/services/certificates.service";
import type { CertificateTemplate } from "@/types/certificates";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CertificateTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const list = await certificatesService.listTemplates();
      setTemplates(list);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDuplicate = async (id: string) => {
    try {
      await certificatesService.duplicateTemplate(id);
      toast.success("Template duplicated");
      fetch();
    } catch {
      toast.error("Failed to duplicate template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this template?")) return;
    try {
      await certificatesService.deleteTemplate(id);
      toast.success("Template deactivated");
      fetch();
    } catch {
      toast.error("Failed to deactivate template");
    }
  };

  return (
    <PageContainer
      title="Certificate Templates"
      subtitle="Design and manage certificate templates"
      actions={
        <Link href="/super-admin/certificate-templates/new">
          <Button size="sm"><Plus size={16} /> New Template</Button>
        </Link>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="No templates yet"
          description="Create your first certificate template to get started"
          action={{ label: "Create Template", onClick: () => router.push("/super-admin/certificate-templates/new") }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} variant="default" className="hover:shadow-[var(--shadow-2)] transition-shadow">
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text-primary truncate">{t.name}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t.orientation} / {t.paperSize}
                    </p>
                  </div>
                  <Badge size="sm" variant={t.isActive ? "success" : "danger"}>
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {t.backgroundUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.backgroundUrl}
                    alt=""
                    className="w-full h-28 object-cover rounded-[var(--radius-xs)] mb-3"
                  />
                )}

                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>{t.fields ? (t.fields as unknown as unknown[]).length : 0} fields</span>
                  <span>·</span>
                  <span>{t.isDefault ? "Default" : "Custom"}</span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="xs" variant="ghost" onClick={() => router.push(`/super-admin/certificate-templates/${t.id}`)}>
                    <Eye size={14} /> Edit
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => handleDuplicate(t.id)}>
                    <Copy size={14} /> Duplicate
                  </Button>
                  {t.isActive && (
                    <Button size="xs" variant="ghost" className="ml-auto text-danger" onClick={() => handleDelete(t.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
