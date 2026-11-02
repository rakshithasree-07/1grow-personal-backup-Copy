"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, Textarea, Select, Button } from "@/components/ui";
import type { Resolver } from "react-hook-form";
import type { Course } from "@/services/training";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["LONG_TERM", "SHORT_TERM"]),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fee: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().min(0).max(9999999).optional()),
});

const schema = baseSchema.superRefine((data, ctx) => {
  if (data.type === "SHORT_TERM") {
    if (!data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start date is required", path: ["startDate"] });
    }
    if (!data.endDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date is required", path: ["endDate"] });
    }
  }
});

export interface FormData {
  name: string;
  type: "LONG_TERM" | "SHORT_TERM";
  description?: string;
  startDate?: string;
  endDate?: string;
  fee?: number;
}

interface ProgramFormProps {
  initialData?: Partial<Course> | null;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function TypingPlaceholder({ texts, className }: { texts: string[]; className?: string }) {
  const [displayText, setDisplayText] = React.useState("");
  const [textIndex, setTextIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    let innerTimeout: ReturnType<typeof setTimeout>;
    const currentText = texts[textIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentText.length) {
          setDisplayText(currentText.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          innerTimeout = setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        if (charIndex > 0) {
          setDisplayText(currentText.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? 30 : 60);

    return () => {
      clearTimeout(timeout);
      clearTimeout(innerTimeout);
    };
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse text-text-placeholder">|</span>
    </span>
  );
}

export function ProgramForm({ initialData, onSubmit, onCancel, loading }: ProgramFormProps) {
  const [nameFocused, setNameFocused] = React.useState(false);
  const [descFocused, setDescFocused] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: {
      name: initialData?.name ?? "",
      type: initialData?.type ?? "SHORT_TERM",
      description: initialData?.description ?? "",
      startDate: initialData?.startDate?.split("T")[0] ?? undefined,
      endDate: initialData?.endDate?.split("T")[0] ?? undefined,
      fee: initialData?.fee ?? undefined,
    },
  });

  const selectedType = watch("type");
  const isLongTerm = selectedType === "LONG_TERM";
  const nameValue = watch("name");
  const descValue = watch("description");

  const handleFormSubmit = async (data: FormData) => {
    if (isLongTerm) {
      const cleaned = { ...data };
      delete (cleaned as any).startDate;
      delete (cleaned as any).endDate;
      await onSubmit(cleaned);
    } else {
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="relative">
        <Input
          label="Program Name"
          required
          error={errors.name?.message}
          {...register("name")}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
        />
        {!nameValue && !nameFocused && (
          <div className="absolute top-8 left-3 pointer-events-none">
            <TypingPlaceholder
              texts={[
                "Bharatanatyam Basics",
                "Carnatic Vocal Music",
                "Classical Dance Advanced",
                "Kathak Beginners",
                "Veena Instrument Class",
              ]}
              className="text-sm text-text-placeholder"
            />
          </div>
        )}
      </div>

      <Select
        label="Program Type"
        options={[
          { value: "SHORT_TERM", label: "Short Term (Fixed Duration)" },
          { value: "LONG_TERM", label: "Long Term (Ongoing)" },
        ]}
        error={errors.type?.message}
        value={watch("type")}
        onChange={(val) => setValue("type", val as "LONG_TERM" | "SHORT_TERM", { shouldValidate: true })}
      />

      <div className="relative">
        <Textarea
          label="Description"
          error={errors.description?.message}
          {...register("description")}
          onFocus={() => setDescFocused(true)}
          onBlur={() => setDescFocused(false)}
          rows={3}
        />
        {!descValue && !descFocused && (
          <div className="absolute top-9 left-3 pointer-events-none">
            <TypingPlaceholder
              texts={[
                "Learn traditional Indian classical dance forms with expert guidance and practice sessions...",
                "A comprehensive program covering fundamentals of Carnatic music theory and practice...",
                "Master the art of Kathak with structured lessons from basic to advanced techniques...",
              ]}
              className="text-sm text-text-placeholder"
            />
          </div>
        )}
      </div>

      {!isLongTerm && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" required error={errors.startDate?.message} {...register("startDate")} />
          <Input label="End Date" type="date" required error={errors.endDate?.message} {...register("endDate")} />
        </div>
      )}

      <Input label="Fee" type="number" leftAddon="₹" error={errors.fee?.message} {...register("fee")} />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting || loading}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting || loading}>
          {initialData ? "Update Program" : "Create Program"}
        </Button>
      </div>
    </form>
  );
}
