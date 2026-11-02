"use client";

import { Input } from "@/components/ui/Input";
import { EntitySearch } from "@/components/shared/EntitySearch";
import type { SearchResultItem } from "@/services/search.service";

export interface AttendanceFiltersValue {
  batchId: string;
  batchLabel: string;
  dateFrom: string;
  dateTo: string;
}

interface AttendanceFiltersProps {
  value: AttendanceFiltersValue;
  onChange: (value: AttendanceFiltersValue) => void;
  showBatchSearch?: boolean;
  dateFromMax?: string;
  dateToMin?: string;
}

export function AttendanceFilters({
  value,
  onChange,
  showBatchSearch = true,
  dateFromMax,
  dateToMin,
}: AttendanceFiltersProps) {
  const handleBatchSelect = (item: SearchResultItem) => {
    onChange({ ...value, batchId: item.id, batchLabel: item.label });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {showBatchSearch && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Batch</label>
          <div className="[&amp;_input]:rounded-[var(--radius-md)]">
            <EntitySearch
              searchType="batches"
              onSelect={handleBatchSelect}
              placeholder="Filter by batch…"
            />
          </div>
          {value.batchLabel && (
            <p className="text-xs text-text-secondary">Selected: {value.batchLabel}</p>
          )}
        </div>
      )}
      <Input
        type="date"
        label="From"
        value={value.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        max={dateFromMax}
        className="h-9"
      />
      <Input
        type="date"
        label="To"
        value={value.dateTo}
        onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        min={dateToMin}
        className="h-9"
      />
    </div>
  );
}
