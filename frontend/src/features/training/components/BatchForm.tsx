"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Clock, Copy, ChevronRight, ChevronLeft, CalendarDays, Check } from "lucide-react";
import { Input, Select, Button, Badge } from "@/components/ui";
import type { Batch, Course } from "@/services/training";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu",
  FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const scheduleSchema = z.object({
  dayOfWeek: z.string(), startTime: z.string().regex(timeRegex, "Invalid start time"),
  endTime: z.string().regex(timeRegex, "Invalid end time"), room: z.string().optional(),
}).refine((s) => s.startTime < s.endTime, { message: "End time must be after start time", path: ["endTime"] });

const schema = z.object({
  name: z.string().min(1, "Name is required"), code: z.string().optional(),
  courseId: z.string().optional(), branchId: z.string().optional(),
  capacity: z.string().refine((v) => { const n = Number(v); return !isNaN(n) && n >= 1 && n <= 9999 && Number.isInteger(n); }, "Must be a whole number between 1 and 99,999"),
  startDate: z.string().optional(), endDate: z.string().optional(), status: z.string().optional(),
  schedules: z.array(scheduleSchema).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate && data.startDate > data.endDate) return false;
  return true;
}, { message: "End date must be after start date", path: ["endDate"] });

interface ScheduleEntry { dayOfWeek: string; startTime: string; endTime: string; room?: string; }

interface FormData {
  name: string; code?: string; courseId?: string; branchId?: string; capacity: string;
  startDate?: string; endDate?: string; status?: string; schedules?: ScheduleEntry[];
}

interface BatchFormProps {
  initialData?: Partial<Batch> | null; courses?: Course[];
  branches?: Array<{ id: string; name: string }>;
  initialSchedules?: ScheduleEntry[];
  onSubmit: (data: FormData) => Promise<void>; onCancel: () => void; loading?: boolean;
}

