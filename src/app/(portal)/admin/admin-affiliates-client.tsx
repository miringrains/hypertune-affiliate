"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { Search, Users, DollarSign, MousePointerClick, UserCheck } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

interface AffiliateRow {
  id: string;
  name: string;
  email: string;
  slug: string;
  status: string;
  tier_level: number;
  commission_rate: number;
  parent_name: string | null;
  clicks: number;
  leads: number;
  customers: number;
  earned: number;
}

interface Props {
  rows: AffiliateRow[];
  summary: {
    totalAffiliates: number;
    totalClicks: number;
    totalCustomers: number;
    totalEarned: number;
  };
}

type SortKey = "earned" | "clicks" | "leads" | "customers" | "name" | "tier_level";
type SortDir = "asc" | "desc";

export function AdminAffiliatesClient({ rows, summary }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("earned");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = rows;
    if (q) {
      result = rows.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [rows, search, sortKey, sortDir]);

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Users size={16} strokeWidth={ICON_STROKE_WIDTH} />}
          label="Total Affiliates"
          value={summary.totalAffiliates.toLocaleString()}
        />
        <SummaryCard
          icon={<MousePointerClick size={16} strokeWidth={ICON_STROKE_WIDTH} />}
          label="Total Clicks"
          value={summary.totalClicks.toLocaleString()}
        />
        <SummaryCard
          icon={<UserCheck size={16} strokeWidth={ICON_STROKE_WIDTH} />}
          label="Total Customers"
          value={summary.totalCustomers.toLocaleString()}
        />
        <SummaryCard
          icon={<DollarSign size={16} strokeWidth={ICON_STROKE_WIDTH} />}
          label="Total Earned"
          value={formatCurrency(summary.totalEarned)}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          strokeWidth={ICON_STROKE_WIDTH}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search by name, email, or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-[13px]"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <SortHeader label="Name" sortKey="name" current={sortKey} arrow={arrow} onClick={toggleSort} align="left" />
                <Th>Email</Th>
                <SortHeader label="Tier" sortKey="tier_level" current={sortKey} arrow={arrow} onClick={toggleSort} align="center" />
                <Th>Parent</Th>
                <SortHeader label="Clicks" sortKey="clicks" current={sortKey} arrow={arrow} onClick={toggleSort} align="right" />
                <SortHeader label="Leads" sortKey="leads" current={sortKey} arrow={arrow} onClick={toggleSort} align="right" />
                <SortHeader label="Customers" sortKey="customers" current={sortKey} arrow={arrow} onClick={toggleSort} align="right" />
                <SortHeader label="Earned" sortKey="earned" current={sortKey} arrow={arrow} onClick={toggleSort} align="right" />
                <Th>Rate</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border hover:bg-zinc-900/30 transition-colors">
                  <td className="px-5 py-3 text-[13px]">
                    <Link
                      href={`/admin/affiliates/${a.id}`}
                      className="text-white hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500 transition-colors"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-zinc-400 max-w-[180px] truncate">
                    {a.email}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                      a.tier_level === 1
                        ? "border-amber-700/50 text-amber-400 bg-amber-950/30"
                        : a.tier_level === 2
                          ? "border-zinc-600 text-zinc-300"
                          : "border-zinc-700 text-zinc-500"
                    }`}>
                      T{a.tier_level}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-zinc-400 max-w-[140px] truncate">
                    {a.parent_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                    {a.clicks.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                    {a.leads.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                    {a.customers.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right font-medium tabular-nums">
                    {formatCurrency(a.earned)}
                  </td>
                  <td className="px-5 py-3 text-[13px]">
                    {a.commission_rate}%
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                {search ? "No affiliates match your search." : "No affiliates found."}
              </p>
            </div>
          )}
        </div>
        <div className="px-5 py-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Showing {filtered.length} of {rows.length} affiliates
          </p>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-zinc-400">{icon}</span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-[20px] font-semibold text-white tabular-nums">{value}</p>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </th>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  arrow,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  arrow: (k: SortKey) => string;
  onClick: (k: SortKey) => void;
  align: "left" | "right" | "center";
}) {
  return (
    <th
      className={`px-5 py-3 text-${align} text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors`}
      onClick={() => onClick(sortKey)}
    >
      {label}{arrow(sortKey)}
    </th>
  );
}
