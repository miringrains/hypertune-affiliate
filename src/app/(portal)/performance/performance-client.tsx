"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
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
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConversionRing } from "@/components/shared/conversion-ring";

interface FunnelData {
  clicks: number;
  leads: number;
  trials: number;
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
  slug: string;
  leads: number;
  customers: number;
  earned: number;
  isDirect: boolean;
}

interface LeadRow {
  id: string;
  email: string;
  converted: boolean;
  customerState: string | null;
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

interface NetworkStats {
  leads: number;
  customers: number;
  active: number;
  trialing: number;
  churned: number;
  mrr: number;
  subCount: number;
}

interface PerformanceClientProps {
  funnel: FunnelData;
  customerStates: CustomerStates;
  networkStats?: NetworkStats;
  weeklyTrend: WeeklyPoint[];
  hasSubAffiliates: boolean;
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

function SourceBreakdownSection({ sourceBreakdown }: { sourceBreakdown: SourceRow[] }) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const totalLeads = Math.max(sourceBreakdown.reduce((s, r) => s + r.leads, 0), 1);
  const maxLeads = Math.max(...sourceBreakdown.map((r) => r.leads), 1);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
      <h3 className="text-[13px] font-medium text-zinc-300 mb-4">Source Breakdown</h3>
      <div className="space-y-1">
        {sourceBreakdown.map((src) => {
          const convRate = src.leads > 0 ? ((src.customers / src.leads) * 100).toFixed(1) : "0.0";
          const barWidth = ((src.leads / maxLeads) * 100).toFixed(0);
          const isExpanded = expandedSlug === src.slug;

          return (
            <div key={src.slug || src.name}>
              <button
                onClick={() => !src.isDirect && setExpandedSlug(isExpanded ? null : src.slug)}
                className={`flex items-center gap-3 w-full text-left rounded-lg px-2 py-1.5 transition-colors ${
                  src.isDirect
                    ? "cursor-default"
                    : "hover:bg-zinc-800/50 cursor-pointer"
                }`}
              >
                <span className={`text-[13px] w-28 truncate shrink-0 ${src.isDirect ? "text-zinc-400 italic" : "text-zinc-300"}`}>
                  {src.name}
                </span>
                <div className="flex-1 h-6 rounded-md overflow-hidden bg-black border border-zinc-700/50">
                  <div
                    className="h-full rounded-md flex items-center px-2"
                    style={{
                      width: `${Math.max(Number(barWidth), 4)}%`,
                      background: src.isDirect ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap">
                      {src.leads} leads · {src.customers} customers
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 shrink-0 w-14 text-right">{convRate}%</span>
              </button>

              {isExpanded && !src.isDirect && (
                <div className="ml-32 mr-14 mb-2 mt-1 grid grid-cols-3 gap-3 rounded-lg border border-zinc-700/50 bg-black p-3">
                  <div>
                    <p className="text-[18px] font-semibold text-white">{convRate}%</p>
                    <p className="text-[10px] text-zinc-500">Conversion rate</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-semibold text-white">{fmtCurrency(src.earned)}</p>
                    <p className="text-[10px] text-zinc-500">Revenue earned</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-semibold text-white">
                      {src.customers > 0 ? fmtCurrency(src.earned / src.customers) : "—"}
                    </p>
                    <p className="text-[10px] text-zinc-500">Avg per customer</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformanceClient({
  funnel,
  customerStates,
  networkStats,
  weeklyTrend,
  hasSubAffiliates,
  sourceBreakdown,
  leads,
  customers,
}: PerformanceClientProps) {
  const [tableView, setTableView] = useState<"leads" | "customers">("leads");
  const [showTable, setShowTable] = useState(false);
  const [search, setSearch] = useState("");

  const pct = (num: number, den: number) =>
    den > 0 ? Math.min((num / den) * 100, 100).toFixed(1) : "—";
  const clickToLead = pct(funnel.leads, funnel.clicks);
  const leadToCustomer = pct(funnel.customers, funnel.leads);
  const overallConversion = pct(funnel.customers, funnel.clicks);

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
          {hasSubAffiliates
            ? "Your direct stats and network performance — separated for clarity."
            : "Your full conversion funnel — from clicks to paying customers."}
        </p>
      </div>

      {/* ── Funnel Visualization ── */}
      <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-400" />
          <h2 className="text-[13px] font-medium text-zinc-400">
            {hasSubAffiliates ? "Your Direct Performance" : "Conversion Funnel"}
          </h2>
          <span className="ml-auto text-[11px] text-zinc-400">All time</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-0">
          {[
            { icon: MousePointerClick, label: "Clicks", value: funnel.clicks, pct: clickToLead },
            { icon: Users, label: "Leads", value: funnel.leads, pct: leadToCustomer },
            { icon: UserCheck, label: "Customers", value: funnel.customers, pct: null },
          ].map((stage, i, arr) => (
            <div key={stage.label} className="flex items-stretch flex-1 min-w-0">
              <div className="flex-1 text-center p-4 sm:p-5 rounded-xl border border-zinc-700 bg-black">
                <stage.icon size={22} strokeWidth={ICON_STROKE_WIDTH} className="mx-auto mb-2 text-zinc-400" />
                <p className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-none text-white">
                  {stage.value.toLocaleString()}
                </p>
                <p className="text-[12px] text-zinc-400 mt-1.5">{stage.label}</p>
              </div>

              {i < arr.length - 1 && (
                <>
                  <div className="hidden sm:flex flex-col items-center justify-center px-3 shrink-0">
                    <ArrowRight size={16} className="text-zinc-400" />
                    <span className={`text-[12px] font-bold mt-1 ${stage.pct === "—" ? "text-zinc-500" : "text-emerald-400"}`}>
                      {stage.pct === "—" ? "—" : `${stage.pct}%`}
                    </span>
                  </div>
                  <div className="flex sm:hidden items-center justify-center py-1.5">
                    <span className={`text-[11px] font-bold ${stage.pct === "—" ? "text-zinc-500" : "text-emerald-400"}`}>
                      {stage.pct === "—" ? "↓ —" : `↓ ${stage.pct}%`}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="flex items-stretch flex-1 min-w-0">
            <div className="hidden sm:flex flex-col items-center justify-center px-3 shrink-0">
              <span className="text-[10px] text-zinc-500">·</span>
            </div>
            <div className="flex-1 text-center p-4 sm:p-5 rounded-xl border border-dashed border-zinc-700 bg-black/50">
              <Clock size={22} strokeWidth={ICON_STROKE_WIDTH} className="mx-auto mb-2 text-zinc-500" />
              <p className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-none text-zinc-300">
                {funnel.trials.toLocaleString()}
              </p>
              <p className="text-[12px] text-zinc-500 mt-1.5">Trialing</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-zinc-700">
          <div className="flex items-center gap-3">
            <ConversionRing
              value={overallConversion === "—" ? 0 : Number(overallConversion)}
              size={48}
              strokeWidth={4}
              color="#ffffff"
            />
            <div>
              <p className="text-[18px] font-semibold text-white">{overallConversion === "—" ? "—" : `${overallConversion}%`}</p>
              <p className="text-[11px] text-zinc-400">Overall conversion</p>
            </div>
          </div>
          <div className="flex gap-5 text-[13px]">
            <div>
              <span className="text-emerald-400 font-semibold">{customerStates.active}</span>
              <span className="text-zinc-400 ml-1">active</span>
            </div>
            <div>
              <span className="text-amber-400 font-semibold">{customerStates.trialing}</span>
              <span className="text-zinc-400 ml-1">trialing</span>
            </div>
            <div>
              <span className="text-rose-500 font-semibold">{customerStates.churned}</span>
              <span className="text-zinc-400 ml-1">churned</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[18px] font-semibold text-white">{fmtCurrency(customerStates.mrr)}</p>
            <p className="text-[11px] text-zinc-400">Est. MRR</p>
          </div>
        </div>
      </div>

      {/* ── Network Overview (Tier 1 only) ── */}
      {hasSubAffiliates && networkStats && (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Users size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-400" />
            <h2 className="text-[13px] font-medium text-zinc-400">
              Your Network
            </h2>
            <span className="ml-auto text-[11px] text-zinc-400">
              {networkStats.subCount} sub-affiliate{networkStats.subCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-700 bg-black text-center">
              <p className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-none text-white">
                {networkStats.leads.toLocaleString()}
              </p>
              <p className="text-[12px] text-zinc-400 mt-1.5">Leads</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-700 bg-black text-center">
              <p className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-none text-white">
                {networkStats.customers.toLocaleString()}
              </p>
              <p className="text-[12px] text-zinc-400 mt-1.5">Customers</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-700 bg-black text-center">
              <p className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-none text-white">
                {fmtCurrency(networkStats.mrr)}
              </p>
              <p className="text-[12px] text-zinc-400 mt-1.5">Network MRR</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-700 bg-black text-center">
              <div className="flex justify-center gap-4 text-[13px] mt-2">
                <div>
                  <span className="text-emerald-400 font-semibold">{networkStats.active}</span>
                  <span className="text-zinc-500 ml-1 text-[11px]">active</span>
                </div>
                <div>
                  <span className="text-amber-400 font-semibold">{networkStats.trialing}</span>
                  <span className="text-zinc-500 ml-1 text-[11px]">trial</span>
                </div>
                <div>
                  <span className="text-rose-500 font-semibold">{networkStats.churned}</span>
                  <span className="text-zinc-500 ml-1 text-[11px]">churned</span>
                </div>
              </div>
              <p className="text-[12px] text-zinc-400 mt-1.5">Breakdown</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly Trend Chart ── */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-medium text-zinc-300">Weekly Trend</h3>
          <span className="text-[11px] text-zinc-400">Last 12 weeks</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 10 }}
              interval={2}
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
            />
            <Legend
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
            />
            <Line type="monotone" dataKey="clicks" stroke="#ffffff" strokeWidth={2} dot={false} name="Clicks" />
            <Line type="monotone" dataKey="leads" stroke="#52525b" strokeWidth={1.5} dot={false} name="Leads" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="customers" stroke="#a1a1aa" strokeWidth={1.5} dot={false} name="Customers" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Source Breakdown (Tier 1) ── */}
      {hasSubAffiliates && sourceBreakdown.length > 0 && (
        <SourceBreakdownSection sourceBreakdown={sourceBreakdown} />
      )}

      {/* ── Drill-Down Tables ── */}
      <div>
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showTable ? "Hide" : "Show"} detail tables
        </button>

        {showTable && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 p-0.5 rounded-lg border border-zinc-700 bg-black">
                <button
                  onClick={() => setTableView("leads")}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    tableView === "leads" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  Leads ({funnel.leads.toLocaleString()})
                </button>
                <button
                  onClick={() => setTableView("customers")}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    tableView === "customers" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  Customers ({funnel.customers.toLocaleString()})
                </button>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search email..."
                  className="pl-9 h-8 text-[12px] bg-black border-zinc-700"
                />
              </div>
            </div>

            <Card className="border-zinc-700 bg-zinc-950">
              <div className="overflow-x-auto">
                {tableView === "leads" ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Email</th>
                        {hasSubAffiliates && <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Source</th>}
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Status</th>
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.slice(0, 50).map((l) => (
                        <tr key={l.id} className="border-b border-zinc-700/50 last:border-0">
                          <td className="px-5 py-3 text-[13px] text-zinc-100">{l.email}</td>
                          {hasSubAffiliates && <td className="px-5 py-3 text-[12px] text-zinc-400">{l.source}</td>}
                          <td className="px-5 py-3"><StatusBadge status={l.customerState ?? (l.converted ? "active" : "pending")} /></td>
                          <td className="px-5 py-3 text-[12px] text-zinc-400">{new Date(l.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr><td colSpan={hasSubAffiliates ? 4 : 3} className="px-5 py-8 text-center text-[13px] text-zinc-400">No leads found</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Email</th>
                        {hasSubAffiliates && <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Source</th>}
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Status</th>
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Plan</th>
                        <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-5 py-3">Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.slice(0, 50).map((c) => (
                        <tr key={c.id} className="border-b border-zinc-700/50 last:border-0">
                          <td className="px-5 py-3 text-[13px] text-zinc-100">{c.email}</td>
                          {hasSubAffiliates && <td className="px-5 py-3 text-[12px] text-zinc-400">{c.source}</td>}
                          <td className="px-5 py-3"><StatusBadge status={c.state} /></td>
                          <td className="px-5 py-3 text-[12px] text-zinc-400 capitalize">{c.plan ?? "—"}</td>
                          <td className="px-5 py-3 text-[12px] text-zinc-400">{new Date(c.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan={hasSubAffiliates ? 5 : 4} className="px-5 py-8 text-center text-[13px] text-zinc-400">No customers found</td></tr>
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
