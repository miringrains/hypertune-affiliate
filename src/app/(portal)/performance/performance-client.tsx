"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  MousePointerClick,
  Users,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConversionRing } from "@/components/shared/conversion-ring";

interface FunnelData {
  clicks: number;
  leads: number;
  customers: number;
}

interface CustomerStates {
  active: number;
  trialing: number;
  churned: number;
  mrr: number;
}

interface WeeklyPoint {
  week: string;
  clicks: number;
  leads: number;
  customers: number;
}

interface SourceRow {
  name: string;
  leads: number;
  customers: number;
}

interface LeadRow {
  id: string;
  email: string;
  converted: boolean;
  source?: string;
  created_at: string;
}

interface CustomerRow {
  id: string;
  email: string;
  state: string;
  plan: string | null;
  source?: string;
  created_at: string;
}

interface PerformanceClientProps {
  funnel: FunnelData;
  customerStates: CustomerStates;
  weeklyTrend: WeeklyPoint[];
  isTier1: boolean;
  sourceBreakdown: SourceRow[];
  leads: LeadRow[];
  customers: CustomerRow[];
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PerformanceClient({
  funnel,
  customerStates,
  weeklyTrend,
  isTier1,
  sourceBreakdown,
  leads,
  customers,
}: PerformanceClientProps) {
  const [tableView, setTableView] = useState<"leads" | "customers">("leads");
  const [showTable, setShowTable] = useState(false);
  const [search, setSearch] = useState("");

  const clickToLead = funnel.clicks > 0 ? ((funnel.leads / funnel.clicks) * 100).toFixed(1) : "0";
  const leadToCustomer =
    funnel.leads > 0 ? ((funnel.customers / funnel.leads) * 100).toFixed(1) : "0";
  const overallConversion =
    funnel.clicks > 0 ? ((funnel.customers / funnel.clicks) * 100).toFixed(1) : "0";

  const filteredLeads = useMemo(
    () => leads.filter((l) => l.email.toLowerCase().includes(search.toLowerCase())),
    [leads, search],
  );

  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.email.toLowerCase().includes(search.toLowerCase())),
    [customers, search],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Performance</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Your full conversion funnel — from clicks to paying customers.
        </p>
      </div>