export function BatchForm({ initialData, courses, branches, initialSchedules, onSubmit, onCancel, loading }: BatchFormProps) {
  const [step, setStep] = useState<"info" | "schedule">("info");
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(initialSchedules ?? []);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");

  const { register, handleSubmit, control, trigger, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? "", code: initialData?.code ?? "",
      courseId: initialData?.courseId ?? "", branchId: initialData?.branchId ?? "",
      capacity: String(initialData?.capacity ?? 30), startDate: initialData?.startDate?.split("T")[0] ?? "",
      endDate: initialData?.endDate?.split("T")[0] ?? "", status: initialData?.status ?? "UPCOMING",
    },
  });

  const selectedCourseId = useWatch({ control, name: "courseId" });
  const selectedCourse = courses?.find((c) => c.id === selectedCourseId);
  const isLongTerm = selectedCourse?.type === "LONG_TERM";

  const toggleDay = (day: string) => setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day]);

  const addSchedule = () => {
    if (selectedDays.length === 0) return;
    setSchedules((p) => [...p, ...selectedDays.map((d) => ({ dayOfWeek: d, startTime, endTime, room: room || undefined }))]);
    setSelectedDays([]); setRoom("");
  };

  const removeSchedule = (i: number) => setSchedules((p) => p.filter((_, idx) => idx !== i));
  const duplicateSchedule = (s: ScheduleEntry) => setSchedules((p) => [...p, { ...s }]);

  const handleNext = async () => {
    const valid = await trigger(["name", "capacity", "courseId", "branchId", "startDate", "endDate"]);
    if (valid) setStep("schedule");
  };

  const handleFormSubmit = async (formData: FormData) => {
    if (schedules.length === 0) { toast.error("Add at least one schedule"); return; }
    const cleaned = { ...formData };
    if (isLongTerm) {
      delete (cleaned as any).startDate;
      delete (cleaned as any).endDate;
    }
    await onSubmit({ ...cleaned, schedules: schedules.length > 0 ? schedules : undefined });
  };

  const groupedSchedules = DAYS.reduce((acc, day) => {
    const items = schedules.map((s, i) => ({ ...s, originalIndex: i })).filter((s) => s.dayOfWeek === day);
    if (items.length > 0) acc.push({ day, schedules: items });
    return acc;
  }, [] as Array<{ day: string; schedules: Array<ScheduleEntry & { originalIndex: number }> }>);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col max-h-[80vh] sm:max-h-[85vh]">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 px-1 mb-4">
        <button type="button" onClick={() => setStep("info")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors", step === "info" ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary")}>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px]">1</span>
          Basic Info
        </button>
        <div className="h-px flex-1 bg-border" />
        <button type="button" onClick={() => setStep("schedule")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors", step === "schedule" ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary")}>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px]">2</span>
          Schedule
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1 space-y-4">
        {step === "info" ? (
          <>
            <Input label="Batch Name" required error={errors.name?.message} {...register("name")} />
            <Input label="Batch Code" error={errors.code?.message} {...register("code")} />
            {courses && (
              <Select label="Program" placeholder="Select program"
                options={courses.map((c) => ({ value: c.id, label: `${c.name} (${c.type === "LONG_TERM" ? "Long Term" : "Short Term"})` }))}
                error={errors.courseId?.message}
                value={watch("courseId")}
                onChange={(val) => setValue("courseId", val, { shouldValidate: true })} />
            )}
            {branches && (
              <Select label="Branch" placeholder="Select branch"
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                error={errors.branchId?.message}
                value={watch("branchId")}
                onChange={(val) => setValue("branchId", val, { shouldValidate: true })} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Capacity" type="number" required error={errors.capacity?.message} {...register("capacity")} />
              <Select label="Status"
                options={[{ value: "UPCOMING", label: "Upcoming" }, { value: "ACTIVE", label: "Active" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }]}
                error={errors.status?.message}
                value={watch("status")}
                onChange={(val) => setValue("status", val, { shouldValidate: true })} />
            </div>
            {!isLongTerm && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Date" type="date" error={errors.startDate?.message} {...register("startDate")} />
                <Input label="End Date" type="date" error={errors.endDate?.message} {...register("endDate")} />
              </div>
            )}
            {isLongTerm && <p className="text-xs text-text-secondary">Long-term program — no fixed dates</p>}
          </>
        ) : (
          <>
            {groupedSchedules.length > 0 ? (
              <div className="space-y-2">
                {groupedSchedules.map(({ day, schedules: daySchedules }) => (
                  <div key={day} className="rounded-[var(--radius-sm)] border border-border p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">{DAY_LABELS[day]}</p>
                    <div className="space-y-1.5">
                      {daySchedules.map((s) => (
                        <div key={s.originalIndex} className="flex items-center gap-2 p-1.5 rounded bg-surface">
                          <Clock size={11} className="text-text-secondary shrink-0" />
                          <span className="text-xs font-medium text-text-primary flex-1">{s.startTime} - {s.endTime}{s.room ? ` · ${s.room}` : ""}</span>
                          <button type="button" onClick={() => duplicateSchedule(s)} className="p-0.5 text-text-secondary hover:text-primary"><Copy size={10} /></button>
                          <button type="button" onClick={() => removeSchedule(s.originalIndex)} className="p-0.5 text-text-secondary hover:text-danger"><Trash2 size={10} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CalendarDays size={24} className="mx-auto mb-2 text-text-disabled" />
                <p className="text-xs text-text-secondary">No classes scheduled</p>
              </div>
            )}

            <div className="p-3 rounded-[var(--radius-sm)] bg-surface-raised border border-border">
              <p className="text-[10px] font-medium text-text-secondary mb-2">Add classes</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DAYS.map((day) => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={cn("px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                      selectedDays.includes(day) ? "bg-primary text-primary-foreground"
                        : schedules.some((s) => s.dayOfWeek === day) ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-surface border border-border text-text-secondary hover:border-primary/50")}>
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-text-secondary">From</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-[90px] h-8 text-xs" />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-text-secondary">To</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-[90px] h-8 text-xs" />
                </div>
                <Input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} className="w-[100px] h-8 text-xs" />
                <Button type="button" size="sm" onClick={addSchedule} disabled={selectedDays.length === 0} className="h-8">
                  <Plus size={12} /> Add
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-border shrink-0">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isSubmitting || loading}>Cancel</Button>
        {step === "info" ? (
          <Button type="button" onClick={handleNext}>Next <ChevronRight size={14} /></Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("info")}><ChevronLeft size={14} /> Back</Button>
            <Button type="submit" loading={isSubmitting || loading}>
              <Check size={14} /> {initialData ? "Update" : "Create Batch"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
