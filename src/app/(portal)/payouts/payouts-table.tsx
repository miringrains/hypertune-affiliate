"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import {
  TableToolbar,
  filterByPeriod,
  type FilterConfig,
} from "@/components/shared/table-toolbar";

interface Payout {
  id: string;
  amount: number;
  status: string | null;
  method: string | null;
  completed_at: string | null;
  created_at: string;
}

interface PayoutsTableProps {
  payouts: Payout[];
}

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "All statuses", value: "all" },
      { label: "Pending", value: "pending" },
      { label: "Processing", value: "processing" },
      { label: "Completed", value: "completed" },
    ],
  },
];

export function PayoutsTable({ payouts }: PayoutsTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "all",
  });
  const [period, setPeriod] = useState("all");

  const filtered = useMemo(() => {
    let rows = payouts;

    rows = filterByPeriod(rows, period);

    if (filters.status !== "all") {
      rows = rows.filter((p) => p.status === filters.status);
    }

    return rows;
  }, [payouts, filters, period]);

  return (
    <>
      <TableToolbar
        className="mb-4"
        filters={FILTER_CONFIGS}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        period={period}
        onPeriodChange={setPeriod}
      />

      <Card>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              {payouts.length === 0
                ? "No payouts yet."
                : "No payouts match your filters."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payout) => (
                  <tr key={payout.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px] font-medium tabular-nums">
                      {formatCurrency(Number(payout.amount))}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={payout.status ?? "unknown"} />
                    </td>
                    <td className="px-5 py-3 text-[13px] capitalize">
                      {payout.method ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {payout.completed_at
                        ? new Date(payout.completed_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {payouts.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
          {filtered.length === payouts.length
            ? `${payouts.length} payouts`
            : `${filtered.length} of ${payouts.length} payouts`}
        </p>
      )}
    </>
  );
}
