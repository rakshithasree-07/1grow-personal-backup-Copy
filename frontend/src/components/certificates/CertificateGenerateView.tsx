"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EntitySearch } from "@/components/shared/EntitySearch";
import { useCertificateMutations, useCertificateTemplates } from "@/hooks/useCertificates";
import { certificateFormSchema, type CertificateFormValues } from "@/validations/certificates";
import { TemplatePreview } from "./TemplatePreview";
import type { CertificateSnapshot } from "@/types/certificates";

interface CertificateGenerateViewProps {
  basePath: string;
}

export function CertificateGenerateView({ basePath }: CertificateGenerateViewProps) {
  const router = useRouter();
  const { templates, loading: templatesLoading, error: templatesError } = useCertificateTemplates();
  const { saving, create } = useCertificateMutations();
  const [preview, setPreview] = React.useState<CertificateSnapshot | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: { studentId: "", templateId: "", batchId: "", courseName: "", issuedDate: "" },
  });

 const templateId = watch("templateId");
const studentId = watch("studentId");
const batchId = watch("batchId");
const courseName = watch("courseName");

const selectedTemplate = templates.find(
  (t) => t.id === templateId
);

const hasTemplates = templates.length > 0;

const onSubmit = async (values: CertificateFormValues) => {
  if (!values.studentId) {
    alert("Please select a student.");
    return;
  }

  if (!values.templateId) {
    alert("Please select a certificate template.");
    return;
  }

  if (!values.batchId && !values.courseName?.trim()) {
    alert("Please select a batch or enter a course name.");
    return;
  }

  try {
    const cert = await create({
      studentId: values.studentId,
      templateId: values.templateId,
      batchId: values.batchId || undefined,
      courseName: values.courseName || undefined,
      issuedDate:
        values.issuedDate ||
        new Date().toISOString().split("T")[0],
    });

    alert("Certificate generated successfully!");

    router.push(`${basePath}/${cert.id}`);
  } catch (error) {
    console.error("Certificate generation failed:", error);
    alert("Certificate generation failed. Please try again.");
  }
};

  return (
    <PageContainer
  title="Generate Certificate"
  subtitle="Select a student, choose a certificate template, and generate a certificate."
  back={() => router.push(basePath)}
>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">Student</label>
                <EntitySearch
                  searchType="students"
                  onSelect={(item) => {
                    setValue("studentId", item.id, { shouldValidate: true });
                    setPreview((p) => ({
                      ...(p ?? {}),
                      student: { id: item.id, name: item.label },
                    }));
                  }}
                />
                {errors.studentId && (
                  <p className="mt-1 text-xs text-danger">{errors.studentId.message}</p>
                )}
              </div>

     {templatesLoading ? (
  <Skeleton className="h-9 w-full" />
) : (
  <>
  <Select
  label="Template"
  required
  placeholder="Select template"
  options={templates.map((t) => ({
    value: t.id,
    label: t.name,
  }))}
  error={errors.templateId?.message}
  value={templateId}
  onChange={(val) => {
    const tpl = templates.find(
      (t) => t.id === val
    );

    setPreview((p) => ({
      ...(p ?? {}),
      template: tpl
        ? {
            id: tpl.id,
            name: tpl.name,
          }
        : undefined,
    }));
    setValue("templateId", val, { shouldValidate: true });
  }}
/>

{templateId && (
  <p className="mt-2 text-xs text-green-600">
    ✓ Template selected successfully
  </p>
)}

{!templates.length && (
  <p className="mt-2 text-sm text-yellow-600">
    {templatesError ? templatesError : "No certificate templates found. Please create one first."}
  </p>
)}
</>
)}


              <div>
  <label className="mb-1 block text-sm font-medium text-text-primary">
    Batch (optional)
  </label>

  <EntitySearch
    searchType="batches"
    onSelect={(item) => {
      setValue("batchId", item.id, {
        shouldValidate: true,
      });

      setPreview((p) => ({
        ...(p ?? {}),
        courseName: item.label,
        batch: {
          id: item.id,
          name: item.label,
        },
      }));
    }}
  />
</div>

              <Input
                label="Course name"
                hint="Required if no batch is selected"
                error={errors.courseName?.message}
                {...register("courseName", {
                  onChange: (e) =>
                    setPreview((p) => ({ ...(p ?? {}), courseName: e.target.value })),
                })}
              />

              <Input label="Issue date" type="date" error={errors.issuedDate?.message} {...register("issuedDate")} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.push(basePath)}>
                  Cancel
                </Button>
<Button
  type="submit"
  loading={saving}
  disabled={
    saving ||
    templatesLoading ||
    !studentId ||
    !templateId ||
    (!batchId && !courseName?.trim())
  }
>
  {saving ? "Generating..." : "Generate Certificate"}
</Button>
              </div>
            </form>
          </CardBody>
        </Card>
        
        <div>
          <p className="mb-3 text-sm font-medium text-text-primary">Preview</p>
          <TemplatePreview
  snapshot={
    preview ?? {
      student: {
        id: "",
        name: "No student selected",
      },
      courseName: "No course selected",
      template: selectedTemplate
        ? {
            id: selectedTemplate.id,
            name: selectedTemplate.name,
          }
        : {
            id: "",
            name: "No template selected",
          },
    }
  }
/>
        </div>
      </div>
    </PageContainer>
  );
}
