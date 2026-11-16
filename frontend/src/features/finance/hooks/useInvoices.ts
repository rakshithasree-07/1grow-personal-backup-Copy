"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  getInvoices,
  createInvoice,
  getFeePlans,
  type Invoice,
  type InvoiceStatus,
  type FeePlan,
} from "@/services/finance";
import { getStudents } from "@/services/students";
import { getCourses } from "@/services/courses";
import type { SearchableOption } from "@/components/ui/SearchableSelect";

export const invoiceSchema = z
  .object({
    studentId: z.string().min(1, "Student is required"),
    feePlanId: z.string().optional(),
    amount: z.number().positive("Amount must be greater than 0"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return new Date(data.dueDate) >= new Date(data.issueDate);
    },
    {
      message: "Due date cannot be earlier than issue date",
      path: ["dueDate"],
    }
  );

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

export interface InvoicesState {
  loading: boolean;
  error: boolean;
  invoices: Invoice[];
  total: number;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  courseFilter: string;
  setCourseFilter: (s: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
  sortKey: string;
  sortDir: "asc" | "desc";
  handleSort: (key: string) => void;
  modalOpen: boolean;
  setModalOpen: (o: boolean) => void;
  saving: boolean;
  openCreate: () => void;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  fetchInvoices: () => Promise<void>;
  studentOptions: SearchableOption[];
  feePlanOptions: SearchableOption[];
  courseOptions: SearchableOption[];
  feePlans: FeePlan[];
  handleFeePlanChange: (planId: string) => void;
  register: ReturnType<typeof useForm<InvoiceFormData>>["register"];
  errors: ReturnType<typeof useForm<InvoiceFormData>>["formState"]["errors"];
  handleSubmit: ReturnType<typeof useForm<InvoiceFormData>>["handleSubmit"];
  reset: ReturnType<typeof useForm<InvoiceFormData>>["reset"];
  setValue: ReturnType<typeof useForm<InvoiceFormData>>["setValue"];
  watch: ReturnType<typeof useForm<InvoiceFormData>>["watch"];
  summaryCards: {
    total: number;
    paid: number;
    partial: number;
    overdue: number;
  };
}

export function useInvoices(): InvoicesState {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortKey, setSortKey] = React.useState("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [studentOptions, setStudentOptions] = React.useState<SearchableOption[]>([]);
  const [feePlanOptions, setFeePlanOptions] = React.useState<SearchableOption[]>([]);
  const [courseOptions, setCourseOptions] = React.useState<SearchableOption[]>([]);
  const [feePlans, setFeePlans] = React.useState<FeePlan[]>([]);
  const [summaryCards, setSummaryCards] = React.useState({ total: 0, paid: 0, partial: 0, overdue: 0 });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
  });

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getInvoices({
        page,
        pageSize,
        search: search || undefined,
        status: (statusFilter as InvoiceStatus) || undefined,
        courseId: courseFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: sortKey || undefined,
        sortDir: sortKey ? sortDir : undefined,
      });
      setInvoices(res.data.items ?? []);
      setTotal(res.data.total ?? 0);

      const all = res.data.items ?? [];
      setSummaryCards({
        total: res.data.total,
        paid: all.filter((i) => i.status === "paid").length,
        partial: all.filter((i) => i.status === "partial").length,
        overdue: all.filter((i) => i.status === "overdue").length,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, courseFilter, dateFrom, dateTo, sortKey, sortDir]);

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getInvoices({
          page,
          pageSize,
          search: search || undefined,
          status: (statusFilter as InvoiceStatus) || undefined,
          courseId: courseFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy: sortKey || undefined,
          sortDir: sortKey ? sortDir : undefined,
        });
        if (!ignore) {
          setInvoices(res.data.items ?? []);
          setTotal(res.data.total ?? 0);

          const all = res.data.items ?? [];
          setSummaryCards({
            total: res.data.total,
            paid: all.filter((i) => i.status === "paid").length,
            partial: all.filter((i) => i.status === "partial").length,
            overdue: all.filter((i) => i.status === "overdue").length,
          });
        }
      } catch {
        if (!ignore) {
          setError(true);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [page, pageSize, search, statusFilter, courseFilter, dateFrom, dateTo, sortKey, sortDir]);

  React.useEffect(() => {
    if (!modalOpen) return;
    let ignore = false;
    const load = async () => {
      try {
        const [studentsRes, coursesRes, feePlansRes] = await Promise.all([
          getStudents(),
          getCourses(),
          getFeePlans({ pageSize: 100 }),
        ]);

        if (!ignore) {
          setStudentOptions(
            studentsRes.data.map((s) => ({
              value: s.id,
              label: s.name,
              secondary: s.email ?? undefined,
            })),
          );
          setCourseOptions(
            coursesRes.data.items.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          );

          const items = feePlansRes.data.items ?? [];
          setFeePlans(items);
          setFeePlanOptions(
            items.map((fp) => ({
              value: fp.id,
              label: `${fp.planName}${typeof fp.totalAmount === "number" && fp.totalAmount > 0 ? ` (₹${fp.totalAmount.toLocaleString("en-IN")})` : ""}`,
              secondary: fp.courseName
                ? `${fp.courseName} • ₹${(fp.totalAmount ?? 0).toLocaleString("en-IN")}`
                : `₹${(fp.totalAmount ?? 0).toLocaleString("en-IN")}`,
            })),
          );
        }
      } catch {
        // non-critical
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [modalOpen]);

  const handleFeePlanChange = (planId: string) => {
    setValue("feePlanId", planId, { shouldValidate: true });
    if (!planId) return;
    const plan = feePlans.find((p) => p.id === planId);
    if (plan && typeof plan.totalAmount === "number" && plan.totalAmount > 0) {
      setValue("amount", plan.totalAmount, { shouldValidate: true });
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    reset({
      studentId: "",
      feePlanId: "",
      amount: 0,
      issueDate: today,
      dueDate: defaultDue,
      notes: "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setSaving(true);
    try {
      const selectedPlan = feePlans.find((p) => p.id === data.feePlanId);
      const selectedStudent = studentOptions.find((s) => s.value === data.studentId);
      const description =
        selectedPlan?.planName ||
        (selectedStudent?.label ? `Fee for ${selectedStudent.label}` : "Invoice");

      await createInvoice({
        studentId: data.studentId,
        feePlanId: data.feePlanId || undefined,
        amount: Number(data.amount),
        description,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        notes: data.notes || undefined,
      });
      toast.success("Invoice created successfully");
      setModalOpen(false);
      await fetchInvoices();
    } catch (err: unknown) {
      const errMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
          ? err.message
          : undefined;
      toast.error(errMessage || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return {
    loading, error, invoices, total,
    page, setPage, pageSize,
    search, setSearch,
    statusFilter, setStatusFilter,
    courseFilter, setCourseFilter,
    dateFrom, setDateFrom, dateTo, setDateTo,
    sortKey, sortDir, handleSort,
    modalOpen, setModalOpen,
    saving,
    openCreate, onSubmit,
    fetchInvoices,
    studentOptions, feePlanOptions, courseOptions, feePlans,
    handleFeePlanChange,
    register, errors, handleSubmit, reset, setValue, watch,
    summaryCards,
  };
}