      {/* ── Funnel Visualization ── */}
      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(225,38,27,0.08) 0%, transparent 50%), linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Activity size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-white/40" />
          <h2 className="text-[13px] font-medium text-white/50">Conversion Funnel</h2>
          <span className="ml-auto text-[11px] text-white/30">Last 30 days (clicks) · All time (leads/customers)</span>
        </div>

        {/* Funnel stages */}
        <div className="flex flex-col sm:flex-row items-stretch gap-0">
          {[
            {
              icon: MousePointerClick,
              label: "Clicks",
              value: funnel.clicks,
              color: "rgba(225,38,27,0.15)",
              iconColor: "text-red-400",
            },
            {
              icon: Users,
              label: "Leads",
              value: funnel.leads,
              color: "rgba(59,130,246,0.12)",
              iconColor: "text-blue-400",
            },
            {
              icon: UserCheck,
              label: "Customers",
              value: funnel.customers,
              color: "rgba(34,197,94,0.12)",
              iconColor: "text-emerald-400",
            },
          ].map((stage, i) => (
            <div key={stage.label} className="flex items-stretch flex-1 min-w-0">
              <div className="flex-1 text-center p-4 sm:p-5 rounded-xl" style={{ background: stage.color }}>
                <stage.icon size={22} strokeWidth={ICON_STROKE_WIDTH} className={`mx-auto mb-2 ${stage.iconColor}`} />
                <p className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-none text-white">
                  {stage.value.toLocaleString()}
                </p>
                <p className="text-[12px] text-white/40 mt-1.5">{stage.label}</p>
              </div>

              {i < 2 && (
                <>
                  <div className="hidden sm:flex flex-col items-center justify-center px-3 shrink-0">
                    <ArrowRight size={16} className="text-white/15" />
                    <span className="text-[12px] font-bold text-emerald-400 mt-1">
                      {i === 0 ? clickToLead : leadToCustomer}%
                    </span>
                  </div>
                  <div className="flex sm:hidden items-center justify-center py-1.5">
                    <span className="text-[11px] font-bold text-emerald-400">
                      ↓ {i === 0 ? clickToLead : leadToCustomer}%
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Overall conversion + customer states */}
        <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <ConversionRing
              value={Number(overallConversion)}
              size={48}
              strokeWidth={4}
              color="#22c55e"
            />
            <div>
              <p className="text-[18px] font-semibold text-white">{overallConversion}%</p>
              <p className="text-[11px] text-white/35">Overall conversion</p>
            </div>
          </div>
          <div className="flex gap-5 text-[13px]">
            <div>
              <span className="text-emerald-400 font-semibold">{customerStates.active}</span>
              <span className="text-white/35 ml-1">active</span>
            </div>
            <div>
              <span className="text-amber-400 font-semibold">{customerStates.trialing}</span>
              <span className="text-white/35 ml-1">trialing</span>
            </div>
            <div>
              <span className="text-red-400 font-semibold">{customerStates.churned}</span>
              <span className="text-white/35 ml-1">churned</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[18px] font-semibold text-white">{fmtCurrency(customerStates.mrr)}</p>
            <p className="text-[11px] text-white/35">Est. MRR</p>
          </div>
        </div>
      </div>

      {/* ── Weekly Trend Chart ── */}
      <Card className="border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-white/60">Weekly Trend</h3>
            <span className="text-[11px] text-white/30">Last 12 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                interval={2}
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
              />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#e1251b"
                strokeWidth={2}
                dot={false}
                name="Clicks"
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Leads"
              />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Customers"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Source Breakdown (Tier 1) ── */}
      {isTier1 && sourceBreakdown.length > 0 && (
        <Card className="border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
          <CardContent className="p-5">
            <h3 className="text-[13px] font-medium text-white/60 mb-4">Source Breakdown</h3>
            <div className="space-y-3">
              {sourceBreakdown.map((src) => {
                const total = Math.max(funnel.leads, 1);
                const pct = ((src.leads / total) * 100).toFixed(0);
                return (
                  <div key={src.name} className="flex items-center gap-3">
                    <span className="text-[13px] text-white/70 w-24 truncate shrink-0">{src.name}</span>
                    <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div
                        className="h-full rounded-md flex items-center px-2"
                        style={{
                          width: `${Math.max(Number(pct), 2)}%`,
                          background: src.name === "You" ? "rgba(225,38,27,0.25)" : "rgba(59,130,246,0.2)",
                        }}
                      >
                        <span className="text-[10px] font-medium text-white/60 whitespace-nowrap">
                          {src.leads} leads · {src.customers} customers
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-white/40 shrink-0 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Drill-Down Tables ── */}
      <div>
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-2 text-[13px] font-medium text-white/40 hover:text-white/60 transition-colors"
        >
          {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showTable ? "Hide" : "Show"} detail tables
        </button>

        {showTable && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                <button
                  onClick={() => setTableView("leads")}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    tableView === "leads" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Leads ({leads.length})
                </button>
                <button
                  onClick={() => setTableView("customers")}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    tableView === "customers" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Customers ({customers.length})
                </button>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search email..."
                  className="pl-9 h-8 text-[12px]"
                />
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
                {tableView === "leads" ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Email
                        </th>
                        {isTier1 && (
                          <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                            Source
                          </th>
                        )}
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Status
                        </th>
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.slice(0, 50).map((l) => (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="px-5 py-3 text-[13px]">{l.email}</td>
                          {isTier1 && (
                            <td className="px-5 py-3 text-[12px] text-muted-foreground">{l.source}</td>
                          )}
                          <td className="px-5 py-3">
                            <StatusBadge status={l.converted ? "active" : "pending"} />
                          </td>
                          <td className="px-5 py-3 text-[12px] text-muted-foreground">
                            {new Date(l.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={isTier1 ? 4 : 3} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                            No leads found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Email
                        </th>
                        {isTier1 && (
                          <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                            Source
                          </th>
                        )}
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Status
                        </th>
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Plan
                        </th>
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                          Since
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.slice(0, 50).map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0">
                          <td className="px-5 py-3 text-[13px]">{c.email}</td>
                          {isTier1 && (
                            <td className="px-5 py-3 text-[12px] text-muted-foreground">{c.source}</td>
                          )}
                          <td className="px-5 py-3">
                            <StatusBadge status={c.state} />
                          </td>
                          <td className="px-5 py-3 text-[12px] text-muted-foreground capitalize">
                            {c.plan ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-[12px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={isTier1 ? 5 : 4} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                            No customers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
