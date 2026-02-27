"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Copy,
  Check,
  ExternalLink,
  Pencil,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MousePointerClick,
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Shield,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { FeatureCard } from "@/components/shared/feature-card";
import type { Tables } from "@/lib/supabase/types";

interface DashboardStats {
  clicks: number;
  leads: number;
  customers: number;
  earned: number;
  pending: number;
  thisMonthEarned: number;
  lastMonthEarned: number;
}

interface ChartData {
  clicksByDay: number[];
  earningsByMonth: { month: string; amount: number }[];
  customerStates: { active: number; trialing: number; churned: number };
}

interface ActivityItem {
  id: string;
  amount: number;
  status: string;
  tier_type: string;
  created_at: string;
  email: string | null;
}

interface AdminData {
  totalAffiliates: number;
  recentAffiliates: {
    id: string;
    name: string;
    slug: string;
    tier_level: number;
    commission_rate: number;
    created_at: string;
  }[];
}

interface DashboardClientProps {
  affiliate: Tables<"affiliates">;
  stats: DashboardStats;
  chartData: ChartData;
  recentActivity?: ActivityItem[];
  subAffiliateCount?: number;
  adminData?: AdminData;
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Hero Earnings Card ──
function HeroEarnings({ stats }: { stats: DashboardStats }) {
  const pctChange =
    stats.lastMonthEarned > 0
      ? Math.round(
          ((stats.thisMonthEarned - stats.lastMonthEarned) / stats.lastMonthEarned) * 100,
        )
      : stats.thisMonthEarned > 0
        ? 100
        : 0;

  const isUp = pctChange >= 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
      style={{
        background:
          "radial-gradient(ellipse 90% 80% at 10% 100%, rgba(225,38,27,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 90% 0%, rgba(19,242,135,0.06) 0%, transparent 50%), linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
        This Month&apos;s Earnings
      </p>
      <div className="flex items-end gap-3 mt-2">
        <span className="text-[2.5rem] sm:text-[3rem] font-semibold tracking-tight leading-none text-white">
          {fmtCurrency(stats.thisMonthEarned)}
        </span>
        {pctChange !== 0 && (
          <span
            className={`flex items-center gap-1 text-[13px] font-medium pb-1 ${isUp ? "text-emerald-400" : "text-red-400"}`}
          >
            {isUp ? (
              <TrendingUp size={14} strokeWidth={2} />
            ) : (
              <TrendingDown size={14} strokeWidth={2} />
            )}
            {Math.abs(pctChange)}% vs last month
          </span>
        )}
      </div>
      <div className="flex items-center gap-6 mt-4 text-[13px] text-white/40">
        <span>
          Lifetime earned:{" "}
          <span className="text-white/70 font-medium">{fmtCurrencyShort(stats.earned)}</span>
        </span>
        <span>
          Pending:{" "}
          <span className="text-amber-400/90 font-medium">{fmtCurrencyShort(stats.pending)}</span>
        </span>
      </div>
    </div>
  );
}

// ── Referral Link Bar ──
function ReferralLinkBar({ affiliate }: { affiliate: Tables<"affiliates"> }) {
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slug, setSlug] = useState(affiliate.slug);
  const [saving, setSaving] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${appUrl}/api/track/click?am_id=${slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveSlug() {
    if (!slug || slug === affiliate.slug) {
      setEditingSlug(false);
      return;
    }
    setSaving(true);
    const checkRes = await fetch("/api/affiliates/check-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, exclude_id: affiliate.id }),
    });
    if (checkRes.ok) {
      const { available } = await checkRes.json();
      if (!available) {
        setSaving(false);
        toast.error("That gamer tag is already taken");
        return;
      }
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("affiliates")
      .update({ slug })
      .eq("id", affiliate.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update gamer tag", { description: error.message });
      setSlug(affiliate.slug);
    } else {
      toast.success("Gamer tag updated!");
    }
    setEditingSlug(false);
  }

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl px-4 py-3 sm:px-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[12px] text-white/40">
          <span className="font-medium text-white/60">Your link</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-medium text-white/50">
            {affiliate.commission_rate}% · {affiliate.commission_duration_months}mo
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 relative">
          <Input
            value={referralLink}
            readOnly
            className="pr-9 font-mono text-[11px] sm:text-[12px] bg-transparent border-white/[0.08] text-white/70 h-9"
          />
          <a
            href={referralLink}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            <ExternalLink size={13} strokeWidth={ICON_STROKE_WIDTH} />
          </a>
        </div>
        <Button
          onClick={copyLink}
          size="sm"
          className="shrink-0 bg-white/10 hover:bg-white/15 text-white border-0"
        >
          {copied ? (
            <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <Copy size={14} strokeWidth={ICON_STROKE_WIDTH} />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:border-l sm:border-white/[0.08] sm:pl-4">
        <span className="text-[11px] text-white/40">Tag:</span>
        {editingSlug ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              className="h-7 w-28 font-mono text-[11px] bg-transparent border-white/[0.08] text-white/70"
              autoFocus
            />
            <Button
              size="xs"
              onClick={saveSlug}
              disabled={saving}
              className="bg-white/10 hover:bg-white/15 text-white border-0 text-[11px]"
            >
              {saving ? "..." : "Save"}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setSlug(affiliate.slug);
                setEditingSlug(false);
              }}
              className="text-white/40 hover:text-white/60 text-[11px]"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditingSlug(true)}
            className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white/70 transition-colors"
          >
            {affiliate.slug}
            <Pencil size={10} strokeWidth={ICON_STROKE_WIDTH} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Funnel Strip ──
function FunnelStrip({ stats }: { stats: DashboardStats }) {
  const clickToLead =
    stats.clicks > 0 ? ((stats.leads / stats.clicks) * 100).toFixed(1) : "0";
  const leadToCustomer =
    stats.leads > 0 ? ((stats.customers / stats.leads) * 100).toFixed(1) : "0";

  const steps = [
    { label: "Clicks", value: stats.clicks, sublabel: "Last 30 days", icon: MousePointerClick },
    { label: "Leads", value: stats.leads, sublabel: "All time", icon: Users },
    { label: "Customers", value: stats.customers, sublabel: "Converted", icon: UserCheck },
  ];

  const rates = [clickToLead, leadToCustomer];

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-stretch flex-1 min-w-0">
          <Card className="flex-1 border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <step.icon size={18} strokeWidth={ICON_STROKE_WIDTH} className="text-white/60" />
              </div>
              <div className="min-w-0">
                <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight leading-none text-white">
                  {step.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">{step.label}</p>
              </div>
            </CardContent>
          </Card>

          {i < steps.length - 1 && (
            <div className="hidden sm:flex flex-col items-center justify-center px-2 shrink-0">
              <ArrowRight size={14} className="text-white/20" />
              <span className="text-[10px] font-semibold text-emerald-400/80 mt-0.5">
                {rates[i]}%
              </span>
            </div>
          )}

          {i < steps.length - 1 && (
            <div className="flex sm:hidden items-center justify-center py-1">
              <span className="text-[10px] font-semibold text-emerald-400/80">
                ↓ {rates[i]}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Earnings Trend Chart ──
function EarningsTrend({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <Card className="border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-medium text-white/60">Earnings Trend</h3>
          <span className="text-[11px] text-white/30">Last 6 months</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
              formatter={(value: number) => [fmtCurrency(value), "Earned"]}
            />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <Bar dataKey="amount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Activity Feed ──
function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
        <CardContent className="p-5">
          <h3 className="text-[13px] font-medium text-white/60 mb-4">Recent Activity</h3>
          <p className="text-[13px] text-white/30 text-center py-6">
            No activity yet. Share your link to start earning!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/[0.06]" style={{ background: "linear-gradient(135deg, #111, #1a1a1a)" }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-medium text-white/60">Recent Activity</h3>
          <a
            href="/earnings"
            className="text-[11px] font-medium text-white/30 hover:text-white/50 transition-colors"
          >
            View all →
          </a>
        </div>
        <div className="space-y-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      item.status === "paid"
                        ? "rgba(34,197,94,0.12)"
                        : item.status === "voided"
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(234,179,8,0.12)",
                  }}
                >
                  <DollarSign
                    size={13}
                    strokeWidth={2}
                    className={
                      item.status === "paid"
                        ? "text-emerald-400"
                        : item.status === "voided"
                          ? "text-red-400"
                          : "text-amber-400"
                    }
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-white/80 truncate">
                    {fmtCurrency(item.amount)} commission
                    {item.tier_type !== "direct" && (
                      <span className="text-white/30 ml-1">· {item.tier_type}</span>
                    )}
                  </p>
                  {item.email && (
                    <p className="text-[11px] text-white/30 truncate">{item.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    item.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : item.status === "voided"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-[11px] text-white/25">{timeAgo(item.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ──
export function DashboardClient({
  affiliate,
  stats,
  chartData,
  recentActivity,
  subAffiliateCount,
  adminData,
}: DashboardClientProps) {
  const isAdmin = affiliate.role === "admin";
  const isTier1 = affiliate.tier_level === 1 && !isAdmin;

  if (isAdmin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-display-sm">System Overview</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Birds-eye view of the affiliate program
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Affiliates"
            value={adminData?.totalAffiliates.toLocaleString() ?? "0"}
            icon={Shield}
            subtitle="Total active"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Clicks"
            value={stats.clicks.toLocaleString()}
            icon={MousePointerClick}
            subtitle="Last 30 days"
            sparklineData={chartData.clicksByDay}
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Customers"
            value={stats.customers.toLocaleString()}
            icon={UserCheck}
            subtitle={`${chartData.customerStates.active} active · ${chartData.customerStates.trialing} trialing · ${chartData.customerStates.churned} churned`}
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Leads"
            value={stats.leads.toLocaleString()}
            icon={Users}
            subtitle="All affiliates"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Total Commissions"
            value={fmtCurrencyShort(stats.earned)}
            icon={DollarSign}
            subtitle="All time"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Pending"
            value={fmtCurrencyShort(stats.pending)}
            icon={Clock}
            subtitle="Awaiting payout"
          />
        </div>

        {adminData && adminData.recentAffiliates.length > 0 && (
          <Card>
            <CardContent className="pt-6 pb-4 px-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-heading-3">Recent Affiliates</h3>
                <a
                  href="/admin"
                  className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all →
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Name", "Slug", "Tier", "Rate", "Joined"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.recentAffiliates.map((a) => (
                      <tr key={a.id} className="border-b border-border">
                        <td className="px-3 py-2.5 text-[13px] font-medium">{a.name}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">
                          {a.slug}
                        </td>
                        <td className="px-3 py-2.5 text-[13px]">Tier {a.tier_level}</td>
                        <td className="px-3 py-2.5 text-[13px]">{a.commission_rate}%</td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Affiliate Dashboard ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Dashboard</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Welcome back, {affiliate.name}
          </p>
        </div>
        {isTier1 && subAffiliateCount !== undefined && (
          <a
            href="/team"
            className="flex items-center gap-2 text-[12px] font-medium text-white/40 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <Users size={14} strokeWidth={ICON_STROKE_WIDTH} />
            {subAffiliateCount} sub-affiliate{subAffiliateCount !== 1 ? "s" : ""}
            <ArrowRight size={12} />
          </a>
        )}
      </div>

      {/* Hero: This month's earnings with trend */}
      <HeroEarnings stats={stats} />

      {/* Referral Link Bar */}
      <ReferralLinkBar affiliate={affiliate} />

      {/* Funnel: Clicks → Leads → Customers */}
      <FunnelStrip stats={stats} />

      {/* Bottom row: Earnings Trend + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EarningsTrend data={chartData.earningsByMonth} />
        <ActivityFeed items={recentActivity ?? []} />
      </div>
    </div>
  );
}
