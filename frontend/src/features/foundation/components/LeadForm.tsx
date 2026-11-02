"use client";

import { useState, useCallback } from "react";
import { Phone, Mail, BookOpen, MapPin, Calendar, MessageSquare } from "lucide-react";
import { Button, Input, Select, Textarea, SearchableSelect, DatePicker } from "@/components/ui";
import type { Lead, LeadSource, LeadStatus } from "@/services/leads";
import type { Branch } from "@/services/branches";
import { cn } from "@/lib/cn";

interface LeadFormProps {
  initialData?: Lead | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  branches?: Branch[];
  branchesLoading?: boolean;
}

function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", color)}>
        <Icon size={12} className="text-current" />
      </div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h4>
    </div>
  );
}

export function LeadForm({ initialData, onSubmit, onCancel, loading, branches, branchesLoading }: LeadFormProps) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    course: initialData?.course ?? "",
    source: initialData?.source ?? ("WALK_IN" as LeadSource),
    status: initialData?.status ?? ("NEW" as LeadStatus),
    notes: initialData?.notes ?? "",
    assignedTo: initialData?.assignedTo ?? "",
    nextFollowUp: initialData?.nextFollowUp ?? "",
    branchId: initialData?.branchId ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhone = useCallback((phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "Phone number is required";
    if (digits.length !== 10) return "Phone number must be 10 digits";
    return "";
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((p) => ({ ...p, phone: digits }));
    if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }
    const phoneError = validatePhone(form.phone);
    if (phoneError) newErrors.phone = phoneError;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Section */}
      <div>
        <SectionHeader icon={Phone} title="Contact Details" color="bg-primary/10 text-primary" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
            placeholder="Enter full name"
            required
            autoComplete="name"
            className="sm:col-span-2"
            error={errors.name}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={handlePhoneChange}
            placeholder="10-digit phone number"
            required
            inputMode="tel"
            autoComplete="tel"
            maxLength={10}
            error={errors.phone}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }}
            placeholder="Enter email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errors.email}
          />
        </div>
      </div>

      {/* Course & Source Section */}
      <div>
        <SectionHeader icon={BookOpen} title="Lead Details" color="bg-success/10 text-success" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Course Interested"
            value={form.course}
            onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
            placeholder="e.g. Bharatanatyam"
          />
          <Select
            label="Lead Source"
            value={form.source}
            onChange={(val) => setForm((p) => ({ ...p, source: val as LeadSource }))}
            placeholder="Select source..."
            options={[
              { value: "WALK_IN", label: "Walk In" },
              { value: "PHONE", label: "Phone" },
              { value: "WEBSITE", label: "Website" },
              { value: "SOCIAL_MEDIA", label: "Social Media" },
              { value: "REFERRAL", label: "Referral" },
              { value: "ADVERTISEMENT", label: "Advertisement" },
              { value: "PUBLIC_INQUIRY", label: "Public Inquiry" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(val) => setForm((p) => ({ ...p, status: val as LeadStatus }))}
            placeholder="Select status..."
            options={[
              { value: "NEW", label: "New" },
              { value: "CONTACTED", label: "Contacted" },
              { value: "FOLLOWUP", label: "Follow Up" },
              { value: "INTERESTED", label: "Interested" },
              { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
              { value: "CONVERTED", label: "Converted" },
              { value: "LOST", label: "Lost" },
            ]}
          />
          {branches && (
            <SearchableSelect
              label="Branch"
              value={form.branchId}
              onChange={(v) => setForm((p) => ({ ...p, branchId: v }))}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Select branch..."
              searchPlaceholder="Search branches..."
              loading={branchesLoading}
            />
          )}
          <Input
            label="Assigned To (User ID)"
            value={form.assignedTo}
            onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
            placeholder="Enter user UUID"
          />
        </div>
      </div>

      {/* Follow-up Section */}
      <div>
        <SectionHeader icon={Calendar} title="Follow-up & Notes" color="bg-warning/10 text-warning" />
        <div className="grid grid-cols-1 gap-4">
          <DatePicker
            label="Next Follow-up"
            value={form.nextFollowUp}
            onChange={(v) => setForm((p) => ({ ...p, nextFollowUp: v }))}
            placeholder="Pick date and time..."
            showTimePicker
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Add any notes about this lead..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
