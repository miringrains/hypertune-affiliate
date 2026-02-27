"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  TableToolbar,
  filterByPeriod,
  type FilterConfig,
} from "@/components/shared/table-toolbar";

interface Customer {
  id: string;
  affiliate_id: string;
  current_state: string | null;
  plan_type: string | null;
  created_at: string;
  leads: { email: string } | null;
}

interface CustomersTableProps {
  customers: Customer[];
  affiliateId: string;
  isTier1: boolean;
  subIdMap: Record<string, string>;
}

export function CustomersTable({
  customers,
  affiliateId,
  isTier1,
  subIdMap,
}: CustomersTableProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "all",
    plan: "all",
    source: "all",
  });
  const [period, setPeriod] = useState("all");

  const filterConfigs = useMemo(() => {
    const configs: FilterConfig[] = [
      {
        key: "status",
        label: "Status",
        options: [
          { label: "All statuses", value: "all" },
          { label: "Active", value: "active" },
          { label: "Trialing", value: "trialing" },
          { label: "Churned", value: "churned" },
        ],
      },
      {
        key: "plan",
        label: "Plan",
        options: [
          { label: "All plans", value: "all" },
          { label: "Monthly", value: "monthly" },
          { label: "Annual", value: "annual" },
        ],
      },
    ];

    if (isTier1) {
      const sourceOptions = [{ label: "All sources", value: "all" }];
      for (const [id, name] of Object.entries(subIdMap)) {
        sourceOptions.push({ label: name, value: id });
      }
      configs.push({ key: "source", label: "Source", options: sourceOptions });
    }

    return configs;
  }, [isTier1, subIdMap]);

  const filtered = useMemo(() => {
    let rows = customers;

    rows = filterByPeriod(rows, period);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((c) =>
        (c.leads?.email ?? "").toLowerCase().includes(q),
      );
    }

    if (filters.status === "active") {
      rows = rows.filter(
        (c) =>
          c.current_state === "active_monthly" ||
          c.current_state === "active_annual",
      );
    } else if (filters.status === "trialing") {
      rows = rows.filter((c) => c.current_state === "trialing");
    } else if (filters.status === "churned") {
      rows = rows.filter(
        (c) =>
          c.current_state === "canceled" || c.current_state === "dormant",
      );
    }

    if (filters.plan === "monthly") {
      rows = rows.filter((c) => c.plan_type === "monthly");
    } else if (filters.plan === "annual") {
      rows = rows.filter((c) => c.plan_type === "annual");
    }

    if (isTier1 && filters.source && filters.source !== "all") {
      rows = rows.filter((c) => c.affiliate_id === filters.source);
    }

    return rows;
  }, [customers, search, filters, period, isTier1]);

  return (
    <>
      <TableToolbar
        className="mt-6"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by email..."
        filters={filterConfigs}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        period={period}
        onPeriodChange={setPeriod}
      />

      <Card className="mt-4">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              {customers.length === 0
                ? "No customers yet."
                : "No customers match your filters."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  {isTier1 && (
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Source
                    </th>
                  )}
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Since
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {customer.leads?.email ?? "—"}
                    </td>
                    {isTier1 && (
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {customer.affiliate_id === affiliateId
                          ? "You"
                          : subIdMap[customer.affiliate_id] ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={customer.current_state ?? "unknown"}
                      />
                    </td>
                    <td className="px-5 py-3 text-[13px] capitalize">
                      {customer.plan_type ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
        {filtered.length === customers.length
          ? `${customers.length} customers`
          : `${filtered.length} of ${customers.length} customers`}
      </p>
    </>
  );
}
