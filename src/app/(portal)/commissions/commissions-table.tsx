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

interface Commission {
  id: string;
  amount: number;
  rate_snapshot: number | null;
  status: string | null;
  created_at: string;
  customers: { leads: { email: string } | null } | null;
}

interface CommissionsTableProps {
  commissions: Commission[];
}

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "All statuses", value: "all" },
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Paid", value: "paid" },
    ],
  },
];

export function CommissionsTable({ commissions }: CommissionsTableProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "all",
  });
  const [period, setPeriod] = useState("all");

  const filtered = useMemo(() => {
    let rows = commissions;

    rows = filterByPeriod(rows, period);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((c) =>
        (c.customers?.leads?.email ?? "").toLowerCase().includes(q),
      );
    }

    if (filters.status !== "all") {
      rows = rows.filter((c) => c.status === filters.status);
    }

    return rows;
  }, [commissions, search, filters, period]);

  return (
    <>
      <TableToolbar
        className="mt-6"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer email..."
        filters={FILTER_CONFIGS}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        period={period}
        onPeriodChange={setPeriod}
      />

      <Card className="mt-4">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              {commissions.length === 0
                ? "No commissions yet."
                : "No commissions match your filters."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((commission) => (
                  <tr key={commission.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {commission.customers?.leads?.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium tabular-nums">
                      {formatCurrency(Number(commission.amount))}
                    </td>
                    <td className="px-5 py-3 text-[13px] tabular-nums">
                      {commission.rate_snapshot}%
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={commission.status ?? "unknown"}
                      />
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
        {filtered.length === commissions.length
          ? `${commissions.length} commissions`
          : `${filtered.length} of ${commissions.length} commissions`}
      </p>
    </>
  );
}
