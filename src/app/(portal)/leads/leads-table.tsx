"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  TableToolbar,
  filterByPeriod,
  type FilterConfig,
} from "@/components/shared/table-toolbar";

interface Lead {
  id: string;
  email: string;
  affiliate_id: string;
  stripe_customer_id: string | null;
  created_at: string;
}

interface LeadsTableProps {
  leads: Lead[];
  affiliateId: string;
  isTier1: boolean;
  subIdMap: Record<string, string>;
}

export function LeadsTable({
  leads,
  affiliateId,
  isTier1,
  subIdMap,
}: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "all",
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
          { label: "Converted", value: "converted" },
          { label: "Lead", value: "lead" },
        ],
      },
    ];

    if (isTier1) {
      const sourceOptions = [{ label: "All sources", value: "all" }];
      const seen = new Set<string>();
      for (const [id, name] of Object.entries(subIdMap)) {
        if (!seen.has(id)) {
          seen.add(id);
          sourceOptions.push({ label: name, value: id });
        }
      }
      configs.push({ key: "source", label: "Source", options: sourceOptions });
    }

    return configs;
  }, [isTier1, subIdMap]);

  const filtered = useMemo(() => {
    let rows = leads;

    rows = filterByPeriod(rows, period);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => l.email.toLowerCase().includes(q));
    }

    if (filters.status === "converted") {
      rows = rows.filter((l) => l.stripe_customer_id);
    } else if (filters.status === "lead") {
      rows = rows.filter((l) => !l.stripe_customer_id);
    }

    if (isTier1 && filters.source && filters.source !== "all") {
      rows = rows.filter((l) => l.affiliate_id === filters.source);
    }

    return rows;
  }, [leads, search, filters, period, isTier1]);

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
              {leads.length === 0
                ? "No leads yet. Share your referral link to start generating leads."
                : "No leads match your filters."}
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
                    Signed Up
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">{lead.email}</td>
                    {isTier1 && (
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {lead.affiliate_id === affiliateId
                          ? "You"
                          : subIdMap[lead.affiliate_id] ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      {lead.stripe_customer_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Converted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                          Lead
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
        {filtered.length === leads.length
          ? `${leads.length} leads`
          : `${filtered.length} of ${leads.length} leads`}
      </p>
    </>
  );
}
