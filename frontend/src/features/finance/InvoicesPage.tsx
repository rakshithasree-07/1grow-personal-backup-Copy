"use client";

import * as React from "react";
import { Plus, Eye, Download, Printer } from "lucide-react";
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
import { InvoiceStatusBadge } from "@/features/finance/components/StatusBadge";
import { useInvoices } from "@/features/finance/hooks/useInvoices";
import { useAuthStore } from "@/store/auth.store";
import { FileText, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { Invoice } from "@/services/finance";
import { downloadInvoicePdf, type InvoicePdfData } from "@/utils/invoice-pdf";

const statusFilters: FilterDef[] = [
  {
    key: "status",
    label: "All Statuses",
    options: [
      { value: "paid", label: "Paid" },
      { value: "partial", label: "Partial" },
      { value: "overdue", label: "Overdue" },
      { value: "pending", label: "Pending" },
    ],
  },
];

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function InvoicesPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "";
  const canManage = role === "SUPER_ADMIN" || role === "OWNER" || role === "BRANCH_MANAGER";

  const {
    loading, invoices, total,
    page, setPage, pageSize,
    search, setSearch,
    statusFilter, setStatusFilter,
    dateFrom, setDateFrom, dateTo, setDateTo,
    sortKey, sortDir, handleSort,
    modalOpen, setModalOpen,
    saving,
    openCreate, onSubmit,
    studentOptions, feePlanOptions, feePlans,
    handleFeePlanChange,
    register, errors, handleSubmit,
    setValue, watch,
    summaryCards,
  } = useInvoices();

  const selectedFeePlanId = watch("feePlanId");
  const selectedFeePlan = React.useMemo(
    () => feePlans.find((p) => p.id === selectedFeePlanId),
    [feePlans, selectedFeePlanId]
  );
  const currentAmount = watch("amount");

  const columns: Column<Invoice>[] = React.useMemo(() => [
    { key: "invoiceNumber", header: "Invoice #", sortable: true },
    { key: "studentName", header: "Student", sortable: true },
    { key: "courseName", header: "Course" },
    { key: "feePlanName", header: "Fee Plan" },
    {
      key: "totalAmount",
      header: "Total",
      render: (row) => `₹${row.totalAmount.toLocaleString()}`,
    },
    {
      key: "paidAmount",
      header: "Paid",
      render: (row) => `₹${row.paidAmount.toLocaleString()}`,
    },
    {
      key: "dueAmount",
      header: "Due",
      render: (row) => (
        <span className={row.dueAmount > 0 ? "text-danger font-medium" : "text-success"}>
          ₹{row.dueAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "issueDate",
      header: "Issue Date",
      render: (row) => new Date(row.issueDate).toLocaleDateString(),
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (row) => new Date(row.dueDate).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={() => {}} title="View">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => {
            const pdfData: InvoicePdfData = {
              invoiceNumber: row.invoiceNumber,
              studentName: row.studentName,
              courseName: row.courseName,
              feePlanName: row.feePlanName,
              totalAmount: row.totalAmount,
              paidAmount: row.paidAmount,
              dueAmount: row.dueAmount,
              issueDate: row.issueDate,
              dueDate: row.dueDate,
              status: row.status,
              notes: row.notes,
            };
            downloadInvoicePdf(pdfData, `invoice-${row.invoiceNumber}.pdf`);
          }} title="Download PDF">
            <Download size={14} />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => window.print()} title="Print">
            <Printer size={14} />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <PageContainer
      title="Invoices"
      subtitle="Manage student invoices"
      actions={
        canManage ? (
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Create Invoice
          </Button>
        ) : undefined
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={summaryCards.total}
          icon={<FileText size={20} />}
        />
        <StatCard
          title="Paid"
          value={summaryCards.paid}
          icon={<CheckCircle2 size={20} />}
          deltaType="increase"
        />
        <StatCard
          title="Partial"
          value={summaryCards.partial}
          icon={<Clock size={20} />}
          deltaType="neutral"
        />
        <StatCard
          title="Overdue"
          value={summaryCards.overdue}
          icon={<AlertTriangle size={20} />}
          deltaType="decrease"
        />
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by student or invoice #…"
          className="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            label="From Date"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-36"
          />
          <Input
            label="To Date"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-36"
          />
          <FilterBar
            filters={statusFilters}
            active={{ status: statusFilter }}
            onChange={(key, value) => { setStatusFilter(value); setPage(1); }}
            onClear={() => { setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description={search || statusFilter ? "Try adjusting your search or filters" : "Create your first invoice to get started"}
          action={!search && !statusFilter && canManage ? { label: "Create Invoice", onClick: openCreate } : undefined}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={invoices}
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
        title="Create Invoice"
        description="Generate a new invoice for a student with fee plan or custom amount."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={saving}>
              Create Invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Row 1: Student and Fee Plan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Student Name"
              required
              placeholder="Search student..."
              options={studentOptions}
              value={watch("studentId") ?? ""}
              onChange={(v) => setValue("studentId", v, { shouldValidate: true })}
              error={errors.studentId?.message}
              emptyMessage="No students available"
            />
            <div>
              <SearchableSelect
                label="Fee Plan"
                placeholder="Search fee plan (optional)..."
                options={feePlanOptions}
                value={watch("feePlanId") ?? ""}
                onChange={handleFeePlanChange}
                error={errors.feePlanId?.message}
                emptyMessage="No fee plans available"
              />
              <p className="mt-1 text-xs text-text-secondary">
                {selectedFeePlan
                  ? `Configured Fee: ${formatINR(selectedFeePlan.totalAmount)}`
                  : "Selecting a plan auto-populates the amount"}
              </p>
            </div>
          </div>

          {/* Row 2: Total Amount and Live Amount Display */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Total Amount"
              type="number"
              min="1"
              step="any"
              required
              leftAddon={<span className="text-text-secondary font-medium">₹</span>}
              placeholder="e.g. 5000"
              error={errors.amount?.message}
              hint={
                selectedFeePlan && Number(currentAmount) === selectedFeePlan.totalAmount
                  ? "Auto-populated from selected fee plan"
                  : "Enter total invoice amount in INR"
              }
              {...register("amount", { valueAsNumber: true })}
            />
            <div className="flex flex-col justify-end">
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised px-4 py-2.5">
                <span className="text-xs text-text-secondary block">Calculated Invoice Amount</span>
                <span className="text-lg font-bold text-primary tabular-nums">
                  {formatINR(Number(currentAmount) || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Issue Date and Due Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Issue Date"
              type="date"
              required
              error={errors.issueDate?.message}
              {...register("issueDate")}
            />
            <Input
              label="Due Date"
              type="date"
              required
              min={watch("issueDate")}
              error={errors.dueDate?.message}
              {...register("dueDate")}
            />
          </div>

          {/* Row 4: Notes */}
          <Textarea
            label="Notes"
            {...register("notes")}
            placeholder="Optional notes or billing instructions for this invoice"
          />

          {/* Summary Callout before submission */}
          {Number(currentAmount) > 0 && (
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised/70 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Billing:</span>
                <span className="font-medium text-text-primary">
                  {studentOptions.find((s) => s.value === watch("studentId"))?.label || "Student not selected"}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Payment Window:</span>
                <span className="font-medium text-text-primary">
                  {watch("issueDate") && watch("dueDate")
                    ? `${new Date(watch("issueDate")).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → ${new Date(watch("dueDate")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Dates not set"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-1.5 font-semibold text-text-primary">
                <span>Total Payable:</span>
                <span className="text-sm text-primary font-bold tabular-nums">
                  {formatINR(Number(currentAmount) || 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
