"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

export interface CommissionRow {
  id: string;
  affiliateName: string;
  customerEmail: string;
  amount: number;
  rateSnapshot: number;
  tierType: string;
  paymentNumber: number | null;
  status: string;
  createdAt: string;
}

type StatusFilter = "all" | "pending" | "approved" | "paid" | "voided";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "voided", label: "Voided" },
];

export function CommissionsClient({
  commissions,
}: {
  commissions: CommissionRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);

  const counts = commissions.reduce(
    (acc, c) => {
      acc[c.status as StatusFilter] = (acc[c.status as StatusFilter] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const filtered =
    filter === "all"
      ? commissions
      : commissions.filter((c) => c.status === filter);

  const pendingIds = new Set(
    commissions.filter((c) => c.status === "pending").map((c) => c.id),
  );
  const selectedPending = [...selected].filter((id) => pendingIds.has(id));
  const hasPendingInView = filtered.some((c) => c.status === "pending");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const visiblePending = filtered
      .filter((c) => c.status === "pending")
      .map((c) => c.id);
    const allSelected = visiblePending.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visiblePending.forEach((id) => next.delete(id));
      } else {
        visiblePending.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleAction(action: "approve" | "void") {
    if (selectedPending.length === 0) return;
    setActing(true);

    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedPending, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(`Failed to ${action} commissions`, {
          description: data.error,
        });
        return;
      }

      const { updated } = await res.json();
      toast.success(
        `${updated} commission${updated !== 1 ? "s" : ""} ${action === "approve" ? "approved" : "voided"}`,
      );
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setActing(false);
    }
  }

  const visiblePending = filtered
    .filter((c) => c.status === "pending")
    .map((c) => c.id);
  const allVisibleSelected =
    visiblePending.length > 0 &&
    visiblePending.every((id) => selected.has(id));

  return (
    <div className="space-y-6">
      {/* Filter tabs + bulk actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-1">
          {TABS.map((tab) => {
            const count =
              tab.value === "all" ? commissions.length : (counts[tab.value] ?? 0);
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  filter === tab.value
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-[11px] text-zinc-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {selectedPending.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              {selectedPending.length} selected
            </span>
            <button
              onClick={() => handleAction("approve")}
              disabled={acting}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {acting && (
                <Loader2
                  size={12}
                  strokeWidth={ICON_STROKE_WIDTH}
                  className="animate-spin"
                />
              )}
              Approve Selected
            </button>
            <button
              onClick={() => handleAction("void")}
              disabled={acting}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              Void Selected
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              {hasPendingInView && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-white"
                  />
                </th>
              )}
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Affiliate
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Customer
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Amount
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Rate
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Type
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Payment #
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Status
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-zinc-700/50 last:border-0"
              >
                {hasPendingInView && (
                  <td className="w-10 px-4 py-3">
                    {c.status === "pending" ? (
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-white"
                      />
                    ) : null}
                  </td>
                )}
                <td className="px-5 py-3 text-[13px] text-white">
                  {c.affiliateName}
                </td>
                <td className="px-5 py-3 text-[12px] text-zinc-400">
                  {c.customerEmail}
                </td>
                <td className="px-5 py-3 text-[13px] font-medium text-white">
                  {formatCurrency(c.amount)}
                </td>
                <td className="px-5 py-3 text-[13px] text-zinc-400">
                  {c.rateSnapshot}%
                </td>
                <td className="px-5 py-3 text-[13px] capitalize text-zinc-400">
                  {c.tierType?.replace(/_/g, " ") ?? "—"}
                </td>
                <td className="px-5 py-3 text-[13px] text-zinc-400">
                  {c.paymentNumber ?? "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-5 py-3 text-[12px] text-zinc-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[14px] text-zinc-400">
              No commissions found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
