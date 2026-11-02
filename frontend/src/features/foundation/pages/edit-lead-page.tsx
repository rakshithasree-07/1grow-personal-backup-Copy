"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Card, CardBody, Skeleton } from "@/components/ui";
import { LeadForm } from "../components/LeadForm";
import { getLead, updateLead, type Lead } from "@/services/leads";
import { getBranches, type Branch } from "@/services/branches";
import { useRolePath } from "@/hooks/useRolePrefix";
import { getMessage } from "@/services/api-client";
import { toast } from "sonner";

interface EditLeadPageProps {
  leadId: string;
}

export function EditLeadPage({ leadId }: EditLeadPageProps) {
  const router = useRouter();
  const rolePath = useRolePath();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getLead(leadId),
      getBranches(),
    ])
      .then(([leadRes, branchesRes]) => {
        setLead(leadRes.data);
        setBranches(branchesRes.data ?? []);
      })
      .catch(() => { toast.error("Lead not found"); router.push(rolePath("/leads")); })
      .finally(() => { setLoading(false); setBranchesLoading(false); });
  }, [leadId, router]);

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      await updateLead(leadId, formData);
      toast.success("Lead updated successfully");
      router.push(rolePath(`/leads/${leadId}`));
    } catch (err) {
      toast.error(getMessage(err) || "Failed to update lead");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer back={() => router.push(rolePath("/leads"))} title="Edit Lead">
        <Card className="max-w-2xl"><CardBody><div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-[var(--radius-sm)]" />)}</div></CardBody></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Edit Lead"
      subtitle={`Editing ${lead?.name}`}
      back={() => router.push(rolePath(`/leads/${leadId}`))}
    >
      <Card className="max-w-2xl">
        <CardBody>
          <LeadForm initialData={lead} onSubmit={handleSubmit} onCancel={() => router.push(rolePath(`/leads/${leadId}`))} loading={submitting} branches={branches} branchesLoading={branchesLoading} />
        </CardBody>
      </Card>
    </PageContainer>
  );
}
