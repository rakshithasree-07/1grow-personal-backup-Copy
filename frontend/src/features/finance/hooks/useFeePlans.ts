"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  getFeePlans,
  getFeePlan,
  updateFeePlan,
  type FeePlan,
  type FeePlanStatus,
} from "@/services/finance";
import { getCourses } from "@/services/courses";
import type { SearchableOption } from "@/components/ui/SearchableSelect";

export const feePlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  courseId: z.string().optional(),
  feeType: z.string().min(1, "Fee type is required"),
  totalAmount: z.string().min(1, "Total amount is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  installments: z.string().min(1, "Installments is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  durationMonths: z.string().min(1, "Duration is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  description: z.string().optional(),
  template: z.string().optional(),
  imageUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  benefits: z.string().optional(),
  hookWords: z.string().optional(),
  highlightFields: z.string().optional(),
  greeting: z.string().optional(),
});
export type FeePlanFormData = z.infer<typeof feePlanSchema>;

export interface FeePlansState {
  loading: boolean;
  error: boolean;
  feePlans: FeePlan[];
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
  sortKey: string;
  sortDir: "asc" | "desc";
  handleSort: (key: string) => void;
  modalOpen: boolean;
  setModalOpen: (o: boolean) => void;
  editingFeePlan: FeePlan | null;
  saving: boolean;
  openEdit: (feePlan: FeePlan) => Promise<void>;
  onSubmit: (data: FeePlanFormData) => Promise<void>;
  handleTogglePublic: (feePlan: FeePlan, isPublic: boolean) => Promise<void>;
  fetchFeePlans: () => Promise<void>;
  courseOptions: SearchableOption[];
  register: ReturnType<typeof useForm<FeePlanFormData>>["register"];
  errors: ReturnType<typeof useForm<FeePlanFormData>>["formState"]["errors"];
  handleSubmit: ReturnType<typeof useForm<FeePlanFormData>>["handleSubmit"];
  reset: ReturnType<typeof useForm<FeePlanFormData>>["reset"];
  setValue: ReturnType<typeof useForm<FeePlanFormData>>["setValue"];
  watch: ReturnType<typeof useForm<FeePlanFormData>>["watch"];
}

export function useFeePlans(): FeePlansState {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [feePlans, setFeePlans] = React.useState<FeePlan[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingFeePlan, setEditingFeePlan] = React.useState<FeePlan | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [courseOptions, setCourseOptions] = React.useState<SearchableOption[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FeePlanFormData>({
    resolver: zodResolver(feePlanSchema),
  });

  const fetchFeePlans = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getFeePlans({
        page,
        pageSize,
        search: search || undefined,
        status: (statusFilter as FeePlanStatus) || undefined,
        courseId: courseFilter || undefined,
        sortBy: sortKey || undefined,
        sortDir: sortKey ? sortDir : undefined,
      });
      setFeePlans(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, courseFilter, sortKey, sortDir]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getFeePlans({
          page,
          pageSize,
          search: search || undefined,
          status: (statusFilter as FeePlanStatus) || undefined,
          courseId: courseFilter || undefined,
          sortBy: sortKey || undefined,
          sortDir: sortKey ? sortDir : undefined,
        });
        setFeePlans(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, pageSize, search, statusFilter, courseFilter, sortKey, sortDir]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await getCourses();
        setCourseOptions(
          res.data.items.map((c) => ({
            value: c.id,
            label: c.name,
          })),
        );
      } catch {
        // non-critical
      }
    };
    load();
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openEdit = async (feePlan: FeePlan) => {
    setEditingFeePlan(feePlan);
    const full = await getFeePlan(feePlan.id);
    const fp = full.data;
    reset({
      planName: fp.planName,
      courseId: fp.courseId || undefined,
      feeType: fp.feeType || "MONTHLY",
      totalAmount: String(fp.totalAmount),
      installments: String(fp.installments),
      durationMonths: String(fp.durationMonths ?? 1),
      description: fp.description || "",
      greeting: fp.greeting || "",
      template: fp.template || "",
      imageUrl: fp.imageUrl || "",
      pdfUrl: fp.pdfUrl || "",
      benefits: (Array.isArray(fp.benefits) ? fp.benefits.join(", ") : "") || "",
      hookWords: (Array.isArray(fp.hookWords) ? fp.hookWords.join(", ") : "") || "",
      highlightFields: fp.highlightFields ? JSON.stringify(fp.highlightFields, null, 2) : "",
    });
    setModalOpen(true);
  };

  const parseCommaList = (val: string | undefined): string[] | undefined => {
    if (!val || !val.trim()) return undefined;
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const parseJsonField = (val: string | undefined): Record<string, unknown> | undefined => {
    if (!val || !val.trim()) return undefined;
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  };

  const onSubmit = async (data: FeePlanFormData) => {
    setSaving(true);
    try {
      if (!editingFeePlan) {
        toast.error("Fee plans are created from the class, rental, or event source record");
        return;
      }
      const payload = {
        name: data.planName,
        courseId: data.courseId || undefined,
        template: data.template || undefined,
        imageUrl: data.imageUrl || undefined,
        pdfUrl: data.pdfUrl || undefined,
        feeType: data.feeType,
        totalAmount: Number(data.totalAmount),
        installments: Number(data.installments),
        durationMonths: Number(data.durationMonths),
        description: data.description || undefined,
        benefits: parseCommaList(data.benefits),
        hookWords: parseCommaList(data.hookWords),
        highlightFields: parseJsonField(data.highlightFields),
        greeting: data.greeting || undefined,
      };
      await updateFeePlan(editingFeePlan.id, payload);
      toast.success("Fee plan updated");
      setModalOpen(false);
      await fetchFeePlans();
    } catch {
      toast.error("Failed to update fee plan");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async (feePlan: FeePlan, isPublic: boolean) => {
    try {
      await updateFeePlan(feePlan.id, { isPublic, publicVisible: isPublic, publicStatus: isPublic ? "PUBLIC" : "PRIVATE" });
      toast.success(isPublic ? "Fee plan is now public" : "Fee plan is now private");
      await fetchFeePlans();
    } catch {
      toast.error("Failed to update visibility");
    }
  };

  return {
    loading, error, feePlans, total,
    page, setPage, pageSize,
    search, setSearch,
    statusFilter, setStatusFilter,
    courseFilter, setCourseFilter,
    sortKey, sortDir, handleSort,
    modalOpen, setModalOpen,
    editingFeePlan, saving,
    openEdit, onSubmit,
    handleTogglePublic,
    fetchFeePlans,
    courseOptions,
    register, errors, handleSubmit, reset, setValue, watch,
  };
}
