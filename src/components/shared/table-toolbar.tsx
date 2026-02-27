"use client";

import { SearchInput } from "./search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export const TIME_PERIODS: FilterOption[] = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

interface TableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  period?: string;
  onPeriodChange?: (value: string) => void;
  className?: string;
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  filterValues,
  onFilterChange,
  period,
  onPeriodChange,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearchChange !== undefined && (
        <SearchInput
          value={search ?? ""}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="w-full sm:w-56"
        />
      )}

      {filters?.map((filter) => (
        <Select
          key={filter.key}
          value={filterValues?.[filter.key] ?? "all"}
          onValueChange={(v) => onFilterChange?.(filter.key, v)}
        >
          <SelectTrigger size="sm" className="text-[12px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {onPeriodChange && (
        <Select value={period ?? "all"} onValueChange={onPeriodChange}>
          <SelectTrigger size="sm" className="text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function filterByPeriod<T extends Record<string, unknown>>(
  rows: T[],
  period: string,
  dateKey: string = "created_at",
): T[] {
  if (period === "all") return rows;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 86_400_000);
  return rows.filter((r) => new Date(r[dateKey] as string) >= cutoff);
}
