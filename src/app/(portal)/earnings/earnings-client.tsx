"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp,
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
        { label: "Pending", amount: pipeline.pending, pct: (pipeline.pending / pipelineTotal) * 100, color: "#eab308", bg: "rgba(234,179,8,0.15)" },
        { label: "Approved", amount: pipeline.approved, pct: (pipeline.approved / pipelineTotal) * 100, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
        { label: "Paid", amount: pipeline.paid, pct: (pipeline.paid / pipelineTotal) * 100, color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Earnings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Your commissions, payouts, and payment history.
        </p>
      </div>

      {/* ── Hero Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-5 sm:p-6"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 0% 100%, rgba(34,197,94,0.1) 0%, transparent 50%), linear-gradient(135deg, #111, #1a1a1a)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-400/60" />
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
              Lifetime Earned
            </span>
          </div>
          <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-none text-white">
            {fmtCurrency(hero.lifetimeEarned)}
          </p>
        </div>

        <div
          className="rounded-xl p-5 sm:p-6"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 50% 100%, rgba(234,179,8,0.08) 0%, transparent 50%), linear-gradient(135deg, #111, #1a1a1a)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400/60" />
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
              Pending Payout
            </span>
          </div>
          <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-none text-amber-400">
            {fmtCurrency(hero.pending)}
          </p>
        </div>

        <div
          className="rounded-xl p-5 sm:p-6"
          style={{
            background: "linear-gradient(135deg, #111, #1a1a1a)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-white/40" />
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
              Last Payout
            </span>
          </div>
          {hero.lastPayout ? (
            <>
              <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-none text-white">
                {fmtCurrency(hero.lastPayout.amount)}
              </p>
              <p className="text-[11px] text-white/30 mt-1">
                {new Date(hero.lastPayout.date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-[20px] font-medium text-white/30 mt-1">No payouts yet</p>
          )}
        </div>
      </div>

      {/* ── Commission Pipeline ── */}
      {pipelineSegments.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "linear-gradient(135deg, #111, #1a1a1a)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-[13px] font-medium text-white/50 mb-4">Commission Pipeline</h3>
          <div className="flex rounded-lg overflow-hidden h-8 mb-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            {pipelineSegments.map((seg) =>
              seg.pct > 0 ? (
                <div
                  key={seg.label}
                  className="flex items-center justify-center transition-all"
                  style={{ width: `${Math.max(seg.pct, 5)}%`, background: seg.bg }}
                >
                  {seg.pct > 15 && (
                    <span className="text-[10px] font-medium" style={{ color: seg.color }}>
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
                <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                <span className="text-[11px] text-white/40">{seg.label}</span>
                <span className="text-[11px] font-medium text-white/60">{fmtCurrencyShort(seg.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly Earnings Chart ── */}
      <Card className="border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-white/60">Monthly Earnings</h3>
            <span className="text-[11px] text-white/30">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyEarnings} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
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
                  wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
                  formatter={(value: string) => (value === "direct" ? "Direct" : "From Team")}
                />
              )}
              <Bar dataKey="direct" stackId="a" fill="#22c55e" radius={hasTier2 ? [0, 0, 0, 0] : [4, 4, 0, 0]} maxBarSize={40} />
              {hasTier2 && (
                <Bar dataKey="tier2" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Payout Methods ── */}
      {payoutMethods.length > 0 && (
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-muted-foreground">Payout method:</span>
          {payoutMethods.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <span className="capitalize font-medium">{m.type.replace(/_/g, " ")}</span>
              {m.isPrimary && (
                <CheckCircle2 size={13} className="text-emerald-500" />
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Detail Tables ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <button
              onClick={() => setTableView("commissions")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                tableView === "commissions" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Commissions ({commissions.length})
            </button>
            <button
              onClick={() => setTableView("payouts")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                tableView === "payouts" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
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
                className="h-8 rounded-md border border-input bg-transparent px-2.5 text-[12px] outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="voided">Voided</option>
              </select>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="pl-9 h-8 text-[12px]"
                />
              </div>
            </>
          )}
        </div>

        <Card>
          <div className="overflow-x-auto">
            {tableView === "commissions" ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Customer", "Amount", "Rate", "Type", "Status", "Date"].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.slice(0, 50).map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-[13px]">{c.email}</td>
                      <td className="px-5 py-3 text-[13px] font-medium tabular-nums">
                        {fmtCurrency(c.amount)}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">{c.rate}%</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            c.tier_type === "direct"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {c.tier_type === "direct" ? "Direct" : c.tier_type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredCommissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                        No commissions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Amount", "Status", "Method", "Completed", "Created"].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-[13px] font-medium tabular-nums">
                        {fmtCurrency(p.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground capitalize">
                        {p.method?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {p.completed_at ? new Date(p.completed_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                        No payouts yet
                      </td>
                    </tr>
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
