"use client";

import * as React from "react";
import {
  ExternalLink, Eye, Share2, Globe, GlobeOff,
  MessageSquare, Image, FileText, Tag, Sparkles, Highlighter,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterBar, type FilterDef } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { FeePlanStatusBadge } from "@/features/finance/components/StatusBadge";
import { useFeePlans } from "@/features/finance/hooks/useFeePlans";
import { useAuthStore } from "@/store/auth.store";
import { Receipt, Wallet, Ban, Users } from "lucide-react";
import { toast } from "sonner";
import type { FeePlan } from "@/services/finance";

const statusFilters: FilterDef[] = [
  {
    key: "status",
    label: "All Statuses",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

function useShareLink() {
  const share = React.useCallback(async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }, []);
  return share;
}

export default function FeePlansPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "";
  const canManage = role === "SUPER_ADMIN" || role === "OWNER" || role === "BRANCH_MANAGER";
  const share = useShareLink();

  const {
    loading, feePlans, total,
    page, setPage, pageSize,
    search, setSearch,
    statusFilter, setStatusFilter,
    courseFilter, setCourseFilter,
    sortKey, sortDir, handleSort,
    modalOpen, setModalOpen,
    editingFeePlan, saving,
    openEdit, onSubmit, handleTogglePublic,
    courseOptions,
    register, errors, handleSubmit, setValue, watch,
  } = useFeePlans();

  const getShareUrl = () => {
    const slug = user?.tenantSlug || (user?.tenantName || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `${typeof window !== "undefined" ? window.location.origin : ""}/services/${slug}/class`;
  };

  const handleShare = () => {
    share(getShareUrl(), "Check out our fee plans");
  };

  const columns: Column<FeePlan>[] = React.useMemo(() => [
    { key: "planName", header: "Plan Name", sortable: true },
    { key: "module", header: "Module", sortable: true, render: (row) => <Badge size="sm" variant="outline">{row.module}</Badge> },
    { key: "sourceName", header: "Source", sortable: true },
    {
      key: "feeType",
      header: "Fee Type",
      render: (row) => {
        const labels: Record<string, string> = { ONE_TIME: "One-time", MONTHLY: "Monthly", QUARTERLY: "Quarterly", TERM: "Term", YEARLY: "Yearly" };
        return labels[row.feeType] || row.feeType;
      },
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      render: (row) => `₹${row.totalAmount.toLocaleString()}`,
    },
    { key: "installments", header: "Installments" },
    {
      key: "durationMonths",
      header: "Duration",
      render: (row) => row.durationMonths ? `${row.durationMonths} mo` : "-",
    },
    {
      key: "isPublic",
      header: "Visibility",
      sortable: true,
      render: (row) => (
        <button
          onClick={() => handleTogglePublic(row, !row.isPublic)}
          className="inline-flex items-center gap-1 transition-colors hover:opacity-80"
          title={row.isPublic ? "Click to make private" : "Click to make public"}
        >
          {row.isPublic ? (
            <Badge variant="success" size="sm">
              <Globe size={12} className="mr-1" />
              Public
            </Badge>
          ) : (
            <Badge variant="default" size="sm">
              <GlobeOff size={12} className="mr-1" />
              Private
            </Badge>
          )}
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <FeePlanStatusBadge status={row.status} />,
    },
    {
      key: "studentsAssigned",
      header: "Students",
      render: (row) => (
        <span className="tabular-nums">{row.studentsAssigned}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created Date",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => share(getShareUrl(), `Fee Plan - ${row.planName}`)}
            title="Share"
          >
            <Share2 size={14} />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => {}} title="View">
            <Eye size={14} />
          </Button>
          {canManage && (
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => openEdit(row)}
                title="Edit"
              >
                <ExternalLink size={14} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [openEdit, handleTogglePublic, canManage, share]);

  const activePlans = feePlans.filter((fp) => fp.status === "active");
  const inactivePlans = feePlans.filter((fp) => fp.status === "inactive");
  const publicPlans = feePlans.filter((fp) => fp.isPublic);
  const totalStudents = feePlans.reduce((sum, fp) => sum + fp.studentsAssigned, 0);

  return (
    <PageContainer
      title="Fee Plans"
      subtitle="Manage fee plan templates"
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Share2 size={16} />}
              onClick={handleShare}
            >
              Share Catalog
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Fee Plans"
          value={total}
          icon={<Receipt size={20} />}
        />
        <StatCard
          title="Active Plans"
          value={activePlans.length}
          icon={<Wallet size={20} />}
          delta={`${total > 0 ? Math.round((activePlans.length / total) * 100) : 0}%`}
          deltaType="increase"
        />
        <StatCard
          title="Inactive Plans"
          value={inactivePlans.length}
          icon={<Ban size={20} />}
        />
        <StatCard
          title="Public Plans"
          value={publicPlans.length}
          icon={<Globe size={20} />}
        />
        <StatCard
          title="Students Assigned"
          value={totalStudents}
          icon={<Users size={20} />}
        />
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by plan name or course..."
          className="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={[{ value: "", label: "All Courses" }, ...courseOptions.map((c) => ({ value: c.value, label: c.label }))]}
            value={courseFilter}
            onChange={(val) => { setCourseFilter(val); setPage(1); }}
            className="w-44"
            aria-label="Filter by course"
          />
          <FilterBar
            filters={statusFilters}
            active={{ status: statusFilter }}
            onChange={(key, value) => { setStatusFilter(value); setPage(1); }}
            onClear={() => { setStatusFilter(""); setCourseFilter(""); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : feePlans.length === 0 ? (
        <EmptyState
          title="No fee plans found"
          description={search || statusFilter ? "Try adjusting your search or filters" : "Fee plans are managed from the linked class, rental item, or event"}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={feePlans}
            loading={false}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Fee Plan"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Plan Name"
              required
              error={errors.planName?.message}
              {...register("planName")}
              placeholder="e.g. Standard Plan"
            />
            <SearchableSelect
              label="Course"
              placeholder="Search course..."
              options={courseOptions}
              value={editingFeePlan?.courseId ?? ""}
              onChange={(v) => setValue("courseId", v || undefined)}
              error={errors.courseId?.message}
              emptyMessage="No courses available"
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Fee Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Fee Type"
                required
                options={[
                  { value: "MONTHLY", label: "Monthly" },
                  { value: "QUARTERLY", label: "Quarterly" },
                  { value: "TERM", label: "Term" },
                  { value: "YEARLY", label: "Yearly" },
                  { value: "ONE_TIME", label: "One-time" },
                ]}
                error={errors.feeType?.message}
                value={watch("feeType")}
                onChange={(val) => setValue("feeType", val, { shouldValidate: true })}
              />
              <Input
                label="Total Amount"
                type="number"
                required
                error={errors.totalAmount?.message}
                {...register("totalAmount")}
                placeholder="0"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Plan Settings</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Installments"
                type="number"
                required
                error={errors.installments?.message}
                {...register("installments")}
                placeholder="1"
              />
              <Input
                label="Duration (months)"
                type="number"
                required
                error={errors.durationMonths?.message}
                {...register("durationMonths")}
                placeholder="e.g. 6"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Public Display</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Description"
                error={errors.description?.message}
                {...register("description")}
                placeholder="Brief description for public catalog"
              />
              <Input
                label="Greeting Message"
                error={errors.greeting?.message}
                {...register("greeting")}
                placeholder="e.g. Welcome to our academy!"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <Image size={14} /> Media & Template
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Template Style"
                options={[
                  { value: "", label: "Default" },
                  { value: "standard", label: "Standard" },
                  { value: "premium", label: "Premium" },
                  { value: "compact", label: "Compact" },
                  { value: "brochure", label: "Brochure" },
                ]}
                error={errors.template?.message}
                value={watch("template") ?? ""}
                onChange={(val) => setValue("template", val, { shouldValidate: true })}
              />
              <Input
                label="Image URL"
                error={errors.imageUrl?.message}
                {...register("imageUrl")}
                placeholder="https://example.com/image.png"
              />
              <Input
                label="Brochure / PDF URL"
                error={errors.pdfUrl?.message}
                {...register("pdfUrl")}
                placeholder="https://example.com/brochure.pdf"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <Sparkles size={14} /> Benefits & Hook Words
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Benefits (comma separated)"
                error={errors.benefits?.message}
                {...register("benefits")}
                placeholder="e.g. Expert trainers, Flexible timing, Free trial"
              />
              <Input
                label="Hook Words (comma separated)"
                error={errors.hookWords?.message}
                {...register("hookWords")}
                placeholder="e.g. Learn, Grow, Excel"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <Highlighter size={14} /> Highlight Fields
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Textarea
                label="Highlight Configuration (JSON)"
                error={errors.highlightFields?.message}
                {...register("highlightFields")}
                placeholder='{"certification": true, "placement": true, "liveProjects": false}'
                rows={3}
              />
            </div>
          </div>
        </div>
      </Modal>

    </PageContainer>
  );
}
