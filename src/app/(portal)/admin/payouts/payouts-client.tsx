"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Payout {
  id: string;
  affiliateName: string;
  affiliateEmail: string;
  amount: number;
  status: string;
  method: string | null;
  createdAt: string;
  completedAt: string | null;
}

type Tab = "pending" | "approved" | "completed" | "denied";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Paid" },
  { key: "denied", label: "Denied" },
];

export function PayoutsClient({ payouts }: { payouts: Payout[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const filtered = payouts.filter((p) => p.status === activeTab);

  const counts = {
    pending: payouts.filter((p) => p.status === "pending").length,
    approved: payouts.filter((p) => p.status === "approved").length,
    completed: payouts.filter((p) => p.status === "completed").length,
    denied: payouts.filter((p) => p.status === "denied").length,
  };

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  async function generatePayouts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Generated ${data.generated} payout${data.generated !== 1 ? "s" : ""}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate payouts");
    } finally {
      setLoading(false);
    }
  }

  async function batchAction(action: string, label: string) {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${label}: ${data.updated} payout${data.updated !== 1 ? "s" : ""}`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  async function revertIds(ids: string[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "revert" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Reverted ${data.updated} payout${data.updated !== 1 ? "s" : ""}`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revert");
    } finally {
      setLoading(false);
    }
  }

  const hasCheckboxes = activeTab === "pending" || activeTab === "approved";
  const showCompleted = activeTab === "completed";

  return (
    <div className="space-y-6">
      {/* Tab bar + Generate button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelected(new Set());
              }}
              className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] text-zinc-400">
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {activeTab === "pending" && (
          <Button onClick={generatePayouts} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Payouts
          </Button>
        )}
      </div>

      {/* Bulk actions */}
      {activeTab === "pending" && selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-zinc-400">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => batchAction("approve", "Approved")}
            disabled={loading}
          >
            Approve Selected
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => batchAction("deny", "Denied")}
            disabled={loading}
          >
            Deny Selected
          </Button>
        </div>
      )}

      {activeTab === "approved" && selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-zinc-400">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            onClick={async () => {
              if (selected.size === 0) return;
              setLoading(true);
              try {
                const res = await fetch("/api/admin/payouts", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: Array.from(selected), action: "pay" }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                if (data.paypal) {
                  toast.success(`Paid ${data.updated} payout${data.updated !== 1 ? "s" : ""} via PayPal`);
                } else {
                  toast.success(`Completed ${data.updated} payout${data.updated !== 1 ? "s" : ""}`);
                }
                if (data.manualCount > 0) {
                  toast.info(`${data.manualCount} payout${data.manualCount !== 1 ? "s" : ""} without PayPal were marked as paid manually`);
                }
                setSelected(new Set());
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to process payouts");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Pay via PayPal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => revertIds(Array.from(selected))}
            disabled={loading}
          >
            Revert to Pending
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {hasCheckboxes && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        selected.size === filtered.length
                      }
                      onChange={toggleAll}
                      className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 focus:ring-offset-0"
                    />
                  </th>
                )}
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Affiliate
                </th>
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
                  Created
                </th>
                {showCompleted && (
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Completed
                  </th>
                )}
                {activeTab === "denied" && (
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  {hasCheckboxes && (
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 focus:ring-offset-0"
                      />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <div className="text-[13px] font-medium">
                      {p.affiliateName}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {p.affiliateEmail}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] font-medium">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3 text-[13px] capitalize text-zinc-400">
                    {p.method?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  {showCompleted && (
                    <td className="px-5 py-3 text-[12px] text-zinc-400">
                      {p.completedAt
                        ? new Date(p.completedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  )}
                  {activeTab === "denied" && (
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revertIds([p.id])}
                        disabled={loading}
                      >
                        Revert to Pending
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                No {activeTab} payouts.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
