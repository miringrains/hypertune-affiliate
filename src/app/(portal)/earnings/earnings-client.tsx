"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  Wallet,
  Search,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";

interface HeroData {
  lifetimeEarned: number;
  pending: number;
  lastPayout: { amount: number; date: string } | null;
}

interface PipelineData {
  pending: number;
  approved: number;
  paid: number;
}

interface MonthlyPoint {
  month: string;
  direct: number;
  tier2: number;
}

interface CommissionRow {
  id: string;
  amount: number;
  rate: number;
  status: string;
  tier_type: string;
  created_at: string;
  email: string;
}

interface PayoutRow {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  completed_at: string | null;
  created_at: string;
}

interface PayoutMethod {
  id: string;
  type: string;
  isPrimary: boolean;
}

interface EarningsClientProps {
  hero: HeroData;
  pipeline: PipelineData;
  monthlyEarnings: MonthlyPoint[];
  hasTier2: boolean;
  commissions: CommissionRow[];
  payouts: PayoutRow[];
  payoutMethods: PayoutMethod[];
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtCurrencyShort(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EarningsClient({
  hero,
  pipeline,
  monthlyEarnings,
  hasTier2,
  commissions,
  payouts,
  payoutMethods,
}: EarningsClientProps) {
  const [tableView, setTableView] = useState<"commissions" | "payouts">("commissions");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search && !c.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [commissions, statusFilter, search]);

  const pipelineTotal = pipeline.pending + pipeline.approved + pipeline.paid;
  const pipelineSegments = pipelineTotal > 0
    ? [
        { label: "Pending", amount: pipeline.pending, pct: (pipeline.pending / pipelineTotal) * 100, textColor: "text-amber-400" },
        { label: "Approved", amount: pipeline.approved, pct: (pipeline.approved / pipelineTotal) * 100, textColor: "text-zinc-300" },
        { label: "Paid", amount: pipeline.paid, pct: (pipeline.paid / pipelineTotal) * 100, textColor: "text-emerald-400" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Earnings</h1>
        <p className="text-[14px] text-zinc-400 mt-1">
          Your commissions, payouts, and payment history.
        </p>
      </div>

      {/* ── Hero Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Lifetime Earned</span>
          </div>
          <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-none text-white">
            {fmtCurrency(hero.lifetimeEarned)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Pending Payout</span>
          </div>
          <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-none text-amber-400">
            {fmtCurrency(hero.pending)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Last Payout</span>
          </div>
          {hero.lastPayout ? (
            <>
              <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-none text-white">
                {fmtCurrency(hero.lastPayout.amount)}
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">
                {new Date(hero.lastPayout.date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-[20px] font-medium text-zinc-600 mt-1">No payouts yet</p>
          )}
        </div>
      </div>

      {/* ── Commission Pipeline ── */}
      {pipelineSegments.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <h3 className="text-[13px] font-medium text-zinc-300 mb-4">Commission Pipeline</h3>
          <div className="flex rounded-lg overflow-hidden h-8 mb-3 border border-zinc-800 bg-black">
            {pipelineSegments.map((seg) =>
              seg.pct > 0 ? (
                <div
                  key={seg.label}
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: `${Math.max(seg.pct, 5)}%`,
                    background: "rgba(255,255,255,0.06)",
                    borderRight: "1px solid #27272a",
                  }}
                >
                  {seg.pct > 15 && (
                    <span className={`text-[10px] font-medium ${seg.textColor}`}>
                      {fmtCurrencyShort(seg.amount)}
                    </span>
                  )}
                </div>
              ) : null,
            )}
          </div>
          <div className="flex items-center gap-5">
            {pipelineSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-600" />
                <span className="text-[11px] text-zinc-500">{seg.label}</span>
                <span className={`text-[11px] font-medium ${seg.textColor}`}>{fmtCurrencyShort(seg.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly Earnings Chart ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-medium text-zinc-300">Monthly Earnings</h3>
          <span className="text-[11px] text-zinc-600">Last 6 months</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyEarnings} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
              formatter={(value: number, name: string) => [
                fmtCurrency(value),
                name === "direct" ? "Direct" : "From Team",
              ]}
            />
            {hasTier2 && (
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                formatter={(value: string) => (value === "direct" ? "Direct" : "From Team")}
              />
            )}
            <defs>
              <linearGradient id="earningsBarDirect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="earningsBarTier2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#52525b" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#52525b" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <Bar dataKey="direct" stackId="a" fill="url(#earningsBarDirect)" radius={hasTier2 ? [0, 0, 0, 0] : [4, 4, 0, 0]} maxBarSize={40} />
            {hasTier2 && (
              <Bar dataKey="tier2" stackId="a" fill="url(#earningsBarTier2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Payout Methods ── */}
      {payoutMethods.length > 0 ? (
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-zinc-500">Payout method:</span>
          {payoutMethods.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <span className="capitalize font-medium text-zinc-300">{m.type.replace(/_/g, " ")}</span>
              {m.isPrimary && (
                <CheckCircle2 size={13} className="text-emerald-400" />
              )}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
          <span className="text-[13px] text-zinc-500">No payout method configured.</span>
          <a href="/settings" className="text-[13px] font-medium text-zinc-300 hover:text-white transition-colors underline underline-offset-4">
            Add one in Settings →
          </a>
        </div>
      )}

      {/* ── Detail Tables ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-0.5 rounded-lg border border-zinc-800 bg-black">
            <button
              onClick={() => setTableView("commissions")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                tableView === "commissions" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Commissions ({commissions.length})
            </button>
            <button
              onClick={() => setTableView("payouts")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                tableView === "payouts" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Payouts ({payouts.length})
            </button>
          </div>

          {tableView === "commissions" && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-zinc-800 bg-black px-2.5 text-[12px] text-zinc-300 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="voided">Voided</option>
              </select>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="pl-9 h-8 text-[12px] bg-black border-zinc-800"
                />
              </div>
            </>
          )}
        </div>

        <Card className="border-zinc-800 bg-zinc-950">
          <div className="overflow-x-auto">
            {tableView === "commissions" ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Customer", "Amount", "Rate", "Type", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.slice(0, 50).map((c) => (
                    <tr key={c.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-3 text-[13px] text-zinc-100">{c.email}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-white tabular-nums">{fmtCurrency(c.amount)}</td>
                      <td className="px-5 py-3 text-[12px] text-zinc-500">{c.rate}%</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          c.tier_type === "direct"
                            ? "border-zinc-700 text-zinc-300"
                            : "border-zinc-700 text-zinc-400"
                        }`}>
                          {c.tier_type === "direct" ? "Direct" : c.tier_type}
                        </span>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-3 text-[12px] text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {filteredCommissions.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-zinc-600">No commissions found</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Amount", "Status", "Method", "Completed", "Created"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-3 text-[13px] font-medium text-white tabular-nums">{fmtCurrency(p.amount)}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3 text-[12px] text-zinc-500 capitalize">{p.method?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-5 py-3 text-[12px] text-zinc-500">{p.completed_at ? new Date(p.completed_at).toLocaleDateString() : "—"}</td>
                      <td className="px-5 py-3 text-[12px] text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-zinc-600">No payouts yet</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
