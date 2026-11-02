"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Phone, Mail, BookOpen, MapPin, Calendar, MessageSquare } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Card, CardBody } from "@/components/ui";
import { LeadForm } from "../components/LeadForm";
import { createLead } from "@/services/leads";
import { getBranches, type Branch } from "@/services/branches";
import { useRolePath } from "@/hooks/useRolePrefix";
import { getMessage } from "@/services/api-client";
import { toast } from "sonner";

export function CreateLeadPage() {
  const router = useRouter();
  const rolePath = useRolePath();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    getBranches()
      .then((res) => setBranches(res.data ?? []))
      .catch(() => {})
      .finally(() => setBranchesLoading(false));
  }, []);

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const res = await createLead(formData);
      toast.success("Lead created successfully");
      router.push(rolePath(`/leads/${res.data.id}`));
    } catch (err) {
      toast.error(getMessage(err) || "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Create Lead"
      subtitle="Add a new lead to your pipeline"
      back={() => router.push(rolePath("/leads"))}
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardBody className="py-6">
            {/* Form Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserPlus size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Lead Information</h3>
                <p className="text-xs text-text-secondary">Fill in the details below to create a new lead</p>
              </div>
            </div>

            <LeadForm
              onSubmit={handleSubmit}
              onCancel={() => router.push(rolePath("/leads"))}
              loading={loading}
              branches={branches}
              branchesLoading={branchesLoading}
            />
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
